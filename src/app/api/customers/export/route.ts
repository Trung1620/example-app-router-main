import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);

    const customers = await prismadb.customer.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" }
    });

    const headers = ["Ngày tạo", "Mã KH", "Tên khách hàng", "Loại", "SĐT", "Email", "Địa chỉ", "Công nợ hiện tại", "Tổng chi tiêu"];
    const rows = customers.map((item: any) => [
      new Date(item.createdAt).toLocaleDateString("vi-VN"),
      item.code || "",
      `"${(item.name || "").replace(/"/g, '""')}"`,
      item.type === "business" ? "Doanh nghiệp" : "Cá nhân",
      item.phone || "",
      item.email || "",
      `"${(item.address || "").replace(/"/g, '""')}"`,
      item.currentDebt || 0,
      item.totalSpent || 0
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="KhachHang_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
