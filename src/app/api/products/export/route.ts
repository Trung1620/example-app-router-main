import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);

    const products = await prismadb.product.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" }
    });

    const headers = ["SKU", "Tên sản phẩm (VN)", "Tên sản phẩm (EN)", "Giá bán (VND)", "Giá vốn (VND)", "Tồn kho"];
    const rows = products.map((item: any) => [
      item.sku || "",
      `"${(item.nameVi || "").replace(/"/g, '""')}"`,
      `"${(item.nameEn || "").replace(/"/g, '""')}"`,
      item.priceVnd || 0,
      item.costPriceVnd || 0,
      item.stockCount || 0
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="SanPham_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
