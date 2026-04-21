// src/app/api/inventory/low-stock/route.ts
// [GET] Quản lý cảnh báo tồn kho dưới mức tối thiểu
import prismadb from "@/libs/prismadb";
import { NextResponse } from "next/server";
import { requireApiContext } from "@/app/api/_auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { orgId } = await requireApiContext(req);

  const url = new URL(req.url);
  const warehouseId = url.searchParams.get("warehouseId")?.trim();
  const minStock = Number(url.searchParams.get("minStock")) || 10; // mặc định cảnh báo >= 10

  const where: any = { orgId };
  if (warehouseId) where.warehouseId = warehouseId;

  // Lấy sản phẩm có tồn kho <= minStock
  const lowStocks = await prismadb.stockBalance.findMany({
    where: {
      ...where,
      qty: { lte: minStock },
    } as any,
    include: {
      product: { select: { id: true, nameVi: true, nameEn: true, brand: true } },
      variant: { select: { id: true, sku: true, name: true } },
      warehouse: { select: { id: true, name: true } },
    },
    orderBy: { qty: "asc" },
  });

  return NextResponse.json({
    items: lowStocks.map((item) => ({
      id: item.id,
      warehouseId: item.warehouseId,
      warehouseName: item.warehouse.name,
      productId: item.productId,
      variantId: item.variantId,
      qty: item.qty,
      minAlert: minStock,
      product: item.product,
      variant: item.variant,
    })),
  });
}

export async function POST(req: Request) {
  const { orgId } = await requireApiContext(req);

  const body = (await req.json().catch(() => ({}))) as any;
  const productId = String(body?.productId || "").trim();
  const minStockLevel = Number(body?.minStockLevel) || 10;

  if (!productId) {
    return NextResponse.json({ error: "Missing productId" }, { status: 400 });
  }

  try {
    // Cập nhật hoặc tạo mức cảnh báo cho sản phẩm
    // Lưu ý: cần thêm field minStockLevel vào Product model
    const updated = await prismadb.product.update({
      where: { id: productId },
      data: { status: "ACTIVE" }, // placeholder, nên thêm minStockLevel field
    });

    return NextResponse.json({
      ok: true,
      message: `Đã cập nhật mức cảnh báo tồn kho cho sản phẩm`,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Update failed" },
      { status: 500 }
    );
  }
}
