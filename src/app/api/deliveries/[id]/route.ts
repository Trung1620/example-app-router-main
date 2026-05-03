import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const { orgId } = await requireApiContext(req);

    const delivery = await prismadb.delivery.findFirst({
      where: { id, orgId },
      include: {
        warehouse: true,
        quote: true
      }
    });

    if (!delivery) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(delivery);
  } catch (error) {
    console.error("[DELIVERY_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const { orgId } = await requireApiContext(req);
    const body = await req.json();
    const { 
      number, carrier, vehicleType, carrierType, 
      vehicleNumber, trackingNumber,
      receiverName, receiverPhone, customerId, driverName, driverPhone, 
      shippingCost, note, image, status 
    } = body;

    // First ensure it belongs to the org
    const existed = await prismadb.delivery.findFirst({
      where: { id, orgId },
      select: { id: true }
    });

    if (!existed) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prismadb.delivery.update({
      where: { id },
      data: {
        ...(number !== undefined && { number }),
        ...(carrier !== undefined && { carrier }),
        ...(vehicleType !== undefined && { vehicleType }),
        ...(carrierType !== undefined && { carrierType }),
        ...(vehicleNumber !== undefined && { vehicleNumber }),
        ...(trackingNumber !== undefined && { trackingNumber }),
        ...(receiverName !== undefined && { receiverName }),
        ...(receiverPhone !== undefined && { receiverPhone }),
        ...(customerId !== undefined && { customerId }),
        ...(driverName !== undefined && { driverName }),
        ...(driverPhone !== undefined && { driverPhone }),
        ...(shippingCost !== undefined && { shippingCost: parseFloat(shippingCost) || 0 }),
        ...(note !== undefined && { note }),
        ...(image !== undefined && { image }),
        ...(status !== undefined && { status }),
      } as any
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[DELIVERY_PATCH]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const { orgId } = await requireApiContext(req);

    const existed = await prismadb.delivery.findFirst({
      where: { id, orgId },
      select: { id: true }
    });

    if (!existed) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prismadb.delivery.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELIVERY_DELETE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
