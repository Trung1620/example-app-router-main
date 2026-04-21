import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { z } from "zod";
import { getApiAuth } from "@/app/api/_auth";
import { getOrgIdForApiOrThrow } from "@/app/api/_org";

const Body = z.object({
  productId: z.string().optional(),
  variantId: z.string().optional(),
  sku: z.string().optional().default(""),
  nameVi: z.string().min(1),
  nameEn: z.string().optional().default(""),
  size: z.string().optional(),
  unit: z.string().optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  note: z.string().optional(),
  imageUrl: z.string().optional(),
  costPrice: z.number().optional().nullable(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getApiAuth(req);
    if (!auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await getOrgIdForApiOrThrow(req, auth.userId);
    const { id } = await context.params;

    let data: z.infer<typeof Body>;

    try {
      data = Body.parse(await req.json());
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid input", issues: err.issues },
          { status: 400 }
        );
      }
      throw err;
    }

    const quote = await prismadb.quote.findFirst({
      where: { id, orgId },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    await prismadb.quoteItem.create({
      data: {
        quoteId: quote.id,
        productId: data.productId,
        variantId: data.variantId,
        sku: data.sku,
        nameVi: data.nameVi,
        nameEn: data.nameEn,
        size: data.size,
        unit: data.unit,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        lineTotal: data.quantity * data.unitPrice,
        note: data.note,
        imageUrl: data.imageUrl,
        costPrice: data.costPrice,
      },
    });

    const items = await prismadb.quoteItem.findMany({
      where: { quoteId: quote.id },
    });

    const subTotal = items.reduce(
      (sum, it) => sum + Number(it.lineTotal || 0),
      0
    );

    const discountAmount = Number(quote.discountAmount || 0);
    const afterDiscount = subTotal - discountAmount;

    const taxAmount = quote.taxPercent
      ? (afterDiscount * Number(quote.taxPercent)) / 100
      : 0;

    const householdTaxPercent = Number(quote.householdTaxPercent || 1);
    const householdTaxAmount = afterDiscount * (householdTaxPercent / 100);
    const shippingFee = Number(quote.shippingFee || 0);
    const grandTotal =
      afterDiscount + taxAmount + householdTaxAmount + shippingFee;

    const updated = await prismadb.quote.update({
      where: { id: quote.id },
      data: {
        subTotal,
        taxAmount,
        householdTaxAmount,
        grandTotal,
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json(updated);
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
      { error: msg || "Unexpected server error" },
      { status }
    );
  }
}