import prisma from "../../libs/prismadb";
import moment from "moment";

// Type for aggregated data output
type AggregatedData = {
  day: string;
  date: string;
  totalAmount: number;
};

export default async function getGraphData(): Promise<AggregatedData[]> {
  try {
    // 🔐 Cố định thời gian tại 00:00 hôm nay để đảm bảo ổn định
    const now = moment().startOf("day");
    const startDate = now.clone().subtract(6, "days"); // 7 ngày gần nhất
    const endDate = now.clone().endOf("day");

    const result = await prisma.quote.groupBy({
      by: ["createdAt"],
      where: {
        createdAt: {
          gte: startDate.toISOString(),
          lte: endDate.toISOString(),
        },
        status: "DONE",
      },
      _sum: {
        grandTotal: true,
      },
    });

    const aggregatedData: Record<string, AggregatedData> = {};
    const currentDate = startDate.clone();

    while (currentDate <= endDate) {
      const key = currentDate.format("YYYY-MM-DD");
      aggregatedData[key] = {
        day: currentDate.format("dddd"),
        date: key,
        totalAmount: 0,
      };
      currentDate.add(1, "day");
    }

    result.forEach((entry) => {
      const key = moment(entry.createdAt).format("YYYY-MM-DD");
      const amount = entry._sum.grandTotal || 0;
      if (aggregatedData[key]) {
        aggregatedData[key].totalAmount += amount;
      }
    });

    const formattedData = Object.values(aggregatedData).sort((a, b) =>
      moment(a.date).diff(moment(b.date))
    );

    return formattedData;
  } catch (error: any) {
    console.error("getGraphData error:", error);
    throw new Error(error.message || "Unknown error");
  }
}
