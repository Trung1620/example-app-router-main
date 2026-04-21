// src/app/api/inventory/balance/route.ts
import prismadb from "@/libs/prismadb";
import { NextResponse } from "next/server";
import { requireApiContext } from "@/app/api/_auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { orgId } = await requireApiContext(req);

  const url = new URL(req.url);
  const warehouseId = url.searchParams.get("warehouseId")?.trim() || "";

  if (!warehouseId) {
    return NextResponse.json({ error: "Missing warehouseId" }, { status: 400 });
  }

  // validate kho thuộc org
  const wh = await prismadb.warehouse.findFirst({
    where: { id: warehouseId, orgId } as any,
    select: { id: true, name: true },
  });
  if (!wh) return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });

  const rows = await prismadb.stockBalance.findMany({
    where: { orgId, warehouseId } as any,
    orderBy: { updatedAt: "desc" },
    include: {
      warehouse: true,
      product: { include: { images: true } },
      variant: true,
    },
  });

  const items = rows.map((r) => ({
    id: r.id,
    productId: r.productId,
    variantId: r.variantId,
    qty: r.qty,
    updatedAt: r.updatedAt,
    product: r.product
      ? {
        id: r.product.id,
        nameVi: r.product.nameVi,
        nameEn: r.product.nameEn,
        brand: r.product.brand,
        category: r.product.category,
        priceVnd: r.product.priceVnd,
        imageUrl: r.product.images?.[0]?.url || null,
      }
      : null,
    variant: r.variant
      ? {
        id: r.variant.id,
        sku: r.variant.sku,
        name: r.variant.name,
        size: r.variant.size,
        color: r.variant.color,
        priceVnd: r.variant.priceVnd,
      }
      : null,
    warehouse: { id: r.warehouse.id, name: r.warehouse.name },
  }));

  return NextResponse.json({ items });
}
