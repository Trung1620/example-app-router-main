// src/app/api/deliveries/[id]/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { orgId } = await requireApiContext(req);
  const { id: rawId } = await params;

  const deliveryId = String(rawId || "").trim();
  if (!deliveryId) {
    return NextResponse.json({ error: "Missing delivery id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const warehouseId = String(body?.warehouseId || "").trim();

  if (!warehouseId) {
    return NextResponse.json({ error: "Missing warehouseId" }, { status: 400 });
  }

  try {
    const result = await prismadb.$transaction(async (tx) => {
      // 1️⃣ Load delivery
      const delivery = await tx.delivery.findFirst({
        where: { id: deliveryId, orgId } as any,
        include: {
          items: { include: { quoteItem: true } },
        },
      });

      if (!delivery) {
        return { ok: false, error: "Delivery not found", status: 404 as const };
      }

      if ((delivery as any).status === "CONFIRMED") {
        return { ok: true, already: true as const };
      }

      // 2️⃣ Validate warehouse
      const warehouse = await tx.warehouse.findFirst({
        where: { id: warehouseId, orgId } as any,
        select: { id: true },
      });

      if (!warehouse) {
        return { ok: false, error: "Invalid warehouse", status: 400 as const };
      }

      // 3️⃣ Idempotent check StockMove
      const existedMove = await tx.stockMove.findFirst({
        where: {
          orgId,
          refType: "DELIVERY",
          refId: deliveryId,
        } as any,
        select: { id: true },
      });

      // 4️⃣ Gán kho + confirm delivery
      await tx.delivery.update({
        where: { id: deliveryId } as any,
        data: {
          status: "CONFIRMED" as any,
          warehouseId,
        } as any,
      });

      if (existedMove) {
        return { ok: true, already: true as const };
      }

      // 5️⃣ Create StockMove OUT
      await tx.stockMove.create({
        data: {
          orgId,
          warehouseId,
          type: "OUT" as any,
          refType: "DELIVERY" as any,
          refId: deliveryId as any,
          note: `Auto OUT from delivery ${(delivery as any).number}`,
          items: {
            create: (delivery as any).items.map((di: any) => {
              const qi = di.quoteItem;
              return {
                orgId,
                qty: -Math.abs(Number(di.qty ?? 0)),
                sku: qi?.sku ?? "",
                nameVi: qi?.nameVi ?? "",
                unitCost: qi?.costPrice || 0, // Snapshot unit cost for COGS
                ...(qi?.productId ? { productId: qi.productId } : {}),
                ...(qi?.variantId ? { variantId: qi.variantId } : {}),
              };
            }),
          },
        } as any,
      });

      // 6️⃣ Trừ StockBalance
      // 6️⃣ Trừ StockBalance
      const balanceLines = (delivery as any).items
        .map((di: any) => ({
          productId: di.quoteItem?.productId as string | undefined,
          variantId: (di.quoteItem?.variantId as string | undefined) ?? null,
          qty: Number(di.qty ?? 0),
        }))
        .filter((x: any) => !!x.productId && x.qty > 0);

      for (const ln of balanceLines) {
        await tx.stockBalance.upsert({
          where: {
            warehouseId_productId_variantId: {
              warehouseId,
              productId: ln.productId!,
              variantId: ln.variantId, // null hoặc string
            },
          },
          create: {
            orgId,
            warehouseId,
            productId: ln.productId!,
            variantId: ln.variantId, // null hoặc string
            qty: 0 - ln.qty,
          },
          update: {
            qty: { decrement: ln.qty },
          },
        });
      }


      return { ok: true, already: false as const };
    });

    // nếu transaction trả về object error có status -> trả đúng status
    if ((result as any)?.ok === false && (result as any)?.status) {
      return NextResponse.json(
        { error: (result as any).error },
        { status: (result as any).status }
      );
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Confirm failed" },
      { status: 500 }
    );
  }
}
