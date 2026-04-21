import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);
    
    const customers = await prismadb.customer.findMany({ where: { orgId } });
    const suppliers = await prismadb.supplier.findMany({ where: { orgId } });
    const artisans = await prismadb.artisan.findMany({ where: { orgId } });
    
    const customerDebt = customers.reduce((sum, c) => sum + (c.currentDebt || 0), 0);
    const supplierDebt = suppliers.reduce((sum, s) => sum + ((s as any).debt || 0), 0);
    const artisanDebt = artisans.reduce((sum, a) => sum + (a.debt || 0), 0);

    return NextResponse.json({
      customerDebt,
      supplierDebt,
      artisanDebt,
      totalReceivable: customerDebt,
      totalPayable: supplierDebt + artisanDebt,
    });
  } catch (error: any) {
    console.error("GET ReportDebts Error:", error);
    return new NextResponse(error.message || "Lỗi server", { status: 500 });
  }
}
