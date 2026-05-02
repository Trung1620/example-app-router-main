// src/app/api/inventory-move/route.ts
import prismadb from "@/libs/prismadb";
import { NextResponse } from "next/server";
import { requireApiContext } from "@/app/api/_auth";

export const dynamic = "force-dynamic";

type MoveType = "IN" | "OUT" | "ADJUST";

type InputItem = {
  productId: string | null;
  variantId: string | null;
  materialId: string | null;
  qty: number;
  unitCost?: number;
  note?: string;
};

interface StockMoveRequestBody {
  warehouseId: string;
  type: MoveType;
  note?: string;
  items: Array<{
    productId?: string;
    variantId?: string;
    materialId?: string;
    qty: number;
    unitCost?: number;
    note?: string;
  }>;
}

function keyOf(it: { productId?: string; variantId?: string; materialId?: string }) {
  return `${it.productId || "null"}::${it.variantId || "null"}::${it.materialId || "null"}`;
}

export async function POST(req: Request) {
  const { orgId } = await requireApiContext(req);

  const body: Partial<StockMoveRequestBody> = await req.json().catch(() => ({}));
  const warehouseId = String(body?.warehouseId || "").trim();
  const type = String(body?.type || "IN").trim() as MoveType;
  const note = String(body?.note || "").trim();

  if (!warehouseId) return NextResponse.json({ error: "Missing warehouseId" }, { status: 400 });
  if (!["IN", "OUT", "ADJUST"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const rawItems = Array.isArray(body?.items) ? body.items : [];
  if (rawItems.length === 0) return NextResponse.json({ error: "Missing items" }, { status: 400 });

  const items: InputItem[] = rawItems
    .map((x) => ({
      productId: (x?.productId && x.productId !== 'null') ? String(x.productId).trim() : null,
      variantId: (x?.variantId && x.variantId !== 'null') ? String(x.variantId).trim() : null,
      materialId: (x?.materialId && x.materialId !== 'null') ? String(x.materialId).trim() : null,
      qty: Number(x?.qty) || 0,
      unitCost: x?.unitCost != null ? Number(x.unitCost) : undefined,
      note: x?.note ? String(x.note).trim() : undefined,
    }))
    .filter((x) => (x.productId || x.variantId || x.materialId) && x.qty !== 0);

  if (items.length === 0) {
    return NextResponse.json({ error: "Items invalid (need qty and product/variant/material)" }, { status: 400 });
  }

  const wh = await prismadb.warehouse.findFirst({
    where: { id: warehouseId, orgId } as any,
    select: { id: true },
  });
  if (!wh) return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });

  const deltas = items.map((it) => {
    const abs = Math.abs(it.qty);
    const delta = type === "IN" ? abs : type === "OUT" ? -abs : it.qty;
    return { ...it, delta };
  });

  const ENFORCE_NO_NEGATIVE = true;

  try {
    const result = await prismadb.$transaction(async (tx) => {
      if (ENFORCE_NO_NEGATIVE && type === "OUT") {
        const keysForBalance = deltas.map((d) => ({ 
          productId: d.productId ?? null, 
          variantId: d.variantId ?? null,
          materialId: d.materialId ?? null
        }));

        const balances = await tx.stockBalance.findMany({
          where: {
            orgId,
            warehouseId,
            OR: keysForBalance.map((k) => ({
              productId: k.productId,
              variantId: k.variantId,
              materialId: k.materialId,
            })),
          } as any,
          select: { productId: true, variantId: true, materialId: true, qty: true },
        });

        const map = new Map<string, number>(
          balances.map((b) => [keyOf({ 
            productId: b.productId ?? undefined, 
            variantId: b.variantId ?? undefined,
            materialId: b.materialId ?? undefined 
          }), b.qty])
        );

        const notEnough = deltas
          .map((d) => {
            const cur = map.get(keyOf(d)) ?? 0;
            const after = cur + d.delta;
            return { productId: d.productId, variantId: d.variantId, materialId: d.materialId, cur, after };
          })
          .filter((x) => x.after < 0);

        if (notEnough.length > 0) {
          return { error: "Not enough stock", details: notEnough } as const;
        }
      }

      const created = await tx.stockMove.create({
        data: {
          orgId,
          warehouseId,
          type,
          note: note || undefined,
          items: {
            create: deltas.map((d) => ({
              orgId,
              productId: d.productId || undefined,
              variantId: d.variantId || undefined,
              materialId: d.materialId || undefined,
              qty: d.delta,
              unitCost: d.unitCost,
              note: d.note,
            })),
          },
        } as any,
        include: { items: true },
      });

      for (const d of deltas) {
        // Cập nhật số dư kho
        await tx.stockBalance.upsert({
          where: {
            warehouseId_productId_variantId_materialId: {
              warehouseId: warehouseId,
              productId: d.productId || null,
              variantId: d.variantId || null,
              materialId: d.materialId || null,
            },
          } as any,
          update: { orgId, qty: { increment: d.delta } } as any,
          create: {
            orgId,
            warehouseId,
            productId: d.productId ?? null,
            variantId: d.variantId ?? null,
            materialId: d.materialId ?? null,
            qty: d.delta,
          } as any,
        });

        // Nếu là nhập kho (IN), cập nhật luôn giá vốn vào bảng chính
        if (type === "IN" && d.unitCost != null && d.unitCost > 0) {
          if (d.materialId) {
            await tx.material.update({
              where: { id: d.materialId },
              data: { price: d.unitCost, stock: { increment: d.delta } },
            });
          } else if (d.variantId) {
            await tx.productVariant.update({
              where: { id: d.variantId },
              data: { costPriceVnd: d.unitCost },
            });
          } else if (d.productId) {
            await tx.product.update({
              where: { id: d.productId },
              data: { costPriceVnd: d.unitCost },
            });
          }
        } else if (d.materialId) {
          // Chỉ cập nhật tồn kho tổng trong bảng Material
          await tx.material.update({
            where: { id: d.materialId },
            data: { stock: { increment: d.delta } },
          });
        }
      }

      return { id: created.id } as const;
    });

    if ((result as any)?.error) return NextResponse.json(result, { status: 400 });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Create stock move failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { orgId } = await requireApiContext(req);
  const url = new URL(req.url);
  const warehouseId = url.searchParams.get("warehouseId")?.trim();

  const where: any = { orgId };
  if (warehouseId) where.warehouseId = warehouseId;

  const rows = await prismadb.stockMove.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      warehouse: true,
      items: { include: { product: true, variant: true } },
    },
  });

  return NextResponse.json({ rows });
}
