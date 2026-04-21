import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { getApiAuth } from "@/app/api/_auth";
import { getOrgIdForApiOrThrow } from "@/app/api/_org";
import { requireQuotePermission } from "@/libs/quotePermission";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getNextCounterSeq(tx: any, counterId: string) {
  const existing = await tx.counter.findUnique({
    where: { id: counterId },
  });

  if (!existing) {
    await tx.counter.create({
      data: {
        id: counterId,
        seq: 1,
      },
    });
    return 1;
  }

  const updated = await tx.counter.update({
    where: { id: counterId },
    data: {
      seq: { increment: 1 },
      updated: new Date(),
    },
  });

  return updated.seq;
}

function makeDeliveryNumber(seq: number) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const running = String(seq).padStart(4, "0");
  return `DN-${yyyy}${mm}-${running}`;
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

  return 500;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
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

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const target = String(body?.target || "").trim();

    if (target !== "delivery") {
      return NextResponse.json(
        { error: "Current schema only supports convert to delivery" },
        { status: 400 }
      );
    }

    const quote = await prismadb.quote.findFirst({
      where: {
        id,
        orgId,
      },
      include: {
        items: {
          orderBy: {
            id: "asc",
          },
        },
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    if (!quote.items.length) {
      return NextResponse.json(
        { error: "Quote has no items" },
        { status: 400 }
      );
    }

    const existingDelivery = await prismadb.delivery.findFirst({
      where: {
        quoteId: quote.id,
        orgId,
      },
      select: {
        id: true,
        number: true,
        status: true,
        createdAt: true,
      },
    });

    if (existingDelivery) {
      return NextResponse.json({
        ok: true,
        alreadyConverted: true,
        type: "delivery",
        entity: existingDelivery,
      });
    }

    const result = await prismadb.$transaction(async (tx) => {
      const seq = await getNextCounterSeq(tx, `delivery:${orgId}`);
      const deliveryNumber = makeDeliveryNumber(seq);

      const delivery = await tx.delivery.create({
        data: {
          orgId,
          quoteId: quote.id,
          number: deliveryNumber,
          status: "DRAFT",
        },
        select: {
          id: true,
          quoteId: true,
          number: true,
          status: true,
          createdAt: true,
        },
      });

      for (const item of quote.items) {
        await tx.deliveryItem.create({
          data: {
            orgId,
            deliveryId: delivery.id,
            quoteItemId: item.id,
            qty: item.quantity,
          },
        });
      }

      await tx.quote.update({
        where: { id: quote.id },
        data: {
          status: "CONVERTED",
        },
      });

      return delivery;
    });

    return NextResponse.json({
      ok: true,
      type: "delivery",
      entity: result,
    });
  } catch (error: any) {
    const message = error?.message || "Failed to convert quote to delivery";
    return NextResponse.json(
      { error: message },
      { status: mapErrorStatus(message) }
    );
  }
}