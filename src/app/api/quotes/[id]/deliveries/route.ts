// src/app/api/quotes/[id]/deliveries/route.ts
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * POST body (optional):
 * - warehouseId: nếu muốn set kho ngay lúc tạo (option A)
 * - carrier/note: nếu muốn set luôn
 * - items: nếu muốn set qty ngay lúc tạo (không truyền thì mặc định = quoteItem.quantity)
 */
const CreateBody = z.object({
  warehouseId: z.string().optional(),
  carrier: z.string().optional(),
  note: z.string().optional(),
  items: z
    .array(
      z.object({
        quoteItemId: z.string(),
        qty: z.number().nonnegative(),
      })
    )
    .optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

function makeDeliveryNumber() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `D${yy}${mm}${dd}-${rand}`;
}

function clampQty(v: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(max, n));
}

/** Option A: tự lấy / tự tạo kho mặc định (nếu bạn vẫn muốn set kho ngay khi tạo) */
async function getOrCreateDefaultWarehouseId(orgId: string) {
  const first = await prismadb.warehouse.findFirst({
    where: { orgId } as any,
    orderBy: { createdAt: "asc" } as any,
    select: { id: true },
  });
  if (first?.id) return first.id;

  const created = await prismadb.warehouse.create({
    data: { orgId, name: "Kho chính" } as any,
    select: { id: true },
  });
  return created.id;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { orgId } = await requireApiContext(req);
  const { id: quoteId } = await ctx.params;

  const deliveries = await prismadb.delivery.findMany({
    where: { orgId, quoteId } as any,
    orderBy: { createdAt: "desc" } as any,
    include: { items: true },
  });

  return NextResponse.json({ items: deliveries });
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { orgId } = await requireApiContext(req);
  const { id: quoteId } = await ctx.params;

  const json = await req.json().catch(() => ({}));
  const body = CreateBody.safeParse(json);
  if (!body.success) {
    return NextResponse.json(
      { error: "Invalid body", details: body.error.flatten() },
      { status: 400 }
    );
  }

  // 1) Load quote + items
  const quote = await prismadb.quote.findFirst({
    where: { id: quoteId, orgId } as any,
    include: { items: true, customer: true },
  });

  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  // 2) Tính “đã giao” hiện tại để clamp
  const existingDeliveries = await prismadb.delivery.findMany({
    where: { orgId, quoteId } as any,
    include: { items: true },
  });

  const deliveredMap: Record<string, number> = {};
  for (const d of existingDeliveries) {
    for (const it of d.items) {
      const k = String(it.quoteItemId);
      deliveredMap[k] = (deliveredMap[k] || 0) + Number(it.qty || 0);
    }
  }

  // 3) Map qty request (nếu có)
  const reqItems = body.data.items;
  const qtyByQuoteItemId = new Map<string, number>();
  if (reqItems?.length) {
    for (const it of reqItems) {
      qtyByQuoteItemId.set(String(it.quoteItemId), Number(it.qty || 0));
    }
  }

  // 4) Build delivery items (clamp theo “còn lại”)
  const lines = (quote as any).items
    .map((qi: any) => {
      const quoteItemId = String(qi.id);
      const maxQty = Number(qi.quantity ?? 0);
      const already = Number(deliveredMap[quoteItemId] || 0);
      const remain = Math.max(0, maxQty - already);

      // giữ behavior cũ: nếu không truyền items => mặc định muốn giao full qty của quoteItem
      const rawQty = qtyByQuoteItemId.has(quoteItemId)
        ? Number(qtyByQuoteItemId.get(quoteItemId))
        : Number(qi.quantity ?? 0);

      const qty = clampQty(rawQty, remain);
      if (qty <= 0) return null;

      return { orgId, quoteItemId, qty };
    })
    .filter(Boolean) as any[];

  if (lines.length === 0) {
    return NextResponse.json(
      {
        error:
          "Không có dòng nào hợp lệ để tạo phiếu giao (đã giao hết hoặc qty = 0).",
      },
      { status: 400 }
    );
  }

  // ✅ Nếu bạn chọn “Cách 2: chọn kho lúc confirm” thì NÊN bỏ warehouseId ở đây.
  // Nhưng bạn đang muốn có option A nữa => nếu không truyền thì tự set kho mặc định.
  const warehouseId =
    body.data.warehouseId || (await getOrCreateDefaultWarehouseId(orgId));

  // 5) Create delivery (DRAFT) + items
  const delivery = await prismadb.delivery.create({
    data: {
      orgId,
      quoteId,
      number: makeDeliveryNumber(),
      status: "DRAFT" as any,

      // Option A (nếu vẫn muốn): set kho ngay từ lúc tạo
      warehouseId,

      ...(body.data.carrier ? { carrier: body.data.carrier } : {}),
      ...(body.data.note ? { note: body.data.note } : {}),

      items: { create: lines },
    } as any,
    include: { items: true },
  });

  return NextResponse.json({ ok: true, delivery });
}
