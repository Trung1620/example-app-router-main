import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);

    const jobSheetModel = (prismadb as any).jobSheet || (prismadb as any).JobSheet;
    
    if (!jobSheetModel) {
      return NextResponse.json({ jobSheets: [] });
    }

    const jobSheets = await jobSheetModel.findMany({
      where: { orgId },
      include: {
        artisan: { select: { name: true } },
        product: { select: { nameVi: true, sku: true } },
        order: { select: { orderNumber: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ jobSheets });
  } catch (error: any) {
    console.error("[JOB_SHEETS_GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);
    const body = await req.json();
    const { 
      artisanId, 
      productId, 
      orderId,
      quantity, 
      unitPrice,
      startDate,
      endDate
    } = body;

    const jobSheetModel = (prismadb as any).jobSheet || (prismadb as any).JobSheet;
    
    if (!jobSheetModel) {
      return NextResponse.json({ error: "JobSheet model not found in Prisma" }, { status: 500 });
    }

    const jobSheet = await jobSheetModel.create({
      data: {
        orgId,
        artisanId,
        productId,
        orderId: orderId || null,
        quantity: parseInt(quantity),
        unitPrice: parseFloat(unitPrice || 0),
        totalAmount: parseInt(quantity) * parseFloat(unitPrice || 0),
        status: "OPEN",
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
      }
    });

    return NextResponse.json({ jobSheet }, { status: 201 });
  } catch (error: any) {
    console.error("[JOB_SHEETS_POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
