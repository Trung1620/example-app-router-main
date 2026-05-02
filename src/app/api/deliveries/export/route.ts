import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);

    const deliveries = await prismadb.delivery.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" }
    });

    const headers = ["Mã vận đơn", "Người nhận", "SĐT nhận", "Đơn vị vận chuyển", "Phương tiện", "Biển số", "Tài xế", "SĐT tài xế", "Mã vận đơn", "Phí ship", "Trạng thái"];
    const rows = deliveries.map((item: any) => [
      item.number || "",
      `"${(item.receiverName || "").replace(/"/g, '""')}"`,
      item.receiverPhone || "",
      item.carrier || "",
      item.vehicleType || "",
      item.vehicleNumber || "",
      `"${(item.driverName || "").replace(/"/g, '""')}"`,
      item.driverPhone || "",
      item.trackingNumber || "",
      item.shippingCost || 0,
      item.status || "PENDING"
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="VanChuyen_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
