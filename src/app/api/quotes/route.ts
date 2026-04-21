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
  contactEmail: optionalEmail,
  contactPhone: optionalString,

  contactTaxId: optionalString,
  contactAddress: optionalString,
  contactType: optionalString,
  companyName: optionalString,

  currency: z.string().default('VND'),
  locale: z.enum(['vi', 'en']).default('vi'),
  status: z.string().optional(),

  // ✅ cho phép tạo quote nháp chưa có hàng
  items: z.array(Item).default([]),

  discountPercent: z.number().optional(),
  discountAmount: z.number().optional(),
  shippingFee: z.number().optional(),
  taxPercent: z.number().optional(),
  householdTaxPercent: z.number().optional(),
  depositAmount: z.number().optional(),
  validUntil: z.string().datetime().optional(),

  notesVi: optionalString,
  notesEn: optionalString
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
    taxPercent: data.taxPercent,
    householdTaxPercent: data.householdTaxPercent ?? 0, 
    shippingFee: data.shippingFee,
  });

  const { discountAmount, taxAmount, householdTaxAmount, grandTotal } = calc;
  const householdTaxPercent = data.householdTaxPercent ?? 0;

  const created = await prismadb.quote.create({
    data: {
      orgId,

      number,
      status: (data.status as QuoteStatus) || 'DRAFT',
      currency: data.currency,
      locale: data.locale,

      customerId: data.customerId,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,

      contactTaxId: data.contactTaxId,
      contactAddress: data.contactAddress,
      contactType: data.contactType,
      companyName: data.companyName,

      items: {
        create: data.items.map((it) => ({
          sku: it.sku ?? '',
          nameVi: it.nameVi,
          nameEn: it.nameEn ?? '',
          size: it.size,
          unit: it.unit,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          lineTotal: it.unitPrice * it.quantity,
          note: it.note,
          imageUrl: it.imageUrl,
          productId: it.productId,
          variantId: it.variantId,
          costPrice: it.costPrice
        }))
      },

      subTotal: sub,
      discountPercent: data.discountPercent,
      discountAmount,
      taxPercent: data.taxPercent,
      taxAmount,
      householdTaxPercent,
      householdTaxAmount,
      shippingFee: data.shippingFee ?? 0,
      depositAmount: data.depositAmount ?? 0,
      grandTotal,
      notesVi: data.notesVi,
      notesEn: data.notesEn,
      validUntil: data.validUntil ? new Date(data.validUntil) : undefined
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