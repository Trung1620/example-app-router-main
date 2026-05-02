import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);
    const { searchParams } = new URL(req.url);
    
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const period = searchParams.get("period") || "month";

    const now = new Date();
    let fromDate = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
    let toDate = to ? new Date(to) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    if (period === "day") {
      fromDate = new Date();
      fromDate.setHours(0, 0, 0, 0);
      toDate = new Date();
      toDate.setHours(23, 59, 59, 999);
    } else if (period === "week") {
      const day = now.getDay() || 7;
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
      fromDate.setHours(0, 0, 0, 0);
      toDate = new Date();
      toDate.setHours(23, 59, 59, 999);
    }

    const quoteModel = (prismadb as any).quote || (prismadb as any).Quote;
    const productionOrderModel = (prismadb as any).productionOrder || (prismadb as any).ProductionOrder;
    const progressModel = (prismadb as any).productionProgress || (prismadb as any).ProductionProgress;
    const expenseModel = (prismadb as any).expense || (prismadb as any).Expense;
    const debtModel = (prismadb as any).debt || (prismadb as any).Debt;

    // 1. Tính toán Doanh thu & Phiếu thu (Nguồn tiền vào từ khách)
    const allQuotes = await quoteModel.findMany({
      where: {
        orgId,
        createdAt: { gte: fromDate, lte: toDate },
        status: { in: ["CONFIRMED", "DELIVERING", "DONE"] }
      },
      select: { grandTotal: true, paymentStatus: true, createdAt: true }
    });

    const salesValue = allQuotes.reduce((acc: number, q: any) => acc + (q.grandTotal || 0), 0);
    const actualReceived = allQuotes.reduce((acc: number, q: any) => {
        if (q.paymentStatus === "PAID") return acc + q.grandTotal;
        if (q.paymentStatus === "PARTIAL") return acc + (q.grandTotal * 0.5); // Giả định thu 50%
        return acc;
    }, 0);

    // 2. Phân tách Chi phí từ các Phiếu chi thực tế (Cash-basis)
    let labor = 0;
    let material = 0;
    let manualExpensesTotal = 0;

    if (expenseModel) {
      const allExpenses = await expenseModel.findMany({
        where: { orgId, expenseDate: { gte: fromDate, lte: toDate } },
        select: { amount: true, title: true, category: true }
      });
      allExpenses.forEach((e: any) => {
        const titleLower = e.title?.toLowerCase() || "";
        if (titleLower.includes("nhập kho") || titleLower.includes("supplier") || e.category === "EQUIPMENT") {
          material += (e.amount || 0);
        } else if (titleLower.includes("tiền công gia công") || titleLower.includes("artisan") || e.category === "SALARY") {
          labor += (e.amount || 0);
        } else {
          manualExpensesTotal += (e.amount || 0);
        }
      });
    }

    const totalExpenses = labor + material + manualExpensesTotal;
    const revenue = actualReceived; // Coi tiền thực thu là doanh thu ghi nhận (Phiếu thu)

    // 4. Tính toán Công nợ Phải trả (Payable)
    let payable = 0;
    if (debtModel) {
      const allDebts = await debtModel.findMany({
        where: { 
          orgId, 
          type: "PAYABLE", 
          status: { not: "PAID_OFF" },
          createdAt: { gte: fromDate, lte: toDate }
        }
      });
      payable = allDebts.reduce((sum: number, d: any) => sum + ((d.amount || 0) - (d.paidAmount || 0)), 0);
    }

    // 4. Biểu đồ Tiền về (Cash-in)
    const cashInMap: Record<string, number> = {};
    allQuotes.forEach((q: any) => {
        if (q.paymentStatus === "PAID" || q.paymentStatus === "PARTIAL") {
            const dateKey = new Date(q.createdAt).toISOString().split("T")[0];
            const amount = q.paymentStatus === "PAID" ? q.grandTotal : q.grandTotal * 0.5;
            cashInMap[dateKey] = (cashInMap[dateKey] || 0) + (amount || 0);
        }
    });
    const chartData = Object.keys(cashInMap).sort().map(date => ({ date, amount: cashInMap[date] }));

    // 5. Tỷ trọng chi phí
    const totalForPie = (revenue + totalExpenses) || 1;
    const pieData = [
      { name: 'Lợi nhuận', amount: Math.max(0, revenue - totalExpenses), color: '#4CAF50' },
      { name: 'Tiền thợ', amount: labor, color: '#FF6B6B' },
      { name: 'Vật tư/Vận hành', amount: material + manualExpensesTotal, color: '#FFB300' },
    ].map(p => ({ ...p, percentage: Math.round((p.amount / totalForPie) * 100) || 0 }));

    return NextResponse.json({
      summary: {
        revenue: salesValue, // Tổng giá trị đơn hàng đã chốt
        actualReceived: actualReceived, // Tổng tiền thực thu (Phiếu thu)
        receivable: salesValue - actualReceived > 0 ? salesValue - actualReceived : 0,
        payable,
        expenses: totalExpenses,
        profit: actualReceived - totalExpenses,
        labor,
        material,
        manualExpenses: manualExpensesTotal,
        orderCount: allQuotes.length,
        orders: allQuotes.length,
        breakdown: {
          labor,
          material,
          manualExpenses: manualExpensesTotal,
          shipping: 0,
          otherProduction: 0
        }
      },
      pieData,
      chartData,
      virtualExpenses: [] // Đã chuyển sang Cash-basis, không cần expense ảo nữa
    });

  } catch (error: any) {
    console.error("DASHBOARD_ERROR", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
