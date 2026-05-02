import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);

    const suppliers = await prismadb.supplier.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" }
    });

    const headers = ["Ngày tạo", "Mã NCC", "Tên nhà cung cấp", "SĐT", "Email", "Địa chỉ", "Mã số thuế"];
    const rows = suppliers.map((item: any) => [
      new Date(item.createdAt).toLocaleDateString("vi-VN"),
      item.code || "",
      `"${(item.name || "").replace(/"/g, '""')}"`,
      item.phone || "",
      item.email || "",
      `"${(item.address || "").replace(/"/g, '""')}"`,
      item.taxId || ""
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="NhaCungCap_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
