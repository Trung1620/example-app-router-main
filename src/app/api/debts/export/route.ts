import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);

    const debts = await prismadb.debt.findMany({
      where: { orgId },
      include: {
        customer: { select: { name: true } },
        artisan: { select: { name: true } },
        supplier: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    const headers = ["Ngày tạo", "Đối tượng", "Loại", "Số tiền", "Đã trả", "Ngày hết hạn", "Trạng thái", "Ghi chú"];
    const rows = debts.map((item: any) => {
      const debtorName = item.customer?.name || item.artisan?.name || item.supplier?.name || item.customerName || "N/A";
      return [
        new Date(item.createdAt).toLocaleDateString("vi-VN"),
        `"${debtorName.replace(/"/g, '""')}"`,
        item.type === "RECEIVABLE" ? "Phải thu" : "Phải trả",
        item.amount || 0,
        item.paidAmount || 0,
        item.dueDate || "",
        item.status || "UNPAID",
        `"${(item.note || "").replace(/"/g, '""')}"`
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="CongNo_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
