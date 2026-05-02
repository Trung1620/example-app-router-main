import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);

    const quotes = await prismadb.quote.findMany({
      where: { orgId },
      include: {
        customer: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    // Generate CSV
    const headers = [
      "Ngày tạo",
      "Số báo giá",
      "Khách hàng",
      "Tổng tiền hàng",
      "Giảm giá",
      "Phí giao hàng",
      "Tổng cộng",
      "Trạng thái",
      "Ghi chú"
    ];

    const rows = quotes.map((item: any) => {
      return [
        new Date(item.createdAt).toLocaleDateString("vi-VN"),
        item.number,
        `"${(item.customer?.name || "").replace(/"/g, '""')}"`,
        item.subTotal,
        item.discount,
        item.shippingFee,
        item.grandTotal,
        item.status,
        `"${(item.notes || "").replace(/\n/g, " ").replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\r\n");

    // Add BOM for UTF-8 (Excel requirement for special characters)
    const BOM = "\uFEFF";
    const content = BOM + csvContent;

    return new Response(content, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="BaoGia_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("[QUOTES_EXPORT]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
