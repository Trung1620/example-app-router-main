import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);
    
    // Revenue from paid quotes
    const quotes = await prismadb.quote.findMany({
      where: { orgId, status: "DONE" },
    });
    const totalRevenue = quotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0);

    // Expenses from manual expenses
    const expenses = await prismadb.expense.findMany({
      where: { orgId },
    });
    const manualExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Artisan salary payments
    const transactions = await prismadb.artisanTransaction.findMany({
      where: { orgId, type: { in: ["SALARY", "PAYMENT"] } }
    });
    const artisanExpenses = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalExpenses = manualExpenses + artisanExpenses;
    
    return NextResponse.json({
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      breakdown: {
        manualExpenses,
        artisanExpenses,
      }
    });
  } catch (error: any) {
    console.error("GET ReportProfitLoss Error:", error);
    return new NextResponse(error.message || "Lỗi server", { status: 500 });
  }
}
