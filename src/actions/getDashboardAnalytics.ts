// src/actions/getDashboardAnalytics.ts
import prismadb from "../../libs/prismadb";

export interface DashboardAnalyticsData {
  revenue: number;
  orders: number;
  netProfit: number;
  debtTotal: number;
  inventoryValue: number;
  lowStockCount: number;
  salesChart: { date: string; amount: number }[];
}

export default async function getDashboardAnalytics(orgId: string): Promise<DashboardAnalyticsData> {
  try {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Đầu tháng
    const endDate = now;

    const [
      allQuotes,
      receivableDebts,
      lowStockCount,
      balances,
    ] = await Promise.all([
      prismadb.quote.findMany({
        where: { orgId },
        include: { items: true },
      }),
      prismadb.debt.findMany({
        where: {
          orgId,
          type: "receivable",
          status: { not: "PAID" },
        },
      }),
      prismadb.stockBalance.count({
        where: {
          orgId,
          qty: { lt: 10 },
        },
      }),
      prismadb.stockBalance.findMany({
        where: { orgId },
        include: {
          product: { select: { priceVnd: true, costPriceVnd: true } },
        },
      }),
    ]);

    // 1. Revenue & Orders
    const quotesInRange = allQuotes.filter(q => 
      ["ACCEPTED", "CONVERTED"].includes(q.status)
    );
    const revenue = quotesInRange.reduce((acc, q) => acc + (q.grandTotal || 0), 0);
    const orders = quotesInRange.length;

    // 2. Debt
    const debtTotal = receivableDebts.reduce((acc, d) => acc + (d.amount - d.paidAmount), 0);

    // 3. Net Profit
    let netProfit = 0;
    quotesInRange.forEach((q) => {
      q.items.forEach((it) => {
        const cost = it.costPrice ?? 0;
        const profit = (it.unitPrice - cost) * it.quantity;
        netProfit += profit;
      });
    });

    // 4. Inventory Value
    const inventoryValue = (balances as any[]).reduce((acc, b) => {
      const price = b.product?.priceVnd || 0;
      return acc + (b.qty * price);
    }, 0);

    // 5. Chart
    const salesByDate: Record<string, number> = {};
    quotesInRange.forEach((q) => {
      const date = q.createdAt.toISOString().split("T")[0];
      salesByDate[date] = (salesByDate[date] || 0) + (q.grandTotal || 0);
    });
    const salesChart = Object.keys(salesByDate).sort().map((date) => ({
      date,
      amount: salesByDate[date],
    }));

    return {
      revenue,
      orders,
      netProfit,
      debtTotal,
      inventoryValue,
      lowStockCount,
      salesChart,
    };
  } catch (error: any) {
    console.error("getDashboardAnalytics error:", error);
    return {
      revenue: 0,
      orders: 0,
      netProfit: 0,
      debtTotal: 0,
      inventoryValue: 0,
      lowStockCount: 0,
      salesChart: [],
    };
  }
}
