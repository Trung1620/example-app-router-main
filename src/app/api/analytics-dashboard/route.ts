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

    // 1. Lấy dữ liệu từ Báo giá
    const quoteStats = await prismadb.quote.aggregate({
      where: { 
        orgId, 
        createdAt: { gte: fromDate, lte: toDate },
        status: { not: "DRAFT" }
      },
      _sum: { grandTotal: true, taxAmount: true, depositAmount: true },
      _count: { id: true }
    });

    // 2. Lấy tiền đã thanh toán từ các khoản thanh toán (QuotePayment)
    const paymentStats = await prismadb.quotePayment.aggregate({
      where: {
        orgId,
        createdAt: { gte: fromDate, lte: toDate }
      },
      _sum: { amount: true }
    });

    // 3. Lấy dữ liệu từ Sản xuất
    const productionStats = await prismadb.productionOrder.aggregate({
      where: { 
        orgId, 
        createdAt: { gte: fromDate, lte: toDate }
      },
      _sum: { totalLaborCost: true, totalMaterialCost: true }
    });

    const salesValue = quoteStats._sum?.grandTotal || 0;
    const taxes = quoteStats._sum?.taxAmount || 0;
    const labor = productionStats._sum?.totalLaborCost || 0;
    const material = productionStats._sum?.totalMaterialCost || 0;
    const paidByPayments = paymentStats._sum?.amount || 0;
    const paidByDeposits = quoteStats._sum?.depositAmount || 0;
    
    // Doanh thu = Tổng nguồn tiền thực nhận về
    const revenue = paidByDeposits + paidByPayments;
    
    // Nợ khách hàng (Phải thu) = Tổng giá trị đơn - Tổng tiền đã thu
    const receivable = salesValue - revenue;
    const payable = labor + taxes;

    // 4. Lấy dữ liệu biểu đồ tiền về (Cash-in) theo ngày (Lấy dữ liệu thô và gộp trong JS để tránh lỗi treo GroupBy)
    const [allPayments, allDeposits] = await Promise.all([
      prismadb.quotePayment.findMany({
        where: { orgId, createdAt: { gte: fromDate, lte: toDate } },
        select: { createdAt: true, amount: true }
      }),
      prismadb.quote.findMany({
        where: { orgId, createdAt: { gte: fromDate, lte: toDate } },
        select: { createdAt: true, depositAmount: true }
      })
    ]);

    // Gom dữ liệu theo ngày (YYYY-MM-DD)
    const cashInMap: Record<string, number> = {};
    allPayments.forEach(p => {
      const dateKey = p.createdAt.toISOString().split("T")[0];
      cashInMap[dateKey] = (cashInMap[dateKey] || 0) + (p.amount || 0);
    });
    allDeposits.forEach(d => {
      const dateKey = d.createdAt.toISOString().split("T")[0];
      cashInMap[dateKey] = (cashInMap[dateKey] || 0) + (d.depositAmount || 0);
    });

    const chartData = Object.keys(cashInMap).sort().map(date => ({
      date,
      amount: cashInMap[date]
    }));

    // 5. Tính toán các chi phí "ảo" (từ sản xuất) để hiển thị trong báo cáo chi phí
    const virtualExpenses = [
      { id: 'labor-' + now.getTime(), title: 'Tiền công thợ (SX)', amount: labor, category: 'production', date: toDate, isProduction: true },
      { id: 'material-' + now.getTime(), title: 'Nguyên liệu (SX)', amount: material, category: 'production', date: toDate, isProduction: true },
    ];

    // Tính toán tỷ trọng % cho biểu đồ tròn (Xử lý thông minh khi doanh thu = 0)
    const absProfit = Math.max(0, revenue - labor - material - taxes);
    const totalForPie = (absProfit + labor + material + taxes) || 1;
    
    const percentages = {
      profit: Math.round((absProfit / totalForPie) * 100),
      labor: Math.round((labor / totalForPie) * 100),
      material: Math.round((material / totalForPie) * 100),
      taxes: Math.round((taxes / totalForPie) * 100),
    };

    // Chuẩn bị dữ liệu cho Biểu đồ tròn
    const pieData = [
      { name: 'Lợi nhuận', amount: absProfit, percentage: percentages.profit, color: '#4CAF50' },
      { name: 'Tiền thợ', amount: labor, percentage: percentages.labor, color: '#FF6B6B' },
      { name: 'Vật tư', amount: material, percentage: percentages.material, color: '#8d7b68' },
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
        orders: quoteStats._count?.id || 0,
        profit: revenue - labor - material - taxes,
        percentages
      },
      pieData,
      businessInsights: insights,
      virtualExpenses,
      chartData // Trả về số liệu tiền về thực tế theo ngày
    });

  } catch (error: any) {
    console.error("DASHBOARD_ERROR", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
