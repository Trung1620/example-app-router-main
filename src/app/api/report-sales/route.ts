import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function GET(req: NextRequest) {
  try {
    const { orgId, member } = await requireApiContext(req);

    if (member.role === "STAFF") {
       return NextResponse.json({ error: "Chỉ quản lý mới có quyền xem báo cáo doanh số" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from"); // ISO date string
    const to = searchParams.get("to");     // ISO date string

    const now = new Date();
    const dateFrom = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
    const dateTo = to ? new Date(to) : now;

    const [quotes, payments, topProducts] = await Promise.all([
      // Danh sách quotes trong kỳ
      prismadb.quote.findMany({
        where: {
          orgId,
          createdAt: { gte: dateFrom, lte: dateTo },
        },
        select: {
          id: true,
          number: true,
          status: true,
          grandTotal: true,
          subTotal: true,
          discountAmount: true,
          taxAmount: true,
          shippingFee: true,
          depositAmount: true,
          currency: true,
          createdAt: true,
          customer: { select: { name: true, companyName: true } },
          items: {
            select: {
              quantity: true,
              unitPrice: true,
              costPrice: true,
            }
          }
        },
        orderBy: { createdAt: "desc" },
      }),

      // Tổng tiền đã thu theo phương thức thanh toán
      prismadb.payment.groupBy({
        by: ["method"],
        where: {
          orgId,
          paidAt: { gte: dateFrom, lte: dateTo },
        },
        _sum: { amount: true },
        _count: true,
      }),

      // Top 10 sản phẩm bán nhiều nhất (theo doanh thu)
      prismadb.quoteItem.groupBy({
        by: ["sku", "nameVi"],
        where: {
          orgId,
          quote: {
            createdAt: { gte: dateFrom, lte: dateTo },
            status: { in: ["ACCEPTED", "CONVERTED"] },
          },
        },
        _sum: { quantity: true, lineTotal: true },
        orderBy: { _sum: { lineTotal: "desc" } },
        take: 10,
      }),
    ]);

    // Tổng hợp số liệu tài chính
    const summary = quotes.reduce(
      (acc, q) => {
        const isConfirmed = q.status === "ACCEPTED" || q.status === "CONVERTED";
        
        // Luôn cộng vào tổng giá trị (bao gồm cả bản nháp) để xem phễu bán hàng
        acc.totalValue += q.grandTotal;
        acc.totalCount += 1;

        if (isConfirmed) {
          acc.confirmedCount += 1;
          acc.revenue += q.grandTotal; // Doanh thu tổng (bao gồm thuế/ship)
          
          // Doanh thu thuần (chỉ tiền hàng sau chiết khấu)
          const netSales = (q.subTotal || 0) - (q.discountAmount || 0);
          acc.netSales += netSales;

          // Tính giá vốn (COGS)
          let orderCost = 0;
          q.items.forEach(item => {
            orderCost += (item.costPrice || 0) * item.quantity;
          });
          acc.totalCost += orderCost;
          
          acc.totalDiscount += (q.discountAmount || 0);
          acc.totalTax += (q.taxAmount || 0);
          acc.totalShipping += (q.shippingFee || 0);
        }
        return acc;
      },
      { 
        revenue: 0,          // Tổng doanh số (Grand Total)
        netSales: 0,         // Doanh thu thuần (Product Sales)
        confirmedCount: 0, 
        totalValue: 0,       // Tổng giá trị báo giá (tất cả trạng thái)
        totalCount: 0, 
        totalCost: 0,        // Giá vốn
        totalDiscount: 0,
        totalTax: 0,
        totalShipping: 0,
        receivable: 0,       // Công nợ khách hàng (Sẽ tính sau)
        grossProfit: 0,      // Lợi nhuận gộp (Sẽ tính sau)
        totalCollected: 0    // Thực nhận (Sẽ tính sau)
      }
    );

    // Tính công nợ = Doanh thu thuần - Tổng tiền đã cọc/thu
    // (Đây là logic đơn giản hóa cho báo cáo AI)
    summary.receivable = summary.revenue - summary.totalCollected; // Sẽ update totalCollected bên dưới

    // Tính lợi nhuận gộp = Doanh thu thuần - Giá vốn
    summary.grossProfit = summary.netSales - summary.totalCost;
    
    // Tính thực nhận (Tổng tiền cọc + Tổng tiền thanh toán thêm)
    const totalDeposits = quotes.reduce((sum, q) => {
      const isConfirmed = q.status === "ACCEPTED" || q.status === "CONVERTED";
      return sum + (isConfirmed ? (q.depositAmount || 0) : 0);
    }, 0);
    
    // Lấy thêm từ bảng QuotePayment (nếu có dùng)
    const quotePayments = await prismadb.quotePayment.aggregate({
      where: { orgId, createdAt: { gte: dateFrom, lte: dateTo } },
      _sum: { amount: true }
    });

    summary.totalCollected = totalDeposits + (quotePayments._sum?.amount || 0) + payments.reduce((sum, p) => sum + (p._sum?.amount || 0), 0);
    summary.receivable = Math.max(0, summary.revenue - summary.totalCollected);

    // Doanh thu theo ngày (Sử dụng biểu đồ doanh thu thuần để hợp lý hơn)
    const byDay: Record<string, number> = {};
    for (const q of quotes) {
      if (q.status !== "ACCEPTED" && q.status !== "CONVERTED") continue;
      const day = q.createdAt.toISOString().slice(0, 10);
      const netSales = (q.subTotal || 0) - (q.discountAmount || 0);
      byDay[day] = (byDay[day] ?? 0) + netSales;
    }
    const revenueByDay = Object.entries(byDay)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // --- PHÂN TÍCH AI NÂNG CAO ---
    const funnel = {
      draft: quotes.filter(q => q.status === "DRAFT").length,
      sent: quotes.filter(q => q.status === "SENT").length,
      accepted: quotes.filter(q => q.status === "ACCEPTED" || q.status === "CONVERTED").length,
      rejected: quotes.filter(q => q.status === "REJECTED").length,
    };

    const analysis: any = {
      conversionRate: summary.totalCount > 0 ? (summary.confirmedCount / summary.totalCount) * 100 : 0,
      aov: summary.confirmedCount > 0 ? summary.revenue / summary.confirmedCount : 0,
      profitMargin: summary.netSales > 0 ? (summary.grossProfit / summary.netSales) * 100 : 0,
      funnel,
      insights: [],
      suggestions: []
    };

    // 1. Phân tích logic AI cho Insight
    if (funnel.sent > funnel.accepted * 2) {
      analysis.insights.push({ 
        type: 'warning', 
        text: `Có ${funnel.sent} báo giá đang chờ nhưng chưa chốt. Khách hàng đang phân vân về giá hoặc thời gian giao hàng.` 
      });
    }

    if (analysis.profitMargin > 30) {
      analysis.insights.push({ 
        type: 'success', 
        text: "Biên lợi nhuận gộp đang rất tốt (>30%). Bạn có thể cân nhắc chạy khuyến mãi để chiếm lĩnh thêm thị trường." 
      });
    }

    const topProduct = topProducts[0];
    if (topProduct && (topProduct._sum?.quantity || 0) > 5) {
      analysis.insights.push({ 
        type: 'star', 
        text: `Sức hút mạnh từ "${topProduct.nameVi}". AI gợi ý nhập thêm nguyên liệu cho dòng này để tránh đứt hàng.` 
      });
    }

    // 2. Sinh gợi ý hành động mô phỏng AI (Dynamic Advice)
    if (analysis.conversionRate < 40) {
      analysis.suggestions.push(`Phân tích AI: Tỷ lệ chốt đơn thấp. Hãy thử chiến thuật "tặng kèm quà nhỏ" cho ${funnel.sent} báo giá đang treo để kích thích chốt ngay.`);
    }
    
    if (summary.receivable > summary.revenue * 0.4) {
      analysis.suggestions.push("Cảnh báo dòng tiền: Công nợ chiếm hơn 40% doanh thu. AI đề xuất thắt chặt quy định đặt cọc (tăng lên 50%) cho các đơn hàng mới.");
    }

    if (summary.totalDiscount > 0 && analysis.profitMargin < 15) {
      analysis.suggestions.push("Tối ưu lãi: Bạn đang chiết khấu cao trong khi biên lãi mỏng. AI khuyên nên dùng quà tặng thay vì giảm giá trực tiếp.");
    }
    
    analysis.suggestions.push(`Mở rộng: Khách hàng mua "${topProduct?.nameVi || 'Mây tre'}" thường quan tâm đến đồ decor mini. Hãy thử up-sell thêm nhóm này.`);

    return NextResponse.json({
      period: { from: dateFrom, to: dateTo },
      summary,
      analysis,
      revenueByDay,
      paymentsByMethod: payments,
      topProducts,
      quotes,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch sales report" }, { status: 500 });
  }
}
