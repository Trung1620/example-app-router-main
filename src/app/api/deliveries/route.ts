import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);

    const deliveries = await prismadb.delivery.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      include: {
        warehouse: true
      }
    });

    return NextResponse.json({ deliveries });
  } catch (error) {
    console.error("[DELIVERIES_GET]", error);
  }
}

export async function POST(req: NextRequest) {

  try {
    const { orgId } = await requireApiContext(req);
    const body = await req.json();
    const { 
      number, carrier, vehicleType, carrierType, 
      vehicleNumber, trackingNumber,
      receiverName, receiverPhone, customerId,
      driverName, driverPhone, 
      shippingCost, note, image, status 
    } = body;

    const delivery = await prismadb.delivery.create({
      data: {
        orgId,
        number: number || `DN-${Math.floor(Date.now() / 1000)}`,
        carrier: carrier || null,
        vehicleType: vehicleType || "motorcycle",
        carrierType: carrierType || "ghtk",
        vehicleNumber: vehicleNumber || null,
        trackingNumber: trackingNumber || null,
        receiverName: receiverName || null,
        receiverPhone: receiverPhone || null,
        customerId: customerId || null,
        driverName: driverName || null,
        driverPhone: driverPhone || null,
        shippingCost: parseFloat(shippingCost || 0),
        note: note || null,
        image: image || null,
        status: (status as any) || "PENDING",
        ...(body.quoteId ? { quoteId: body.quoteId } : {})
      } as any
    });

    return NextResponse.json({ delivery }, { status: 201 });
  } catch (error: any) {
    console.error("[DELIVERIES_POST]", error);
    const msg = error?.message || "";
    const status = msg.includes("Unauthorized") ? 401 : msg.includes("org") ? 400 : 500;
    return NextResponse.json({ error: msg || "Internal Error" }, { status });
  }
}
