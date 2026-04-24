import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { orgId } = await requireApiContext(req);

    // Xóa phiếu gia công
    // Lưu ý: Trong thực tế bạn có thể cần kiểm tra xem phiếu đã có báo cáo tiến độ chưa trước khi xóa
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
      const { status, quantity, unitPrice, artisanId, productId } = body;
  
      const updated = await prismadb.jobSheet.updateMany({
        where: { id, orgId },
        data: {
          ...(status && { status }),
          ...(quantity !== undefined && { quantity: parseInt(quantity) }),
          ...(unitPrice !== undefined && { unitPrice: parseFloat(unitPrice) }),
          ...(artisanId && { artisanId }),
          ...(productId && { productId }),
        },
      });
  
      return NextResponse.json(updated);
    } catch (error: any) {
      return new NextResponse(error.message || "Internal Error", { status: 500 });
    }
}
