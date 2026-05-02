import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);

    const materials = await prismadb.material.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" }
    });

    const headers = ["Mã vật tư", "Tên vật tư", "Đơn vị", "Đơn giá", "Tồn kho", "Định mức tồn", "Vị trí", "Nhà cung cấp"];
    const rows = materials.map((item: any) => [
      item.sku || "",
      `"${(item.name || "").replace(/"/g, '""')}"`,
      item.unit || "",
      item.price || 0,
      item.stock || 0,
      item.minStock || 0,
      `"${(item.location || "").replace(/"/g, '""')}"`,
      `"${(item.supplier || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="VatTu_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
