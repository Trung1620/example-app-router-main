// src/app/api/quotes/[id]/payments/route.ts
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const Body = z.object({
  amount: z.number().positive(),
  method: z.enum(["CASH", "BANK", "OTHER"]).default("BANK"),
  note: z.string().optional(),
  paidAt: z.string().datetime().optional(),
});

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { orgId } = await requireApiContext(req);
  const { id: quoteId } = await ctx.params;

  const items = await prismadb.payment.findMany({
    where: { orgId, quoteId } as any,
    orderBy: { paidAt: "desc" } as any,
  });

  const sum = items.reduce((s, x: any) => s + Number(x.amount || 0), 0);

  return NextResponse.json({ items, sum });
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { orgId } = await requireApiContext(req);
  const { id: quoteId } = await ctx.params;

  const quote = await prismadb.quote.findFirst({
    where: { id: quoteId, orgId } as any,
    select: { id: true, grandTotal: true },
  });

  if (!quote) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const created = await prismadb.payment.create({
    data: {
      orgId,
      quoteId,
      amount: parsed.data.amount,
      method: parsed.data.method as any,
      note: parsed.data.note,
      paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : undefined,
    } as any,
  });

  return NextResponse.json(created, { status: 201 });
}
