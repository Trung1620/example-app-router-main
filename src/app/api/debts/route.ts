import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // receivable | payable

    const results: any[] = [];

    // --- 1. LẤY CÔNG NỢ NHẬP THỦ CÔNG (Từ bảng Debt) ---
    const manualWhere: any = { orgId };
    if (type === "receivable" || type === "payable") manualWhere.type = type.toUpperCase();
    
    const manualDebts = await prismadb.debt.findMany({
      where: manualWhere,
      include: {
        customer: { select: { name: true } },
        artisan: { select: { name: true } },
        supplier: { select: { name: true } },
      },
      orderBy: { dueDate: "asc" },
    });
    results.push(...manualDebts);

    // --- 2. TỰ ĐỘNG TÍNH TOÁN NỢ PHẢI THU (Từ Quotes chưa thanh toán hết) ---
    if (!type || type === "receivable") {
      const pendingQuotes = await prismadb.quote.findMany({
        where: {
          orgId,
          status: { in: ["CONFIRMED", "DELIVERING"] },
          paymentStatus: { not: "PAID" },
        },
        include: {
          customer: { select: { name: true } },
        }
      });

      pendingQuotes.forEach(q => {
        const totalPaid = q.paymentStatus === "PAID" ? (q.grandTotal || 0) : 0;
        const remaining = (q.grandTotal || 0) - totalPaid;

        if (remaining > 100) {
          results.push({
            id: `q-${q.id}`,
            type: "RECEIVABLE",
            referenceType: "CUSTOMER",
            customer: { name: q.customer?.name || "Khách hàng" },
            amount: remaining,
            paidAmount: totalPaid,
            dueDate: q.updatedAt.toISOString().split('T')[0],
            status: "UNPAID", // Đúng theo DebtStatus enum
            note: `Tự động từ đơn hàng ${q.number}`,
            isAuto: true
          });
        }
      });
    }



    return NextResponse.json({ debts: results });
  } catch (error: any) {
    console.error("[Debts GET Error]", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch debts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);

    const body = await req.json();
    const { 
      type, 
      referenceType, referenceId,
      customerId, artisanId, supplierId,
      amount, paidAmount,
      dueDate, 
      status,
      note 
    } = body;

    if (!type || !amount || !dueDate) {
      return NextResponse.json({ error: "type, amount, dueDate are required" }, { status: 400 });
    }

    const debt = await prismadb.debt.create({
      data: {
        orgId,
        type: type.toUpperCase(),
        referenceType: (referenceType || "CUSTOMER") as any,
        referenceId: referenceId || null,
        customerId: customerId || null,
        artisanId: artisanId || null,
        supplierId: supplierId || null,
        amount: parseFloat(amount),
        paidAmount: parseFloat(paidAmount || 0),
        dueDate: new Date(dueDate),
        status: (status || "UNPAID") as any,
        note: note || null,
      },
    });

    return NextResponse.json({ debt }, { status: 201 });
  } catch (error: any) {
    console.error("[Debts POST Error]", error);
    return NextResponse.json({ error: error?.message || "Failed to create debt" }, { status: 500 });
  }
}