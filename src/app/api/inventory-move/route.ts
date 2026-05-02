// src/app/api/inventory-move/route.ts
import prismadb from "@/libs/prismadb";
import { NextResponse, NextRequest } from "next/server";
import { requireApiContext } from "@/app/api/_auth";

export const dynamic = "force-dynamic";

type MoveType = "IN" | "OUT" | "ADJUST";

type InputItem = {
  productId: string | undefined;
  variantId: string | undefined;
  materialId: string | undefined;
  qty: number;
  unitCost?: number;
  note?: string;
};

interface StockMoveRequestBody {
  warehouseId: string;
  type: MoveType;
  supplierId?: string;
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

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);
    const body: Partial<StockMoveRequestBody> = await req.json().catch(() => ({}));

    const warehouseId = String(body?.warehouseId || "").trim();
    const type = String(body?.type || "IN").trim() as MoveType;
    const supplierId = body?.supplierId ? String(body.supplierId).trim() : null;
    const note = String(body?.note || "").trim();

    if (!warehouseId) return NextResponse.json({ error: "Missing warehouseId" }, { status: 400 });
    if (!["IN", "OUT", "ADJUST"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const rawItems = Array.isArray(body?.items) ? body.items : [];
    if (rawItems.length === 0) return NextResponse.json({ error: "Missing items" }, { status: 400 });

    const items: InputItem[] = rawItems
      .map((x) => ({
        productId: (x?.productId && x.productId !== 'null') ? String(x.productId).trim() : undefined,
        variantId: (x?.variantId && x.variantId !== 'null') ? String(x.variantId).trim() : undefined,
        materialId: (x?.materialId && x.materialId !== 'null') ? String(x.materialId).trim() : undefined,
        qty: Number(x?.qty) || 0,
        unitCost: x?.unitCost != null ? Number(x.unitCost) : undefined,
        note: x?.note ? String(x.note).trim() : undefined,
      }))
      .filter((x) => (x.productId || x.variantId || x.materialId) && x.qty !== 0);

    if (items.length === 0) {
      return NextResponse.json({ error: "Items invalid" }, { status: 400 });
    }

    const wh = await prismadb.warehouse.findFirst({
      where: { id: warehouseId, orgId } as any,
    });
    if (!wh) return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });

    const deltas = items.map((it) => {
      const abs = Math.abs(it.qty);
      const delta = type === "IN" ? abs : type === "OUT" ? -abs : it.qty;
      return { ...it, delta };
    });

    const result = await prismadb.$transaction(async (tx) => {
      // 1. Kiểm tra tồn kho nếu là xuất kho (OUT)
      if (type === "OUT") {
        for (const d of deltas) {
          const balance = await tx.stockBalance.findFirst({
            where: {
              orgId,
              warehouseId,
              productId: d.productId || null,
              materialId: d.materialId || null,
            } as any
          });
          if (!balance || balance.qty < Math.abs(d.delta)) {
            throw new Error(`Không đủ tồn kho cho mặt hàng: ${d.productId || d.materialId}`);
          }
        }
      }

      // 2. Tạo phiếu kho (StockMove)
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
              materialId: d.materialId || undefined,
              qty: d.delta,
              unitCost: d.unitCost,
              note: d.note,
            })),
          },
        } as any,
      });

      // 3. Cập nhật số dư kho (StockBalance) và Giá vốn
      for (const d of deltas) {
        const existingBalance = await tx.stockBalance.findFirst({
          where: {
            warehouseId,
            productId: d.productId || null,
            materialId: d.materialId || null,
          } as any
        });

        if (existingBalance) {
          await tx.stockBalance.update({
            where: { id: existingBalance.id },
            data: { qty: { increment: d.delta } }
          });
        } else {
          await tx.stockBalance.create({
            data: {
              orgId,
              warehouseId,
              productId: d.productId || null,
              materialId: d.materialId || null,
              qty: d.delta,
            } as any
          });
        }

        // Cập nhật giá vốn nếu nhập hàng
        if (type === "IN" && (d.unitCost || 0) > 0) {
          if (d.materialId) {
            await tx.material.update({
              where: { id: d.materialId },
              data: { price: d.unitCost, stock: { increment: d.delta } }
            });
          } else if (d.productId) {
            await tx.product.update({
              where: { id: d.productId },
              data: { costPriceVnd: d.unitCost }
            });
          }
        }
      }

      // 4. Xử lý tài chính (Công nợ & Phiếu chi)
      if (type === "IN") {
        let totalCost = 0;
        let materialNames: string[] = [];
        for (const d of deltas) {
          totalCost += (d.delta * (d.unitCost || 0));
          if (d.materialId) {
             const mat = await tx.material.findUnique({ where: { id: d.materialId } });
             if (mat) materialNames.push(mat.name);
          }
        }

        if (totalCost > 0) {
          // Tạo công nợ nhà cung cấp
          if (supplierId) {
            const debtModel = (tx as any).debt || (tx as any).Debt;
            if (debtModel) {
              await debtModel.create({
                data: {
                  orgId,
                  type: "PAYABLE",
                  referenceType: "SUPPLIER",
                  supplierId: supplierId,
                  amount: totalCost,
                  paidAmount: 0,
                  dueDate: new Date(),
                  status: "UNPAID",
                  note: `Công nợ nhập kho: ${materialNames.join(", ") || "Vật tư"}`
                }
              });
            }
          }


        }
      }

      return created;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[INVENTORY_MOVE_POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);
    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get("warehouseId");

    const where: any = { orgId };
    if (warehouseId) where.warehouseId = warehouseId;

    const rows = await prismadb.stockMove.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        warehouse: true,
        items: {
          include: {
            product: { select: { nameVi: true, sku: true } },
            material: { select: { name: true, sku: true } }
          }
        }
      }
    });

    return NextResponse.json({ rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
