import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);

    const artisans = await prismadb.artisan.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" }
    });

    const headers = ["Mã thợ", "Tên thợ", "SĐT", "Vai trò", "Công nhật", "Nợ hiện tại", "Ngày làm tổng", "Kỹ năng"];
    const rows = artisans.map((item: any) => [
      item.code || "",
      `"${(item.name || "").replace(/"/g, '""')}"`,
      item.phone || "",
      item.role || "",
      item.dailyWage || 0,
      item.debt || 0,
      item.totalDaysWorked || 0,
      `"${(item.skills || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ThoThuCong_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
