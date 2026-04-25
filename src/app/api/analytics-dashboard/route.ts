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

    // Xử lý ngày tháng bằng Vanilla JS (không dùng date-fns)
    const now = new Date();
    let fromDate = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
    let toDate = to ? new Date(to) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    if (period === "day") {
      fromDate = new Date();
      fromDate.setHours(0, 0, 0, 0);
      toDate = new Date();
      toDate.setHours(23, 59, 59, 999);
    } else if (period === "week") {
      const day = now.getDay() || 7; // 1-7 (Mon-Sun)
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
      fromDate.setHours(0, 0, 0, 0);
      toDate = new Date();
      toDate.setHours(23, 59, 59, 999);
    } else if (period === "quarter") {
      const q = Math.floor(now.getMonth() / 3);
      fromDate = new Date(now.getFullYear(), q * 3, 1);
      toDate = new Date(now.getFullYear(), (q + 1) * 3, 0);
    } else if (period === "year") {
      fromDate = new Date(now.getFullYear(), 0, 1);
      toDate = new Date(now.getFullYear(), 11, 31);
    }

    // 1. Lấy dữ liệu từ Báo giá (Dùng cách truy cập an toàn)
    const quoteModel = (prismadb as any).quote || (prismadb as any).Quote;
    const productionOrderModel = (prismadb as any).productionOrder || (prismadb as any).ProductionOrder;
    if (!quoteModel || typeof quoteModel.aggregate !== 'function') {
      console.error("Prisma Error: Quote model delegate or aggregate method not found", { 
        hasModel: !!quoteModel, 
        hasAggregate: !!(quoteModel && quoteModel.aggregate) 
      });
      return NextResponse.json({ error: "Hệ thống đang đồng bộ dữ liệu Báo giá. Vui lòng quay lại sau ít phút." }, { status: 500 });
    }

    const quoteStats = await quoteModel.aggregate({
      where: { 
        orgId, 
        createdAt: { gte: fromDate, lte: toDate },
        status: { not: "DRAFT" }
      },
      _sum: { grandTotal: true },
      _count: { id: true }
    });

    // 2. Doanh thu tạm tính từ các đơn đã thanh toán
    const revenueStats = await quoteModel.aggregate({
      where: {
        orgId,
        createdAt: { gte: fromDate, lte: toDate },
        paymentStatus: "PAID"
      },
      _sum: { grandTotal: true }
    });

    // 3. Lấy dữ liệu từ Sản xuất
    let productionStats = { _sum: { totalLaborCost: 0, totalMaterialCost: 0 } };
    if (productionOrderModel && typeof productionOrderModel.aggregate === 'function') {
      productionStats = await productionOrderModel.aggregate({
        where: { 
          orgId, 
          createdAt: { gte: fromDate, lte: toDate }
        },
        _sum: { totalLaborCost: true, totalMaterialCost: true }
      });
    }

    // 4. Lấy dữ liệu chi phí thủ công (Manual Expenses)
    const expenseModel = (prismadb as any).expense || (prismadb as any).Expense;
    let manualExpensesTotal = 0;
    if (expenseModel && typeof expenseModel.aggregate === 'function') {
      const manualStats = await expenseModel.aggregate({
        where: {
          orgId,
          expenseDate: { gte: fromDate, lte: toDate }
        },
        _sum: { amount: true }
      });
      manualExpensesTotal = manualStats._sum?.amount || 0;
    }

    const salesValue = quoteStats._sum?.grandTotal || 0;
    const taxes = 0; // taxAmount không tồn tại trong schema
    const labor = productionStats._sum?.totalLaborCost || 0;
    const material = productionStats._sum?.totalMaterialCost || 0;
    const revenue = revenueStats._sum?.grandTotal || 0;
    
    // Nợ khách hàng (Phải thu) = Tổng giá trị đơn - Tổng tiền đã thu
    const receivable = salesValue - revenue;
    const totalExpenses = labor + material + taxes + manualExpensesTotal;
    const payable = labor + taxes;

    // 5. Lấy dữ liệu biểu đồ tiền về (Cash-in) theo ngày
    const allPaidQuotes = await quoteModel.findMany({
      where: { 
        orgId, 
        createdAt: { gte: fromDate, lte: toDate },
        paymentStatus: "PAID"
      },
      select: { createdAt: true, grandTotal: true }
    }) || [];

    // Gom dữ liệu theo ngày (YYYY-MM-DD)
    const cashInMap: Record<string, number> = {};
    allPaidQuotes.forEach((q: any) => {
      if (q.createdAt) {
        try {
          const dateKey = new Date(q.createdAt).toISOString().split("T")[0];
          cashInMap[dateKey] = (cashInMap[dateKey] || 0) + (q.grandTotal || 0);
        } catch (err) {
          console.error("Date formatting error in analytics", err);
        }
      }
    });

    const chartData = Object.keys(cashInMap).sort().map(date => ({
      date,
      amount: cashInMap[date]
    }));

    // 6. Tính toán các chi phí "ảo" (từ sản xuất) để hiển thị trong báo cáo chi phí
    const virtualExpenses = [
      { id: 'labor-' + now.getTime(), title: 'Tiền công thợ (SX)', amount: labor, category: 'production', date: toDate, isProduction: true },
      { id: 'material-' + now.getTime(), title: 'Nguyên liệu (SX)', amount: material, category: 'production', date: toDate, isProduction: true },
    ];

    // Tính toán tỷ trọng % cho biểu đồ tròn (Xử lý thông minh khi doanh thu = 0)
    const absProfit = Math.max(0, revenue - labor - material - taxes - manualExpensesTotal);
    const totalForPie = (absProfit + labor + material + taxes + manualExpensesTotal) || 1;
    
    const percentages = {
      profit: Math.round((absProfit / totalForPie) * 100) || 0,
      labor: Math.round((labor / totalForPie) * 100) || 0,
      material: Math.round((material / totalForPie) * 100) || 0,
      manual: Math.round((manualExpensesTotal / totalForPie) * 100) || 0,
      taxes: Math.round((taxes / totalForPie) * 100) || 0,
    };

    // Chuẩn bị dữ liệu cho Biểu đồ tròn
    const pieData = [
      { name: 'Lợi nhuận', amount: absProfit, percentage: percentages.profit, color: '#4CAF50' },
      { name: 'Tiền thợ', amount: labor, percentage: percentages.labor, color: '#FF6B6B' },
      { name: 'Vật tư', amount: material, percentage: percentages.material, color: '#8d7b68' },
      { name: 'Chi phí khác', amount: manualExpensesTotal, percentage: percentages.manual, color: '#FFB300' },
      { name: 'Thuế', amount: taxes, percentage: percentages.taxes, color: '#78716C' },
    ];


    // Phân tích thông minh (Insights)
    let insights = "Dòng tiền đang ổn định.";
    if (percentages.labor > 40) insights = "Chi phí nhân công đang chiếm tỷ trọng lớn (>40%). Hãy tối ưu lại quy trình sản xuất.";
    if (percentages.profit < 10) insights = "Lợi nhuận đang ở mức thấp (<10%). Cần kiểm tra lại đơn giá vật tư.";

    return NextResponse.json({
      summary: {
        revenue, 
        salesValue,
        receivable: receivable > 0 ? receivable : 0,
        payable,
        labor,
        taxes,
        material,
        manualExpenses: manualExpensesTotal,
        expenses: totalExpenses,
        breakdown: {
          labor,
          material,
          manualExpenses: manualExpensesTotal,
          shipping: 0, // Placeholder
          otherProduction: 0 // Placeholder
        },
        orders: quoteStats._count?.id || 0,
        profit: revenue - totalExpenses,
        percentages
      },
      pieData,
      businessInsights: insights,
      virtualExpenses,
      chartData // Trả về số liệu tiền về thực tế theo ngày
    });


  } catch (error: any) {
    console.error("DASHBOARD_ERROR", error);
    return NextResponse.json({ error: error.message || "Failed to load dashboard data" }, { status: 500 });
  }
}
