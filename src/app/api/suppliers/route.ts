import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);
    
    const suppliers = await prismadb.supplier.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
    });
    
    return NextResponse.json(suppliers);
  } catch (error: any) {
    console.error("GET Suppliers Error:", error);
    return new NextResponse(error.message || "Lỗi server", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);
    const body = await req.json();
    
    const { code, name, phone, email, address, taxId, debt, groupName, status, note, companyName } = body;
    
    const supplier = await prismadb.supplier.create({
      data: {
        orgId,
        code,
        name,
        phone,
        email,
        address,
        taxId,
        groupName: groupName || "MATERIAL",
        status: status || "ACTIVE",
        note,
        companyName
      }
    });
    
    return NextResponse.json(supplier);
  } catch (error: any) {
    console.error("POST Supplier Error:", error);
    return new NextResponse(error.message || "Lỗi server", { status: 500 });
  }
}
