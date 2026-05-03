import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { orgId } = await requireApiContext(req);

    const contract = await prismadb.quote.findFirst({
      where: { id, orgId },
      include: {
        customer: true,
        items: true,
      },
    });

    if (!contract) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Mapping sang format Hợp đồng
    const result = {
      ...contract,
      buyerName: contract.customer?.name || contract.customer?.companyName || "Khách lẻ",
      sellerCompanyName: "Kho Mây Tre (Hệ thống)",
      paymentTerms: "Thanh toán 100% khi giao hàng",
      deliveryTerms: "Giao hàng tận nơi",
    };

    return NextResponse.json(result);
  } catch (error: any) {
    return new NextResponse(error.message || "Internal Error", { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { orgId } = await requireApiContext(req);
    const body = await req.json();
    const { status, number, notes } = body;

    const updated = await prismadb.quote.updateMany({
      where: { id, orgId },
      data: {
        ...(status && { status }),
        ...(number && { number }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return new NextResponse(error.message || "Internal Error", { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { orgId } = await requireApiContext(req);

    await prismadb.quote.deleteMany({
      where: { id, orgId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE Quote Error:", error);
    return new NextResponse(error.message || "Internal Error", { status: 500 });
  }
}
