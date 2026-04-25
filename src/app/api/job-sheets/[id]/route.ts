import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { orgId } = await requireApiContext(req);

    const jobSheet = await prismadb.jobSheet.findFirst({
      where: { id, orgId },
      include: {
        artisan: { select: { id: true, name: true } },
        product: { select: { id: true, nameVi: true, sku: true } }
      }
    });

    if (!jobSheet) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(jobSheet);
  } catch (error: any) {
    console.error("GET JobSheet Error:", error);
    return new NextResponse(error.message || "Internal Error", { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { orgId } = await requireApiContext(req);

    // Xóa phiếu gia công
    await prismadb.jobSheet.deleteMany({
      where: { id, orgId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE JobSheet Error:", error);
    return new NextResponse(error.message || "Internal Error", { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const { id } = await params;
      const { orgId } = await requireApiContext(req);
      const body = await req.json();
      const { status, quantity, unitPrice, artisanId, productId, startDate, endDate } = body;
  
      await prismadb.jobSheet.updateMany({
        where: { id, orgId },
        data: {
          ...(status && { status }),
          ...(quantity !== undefined && { quantity: parseInt(quantity) }),
          ...(unitPrice !== undefined && { unitPrice: parseFloat(unitPrice) }),
          ...(artisanId && { artisanId }),
          ...(productId && { productId }),
          ...(startDate && { startDate: new Date(startDate) }),
          ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        },
      });

      const updated = await prismadb.jobSheet.findFirst({
        where: { id, orgId }
      });
  
      return NextResponse.json(updated);
    } catch (error: any) {
      console.error("PATCH JobSheet Error:", error);
      return new NextResponse(error.message || "Internal Error", { status: 500 });
    }
}

