import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { z } from "zod";
import { getApiAuth } from "@/app/api/_auth";
import { getOrgIdForApiOrThrow } from "@/app/api/_org";

type RouteParams = {
  id: string;
};

const optionalString = z.preprocess((val) => {
  if (val === null || val === undefined) return undefined;
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  return val;
}, z.string().optional());

const optionalEmail = z.preprocess((val) => {
  if (val === null || val === undefined) return undefined;
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  return val;
}, z.string().email().optional());

const optionalNumber = z.preprocess((val) => {
  if (val === null || val === undefined || val === "") return undefined;
  if (typeof val === "string") {
    const n = Number(val.replace(",", ""));
    return Number.isNaN(n) ? val : n;
  }
  return val;
}, z.number().optional());

const optionalDate = z.preprocess((val) => {
  if (val === null || val === undefined || val === "") return undefined;
  if (val instanceof Date) return val;
  if (typeof val === "string") {
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return val;
}, z.date().optional());

const Item = z.object({
  sku: optionalString.default(""),
  nameVi: z.string().min(1, "Tên hàng không được để trống"),
  nameEn: optionalString.default(""),
  size: optionalString,
  unit: optionalString,
  quantity: optionalNumber
    .transform((v) => v ?? 0)
    .pipe(z.number().int().positive()),
  unitPrice: optionalNumber
    .transform((v) => v ?? 0)
    .pipe(z.number().nonnegative()),
  note: optionalString,
  imageUrl: z.preprocess((val) => {
    if (val === null || val === undefined || val === "") return undefined;
    return val;
  }, z.string().url().optional()),
});

const PatchBody = z.object({
  customerId: optionalString,
  contactName: optionalString,
  contactEmail: optionalEmail,
  contactPhone: optionalString,
  contactTaxId: optionalString,
  contactAddress: optionalString,
  currency: optionalString,
  locale: z.enum(["vi", "en"]).optional(),
  items: z.array(Item).min(1).optional(),
  discountPercent: optionalNumber,
  discountAmount: optionalNumber,
  shippingFee: optionalNumber,
  taxPercent: optionalNumber,
  depositAmount: optionalNumber,
  householdTaxPercent: optionalNumber,
  validUntil: optionalDate,
  notesVi: optionalString,
  notesEn: optionalString,
  status: z
    .enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED", "CONVERTED"])
    .optional(),
});

type PatchBodyIn = z.infer<typeof PatchBody>;
type ItemIn = z.infer<typeof Item>;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<RouteParams> }
) {
  try {
    const { id } = await ctx.params;

    const auth = await getApiAuth(req);
    if (!auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await getOrgIdForApiOrThrow(req, auth.userId);

    const quote = await prismadb.quote.findFirst({
      where: { id, orgId },
      include: {
        items: true,
        customer: true,
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    return NextResponse.json(quote);
  } catch (e: any) {
    const msg = String(e?.message || "");
    const status =
      msg.includes("Unauthorized")
        ? 401
        : msg.includes("Missing org")
        ? 400
        : msg.includes("Not a member")
        ? 403
        : 400;

    return NextResponse.json(
      { error: msg || "Load quote failed" },
      { status }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<RouteParams> }
) {
  try {
    const { id } = await ctx.params;

    const auth = await getApiAuth(req);
    if (!auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await getOrgIdForApiOrThrow(req, auth.userId);

    let body: PatchBodyIn;

    try {
      const json = await req.json();
      body = PatchBody.parse(json);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid input", issues: err.issues },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Unexpected server error" },
        { status: 500 }
      );
    }

    const current = await prismadb.quote.findFirst({
      where: { id, orgId },
      include: { items: true },
    });

    if (!current) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const currentItems: ItemIn[] = current.items.map((it: any) => ({
      sku: (it.sku ?? "") || "",
      nameVi: it.nameVi,
      nameEn: it.nameEn ?? "",
      size: it.size ?? "",
      unit: it.unit ?? undefined,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice),
      note: it.note ?? undefined,
      imageUrl: it.imageUrl ?? undefined,
    }));

    const items: ItemIn[] = body.items ?? currentItems;

    const sub = items.reduce(
      (s: number, it: ItemIn) => s + it.unitPrice * it.quantity,
      0
    );

    // Sync discount logic
    let discountAmount = current.discountAmount ?? 0;
    let discountPercent = current.discountPercent ?? 0;

    if (body.discountAmount !== undefined) {
      discountAmount = body.discountAmount;
      discountPercent = sub > 0 ? (discountAmount / sub) * 100 : 0;
    } else if (body.discountPercent !== undefined) {
      discountPercent = body.discountPercent;
      discountAmount = (sub * discountPercent) / 100;
    }

    const afterDiscount = sub - discountAmount;

    const taxAmount =
      body.taxPercent != null
        ? (afterDiscount * body.taxPercent) / 100
        : current.taxAmount ?? 0;

    const householdTaxPercent =
      body.householdTaxPercent ?? current.householdTaxPercent ?? 0;

    const householdTaxAmount = afterDiscount * (householdTaxPercent / 100);
    const shippingFee = body.shippingFee ?? current.shippingFee ?? 0;
    const grandTotal =
      afterDiscount + taxAmount + householdTaxAmount + shippingFee;

    const updated = await prismadb.quote.update({
      where: { id: current.id },
      data: {
        customerId: body.customerId ?? current.customerId,
        contactName: body.contactName ?? current.contactName,
        contactEmail: body.contactEmail ?? current.contactEmail,
        contactPhone: body.contactPhone ?? current.contactPhone,
        contactTaxId: body.contactTaxId ?? current.contactTaxId,
        contactAddress: body.contactAddress ?? current.contactAddress,
        currency: body.currency ?? current.currency,
        locale: body.locale ?? current.locale,
        discountPercent,
        discountAmount,
        taxPercent: body.taxPercent ?? current.taxPercent,
        taxAmount,
        householdTaxPercent,
        householdTaxAmount,
        shippingFee,
        depositAmount: body.depositAmount ?? current.depositAmount ?? 0,
        grandTotal,
        subTotal: sub,
        notesVi: body.notesVi ?? current.notesVi,
        notesEn: body.notesEn ?? current.notesEn,
        validUntil: body.validUntil ?? current.validUntil,
        items: {
          deleteMany: { quoteId: current.id },
          create: items.map((it: ItemIn) => ({
            sku: it.sku ?? "",
            nameVi: it.nameVi,
            nameEn: it.nameEn ?? "",
            size: it.size,
            unit: it.unit,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            lineTotal: it.unitPrice * it.quantity,
            note: it.note,
            imageUrl: it.imageUrl,
          })),
        },
        status: body.status ?? current.status,
      },
      include: { items: true },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Patch failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<RouteParams> }
) {
  try {
    const { id } = await ctx.params;

    const auth = await getApiAuth(req);
    if (!auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await getOrgIdForApiOrThrow(req, auth.userId);

    const exists = await prismadb.quote.findFirst({
      where: { id, orgId },
      select: { id: true },
    });

    if (!exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prismadb.$transaction([
      prismadb.quoteItem.deleteMany({ where: { quoteId: id } }),
      prismadb.quote.delete({ where: { id } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Delete failed" },
      { status: 500 }
    );
  }
}