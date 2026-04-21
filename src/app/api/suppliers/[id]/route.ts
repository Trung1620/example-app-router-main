import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { orgId } = await requireApiContext(req);
    const body = await req.json();
    
    const { code, name, phone, email, address, taxId, debt, groupName, status, note, companyName } = body;

    const supplier = await prismadb.supplier.updateMany({
      where: { id, orgId },
      data: {
        code, name, phone, email, address, taxId
      }
    });
    
    return NextResponse.json(supplier);
  } catch (error: any) {
    console.error("PATCH Supplier Error:", error);
    return new NextResponse(error.message || "Lỗi server", { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { orgId } = await requireApiContext(req);
    
    const supplier = await prismadb.supplier.deleteMany({
      where: { id, orgId }
    });
    
    return NextResponse.json(supplier);
  } catch (error: any) {
    console.error("DELETE Supplier Error:", error);
    return new NextResponse(error.message || "Lỗi server", { status: 500 });
  }
}
