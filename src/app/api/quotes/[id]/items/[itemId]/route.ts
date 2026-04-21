import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { getApiAuth } from "@/app/api/_auth";
import { getOrgIdForApiOrThrow } from "@/app/api/_org";
import { requireQuotePermission } from "@/libs/quotePermission";
import {
  calcLineTotal,
  calcQuoteGrandTotal,
  calcQuoteSubTotal,
} from "@/libs/quoteCalc";

type RouteContext = {
  params: Promise<{
    id: string;
    itemId: string;
  }>;
};

async function recomputeQuoteTotals(quoteId: string) {
  const quote = await prismadb.quote.findUnique({
    where: { id: quoteId },
    select: {
      id: true,
      discountPercent: true,
      discountAmount: true,
      shippingFee: true,
      taxPercent: true,
      householdTaxPercent: true,
    },
  });

  if (!quote) {
    throw new Error("Quote not found");
  }

  const quoteItems = await prismadb.quoteItem.findMany({
    where: { quoteId },
    select: {
      lineTotal: true,
    },
  });

  const subTotal = calcQuoteSubTotal(quoteItems);

  const totals = calcQuoteGrandTotal({
    subTotal,
    discountPercent: quote.discountPercent,
    discountAmount: quote.discountAmount,
    shippingFee: quote.shippingFee,
    taxPercent: quote.taxPercent,
    householdTaxPercent: quote.householdTaxPercent,
  });

  return prismadb.quote.update({
    where: { id: quoteId },
    data: {
      subTotal: totals.subTotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      householdTaxAmount: totals.householdTaxAmount,
      grandTotal: totals.grandTotal,
    },
    select: {
      id: true,
      subTotal: true,
      discountAmount: true,
      taxAmount: true,
      householdTaxAmount: true,
      grandTotal: true,
    },
  });
}

function mapErrorStatus(message: string) {
  if (
    message === "Missing bearer token" ||
    message === "Invalid token" ||
    message === "Unauthorized"
  ) {
    return 401;
  }

  if (
    message === "Not a member of this org" ||
    message.startsWith("Permission denied")
  ) {
    return 403;
  }

  if (
    message === "Only DRAFT quote can be edited" ||
    message === "Invalid quantity" ||
    message === "Invalid unitPrice"
  ) {
    return 400;
  }

  return 500;
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const auth = await getApiAuth(req);
    if (!auth.userId) {
      return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
    }

    const { orgId } = await getOrgIdForApiOrThrow(req, auth.userId);

    await requireQuotePermission({
      orgId,
      userId: auth.userId,
      allowRoles: ["OWNER", "ADMIN"],
      allowPermissions: ["QUOTE_CREATE"],
    });

    const { id: quoteId, itemId } = await params;
    const body = await req.json();

    const quote = await prismadb.quote.findFirst({
      where: {
        id: quoteId,
        orgId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    if (quote.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only DRAFT quote can be edited" },
        { status: 400 }
      );
    }

    const item = await prismadb.quoteItem.findFirst({
      where: {
        id: itemId,
        quoteId,
      },
      select: {
        id: true,
        nameVi: true,
        nameEn: true,
        size: true,
        unit: true,
        sku: true,
        quantity: true,
        unitPrice: true,
        lineTotal: true,
        note: true,
        imageUrl: true,
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Quote item not found" }, { status: 404 });
    }

    const quantity =
      typeof body.quantity === "number"
        ? body.quantity
        : Number(body.quantity ?? item.quantity);

    const unitPrice =
      typeof body.unitPrice === "number"
        ? body.unitPrice
        : Number(body.unitPrice ?? item.unitPrice);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return NextResponse.json({ error: "Invalid unitPrice" }, { status: 400 });
    }

    const lineTotal = calcLineTotal({ quantity, unitPrice });

    const updatedItem = await prismadb.quoteItem.update({
      where: { id: itemId },
      data: {
        nameVi: typeof body.nameVi === "string" ? body.nameVi.trim() : item.nameVi,
        nameEn: typeof body.nameEn === "string" ? body.nameEn.trim() : item.nameEn,
        size:
          body.size === null
            ? null
            : typeof body.size === "string"
            ? body.size.trim()
            : item.size,
        unit:
          body.unit === null
            ? null
            : typeof body.unit === "string"
            ? body.unit.trim()
            : item.unit,
        sku: typeof body.sku === "string" ? body.sku.trim() : item.sku,
        quantity,
        unitPrice,
        lineTotal,
        note:
          body.note === null
            ? null
            : typeof body.note === "string"
            ? body.note
            : item.note,
        imageUrl:
          body.imageUrl === null
            ? null
            : typeof body.imageUrl === "string"
            ? body.imageUrl
            : item.imageUrl,
      },
      select: {
        id: true,
        nameVi: true,
        nameEn: true,
        size: true,
        unit: true,
        sku: true,
        quantity: true,
        unitPrice: true,
        lineTotal: true,
        note: true,
        imageUrl: true,
        productId: true,
        variantId: true,
      },
    });

    const updatedQuote = await recomputeQuoteTotals(quoteId);

    return NextResponse.json({
      ok: true,
      item: updatedItem,
      quote: updatedQuote,
    });
  } catch (error: any) {
    const message = error?.message || "Failed to update quote item";
    return NextResponse.json(
      { error: message },
      { status: mapErrorStatus(message) }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const auth = await getApiAuth(req);
    if (!auth.userId) {
      return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
    }

    const { orgId } = await getOrgIdForApiOrThrow(req, auth.userId);

    await requireQuotePermission({
      orgId,
      userId: auth.userId,
      allowRoles: ["OWNER", "ADMIN"],
      allowPermissions: ["QUOTE_CREATE"],
    });

    const { id: quoteId, itemId } = await params;

    const quote = await prismadb.quote.findFirst({
      where: {
        id: quoteId,
        orgId,
      },
      select: { id: true, status: true },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    if (quote.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only DRAFT quote can be edited" },
        { status: 400 }
      );
    }

    const item = await prismadb.quoteItem.findFirst({
      where: {
        id: itemId,
        quoteId,
      },
      select: { id: true },
    });

    if (!item) {
      return NextResponse.json({ error: "Quote item not found" }, { status: 404 });
    }

    await prismadb.quoteItem.delete({
      where: { id: itemId },
    });

    const updatedQuote = await recomputeQuoteTotals(quoteId);

    return NextResponse.json({
      ok: true,
      quote: updatedQuote,
    });
  } catch (error: any) {
    const message = error?.message || "Failed to delete quote item";
    return NextResponse.json(
      { error: message },
      { status: mapErrorStatus(message) }
    );
  }
}