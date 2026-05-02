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

    // 2. Tính toán Chi phí nhân công (Tiền công thợ từ tiến độ thực tế)
    let jobSheetLabor = 0;
    if (progressModel) {
      const allProgress = await progressModel.findMany({
        where: { 
          orgId,
          createdAt: { gte: fromDate, lte: toDate }
        },
        include: { job: true }
      });
      jobSheetLabor = allProgress.reduce((acc: number, p: any) => acc + ((p.quantity || 0) * (p.job?.unitPrice || 0)), 0);
    }

    // 3. Tính toán Chi phí vận hành & Vật tư (Từ Phiếu chi thủ công và tự động)
    let manualExpensesTotal = 0;
    let materialExpenses = 0;
    if (expenseModel) {
      const allExpenses = await expenseModel.findMany({
        where: { orgId, expenseDate: { gte: fromDate, lte: toDate } },
        select: { amount: true, title: true }
      });
      allExpenses.forEach((e: any) => {
        if (e.title && e.title.includes("Nhập kho")) {
          materialExpenses += (e.amount || 0);
        } else {
          manualExpensesTotal += (e.amount || 0);
        }
      });
    }

    const labor = jobSheetLabor;
    const material = materialExpenses;
    const totalExpenses = labor + material + manualExpensesTotal;
    const revenue = actualReceived; // Coi tiền thực thu là doanh thu ghi nhận (Phiếu thu)

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
    ];

    return NextResponse.json({
      summary: {
        revenue: salesValue, // Tổng giá trị đơn hàng đã chốt
        actualReceived: actualReceived, // Tổng tiền thực thu (Phiếu thu)
        receivable: salesValue - actualReceived > 0 ? salesValue - actualReceived : 0,
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
      virtualExpenses: [
        { id: 'labor-' + now.getTime(), title: 'Tiền công thợ (SX)', amount: labor, category: 'production', date: toDate, isProduction: true },
        { id: 'ops-' + now.getTime(), title: 'Vận hành & Vật tư', amount: manualExpensesTotal + material, category: 'operating', date: toDate, isProduction: false },
      ]
    });

  } catch (error: any) {
    console.error("DASHBOARD_ERROR", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
