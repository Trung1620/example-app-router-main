import prismadb from "@/libs/prismadb";
import { NextResponse } from "next/server";
import { requireApiContext } from "@/app/api/_auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { orgId } = await requireApiContext(req);

  const rows = await prismadb.productVariant.findMany({
    where: { orgId } as any,
    orderBy: { createdAt: "desc" },
    include: {
      product: { select: { id: true, nameVi: true, nameEn: true } },
    },
  });

  const items = rows.map((v: (typeof rows)[number]) => ({
    id: String(v.id),
    sku: v.sku,
    name: v.name ?? null,
    size: v.size ?? null,
    color: v.color ?? null,
    productId: v.productId ? String(v.productId) : null,
    productNameVi: v.product?.nameVi ?? null,
    productNameEn: v.product?.nameEn ?? null,
    costPriceVnd: v.costPriceVnd ?? null,
  }));

  return NextResponse.json({ items });
}