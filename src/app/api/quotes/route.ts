// src/app/api/quotes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prismadb from '@/libs/prismadb';
import { nextQuoteNumber } from '@/libs/quoteNumber';
import { z } from 'zod';
import { requireApiContext } from '@/app/api/_auth';
import { calcQuoteGrandTotal } from '@/libs/quoteCalc';
import { QuoteStatus } from '@prisma/client';

/** ====== HELPERS: cho phép null / "" / undefined ====== */

const optionalString = z.preprocess((val) => {
  if (val === null || val === undefined) return undefined;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed === '' ? undefined : trimmed;
  }
  return val;
}, z.string().optional());

const optionalEmail = z.preprocess((val) => {
  if (val === null || val === undefined) return undefined;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed === '' ? undefined : trimmed;
  }
  return val;
}, z.string().email().optional());

/** ====== SCHEMA ITEM & BODY ====== */

const Item = z.object({
  sku: z.string().optional().default(''),
  nameVi: z.string().min(1, 'Tên hàng không được để trống'),
  nameEn: z.string().optional().default(''),
  size: z.string().optional(),
  unit: z.string().optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  note: z.string().optional(),
  imageUrl: z.string().url().optional(),
  productId: z.string().optional(),
  variantId: z.string().optional(),
  costPrice: z.number().optional().nullable()
});

const Body = z.object({
  customerId: optionalString,

  contactName: optionalString,
  contactPhone: optionalString,
  contactAddress: optionalString,
  
  orderName: optionalString,
  quoteDate: optionalString,
  deliveryDate: optionalString,
  expiryDate: optionalString,

  status: z.string().optional(),
  items: z.array(Item).default([]),

  discountPercent: z.number().optional(),
  discountAmount: z.number().optional(),
  shippingFee: z.number().optional(),
  depositAmount: z.number().optional(),

  notesVi: optionalString,
});

type ItemIn = z.infer<typeof Item>;
type BodyIn = z.infer<typeof Body>;

/** ====== POST /api/quotes ====== */

export async function POST(req: NextRequest) {
  const { orgId } = await requireApiContext(req);

  let data: BodyIn;

  try {
    const json = await req.json();
    data = Body.parse(json);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', issues: err.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error when parsing body:', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }

  const number = await nextQuoteNumber();

  const sub = data.items.reduce(
    (s: number, it: ItemIn) => s + it.unitPrice * it.quantity,
    0
  );

  const calc = calcQuoteGrandTotal({
    subTotal: sub,
    discountPercent: data.discountPercent,
    discountAmount: data.discountAmount,
    shippingFee: data.shippingFee,
  });

  const { discountAmount, grandTotal } = calc;

  let finalNotes = data.notesVi || "";
  if (data.orderName) finalNotes = `Tên đơn hàng: ${data.orderName}\n` + finalNotes;
  if (data.deliveryDate) finalNotes = `Ngày giao: ${data.deliveryDate}\n` + finalNotes;
  if (data.contactName) finalNotes = `Người liên hệ: ${data.contactName} (${data.contactPhone || ''})\n` + finalNotes;

  const created = await prismadb.quote.create({
    data: {
      orgId,
      number,
      status: (data.status as QuoteStatus) || 'DRAFT',
      customerId: data.customerId,

      items: {
        create: data.items.map((it) => ({
          sku: it.sku ?? '',
          nameVi: it.nameVi,
          size: it.size,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          lineTotal: it.unitPrice * it.quantity,
          productId: it.productId,
          variantId: it.variantId,
        }))
      },

      subTotal: sub,
      discount: discountAmount || data.discountAmount || 0,
      shippingFee: data.shippingFee ?? 0,
      grandTotal,
      notes: finalNotes,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined
    },
    include: {
      items: true,
      customer: true
    }
  });

  return NextResponse.json(created, { status: 201 });
}

/** ====== GET /api/quotes ====== */

export async function GET(req: NextRequest) {
  const { orgId } = await requireApiContext(req);

  const { searchParams } = new URL(req.url);

  const q = (searchParams.get('q') ?? '').trim();
  const all = searchParams.get('all') === '1';

  const page = Number(searchParams.get('page') ?? 1);
  const pageSize = Number(searchParams.get('pageSize') ?? 20);

  const where: any = { orgId };

  if (q.length > 0) {
    where.OR = [
      { number: { contains: q, mode: 'insensitive' } },
      { contactName: { contains: q, mode: 'insensitive' } },
      { contactEmail: { contains: q, mode: 'insensitive' } },
      { contactPhone: { contains: q, mode: 'insensitive' } },
      { customer: { is: { name: { contains: q, mode: 'insensitive' } } } }
    ];
  }

  const [items, total] = await Promise.all([
    prismadb.quote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...(all
        ? {}
        : {
            skip: (page - 1) * pageSize,
            take: pageSize
          }),
      include: { customer: true }
    }),
    prismadb.quote.count({ where })
  ]);

  return NextResponse.json({
    items,
    total,
    page: all ? 1 : page,
    pageSize: all ? total : pageSize
  });
}