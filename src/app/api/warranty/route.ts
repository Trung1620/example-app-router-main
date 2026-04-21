import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);

    const warrantyModel = (prismadb as any).warranty || (prismadb as any).Warranty;
    
    if (!warrantyModel) {
      return NextResponse.json({ warranties: [] });
    }

    const warranties = await warrantyModel.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { name: true, phone: true } },
        product: { select: { nameVi: true, sku: true } }
      }
    });

    return NextResponse.json({ warranties });
  } catch (error: any) {
    console.error("[WARRANTY_GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);
    const body = await req.json();
    const { 
      customerId, 
      productId, 
      issue, 
      note, 
      status,
      receivedDate,
      returnDate
    } = body;

    const warrantyModel = (prismadb as any).warranty || (prismadb as any).Warranty;
    
    if (!warrantyModel) {
      return NextResponse.json({ error: "Warranty model not found in Prisma" }, { status: 500 });
    }

    const warranty = await warrantyModel.create({
      data: {
        orgId,
        customerId: customerId || null,
        productId: productId || null,
        issue,
        note,
        status: status || "PENDING",
        receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
        returnDate: returnDate ? new Date(returnDate) : null,
      }
    });

    return NextResponse.json({ warranty }, { status: 201 });
  } catch (error: any) {
    console.error("[WARRANTY_POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
