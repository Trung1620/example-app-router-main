'use client'

import { formatSinglePrice } from "@/utils/formatPrice";
import { formatNumber } from "@/utils/formatNumber";
import { DashboardAnalyticsData } from "@/actions/getDashboardAnalytics";

interface SummaryProps {
  data: DashboardAnalyticsData;
}

const Summary: React.FC<SummaryProps> = ({ data }) => {
  const summaryData = [
    {
      label: 'Doanh thu',
      digit: data.revenue,
      isPrice: true,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      label: 'Lợi nhuận',
      digit: data.netProfit,
      isPrice: true,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    {
      label: 'Công nợ (Phải thu)',
      digit: data.debtTotal,
      isPrice: true,
      color: 'text-rose-600',
      bg: 'bg-rose-50'
    },
    {
      label: 'Giá trị tồn kho',
      digit: data.inventoryValue,
      isPrice: true,
      color: 'text-amber-600',
      bg: 'bg-amber-50'
    },
    {
      label: 'Đơn hàng (Quotes)',
      digit: data.orders,
      isPrice: false,
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
    {
      label: 'Hết hàng/Sắp hết',
      digit: data.lowStockCount,
      isPrice: false,
      color: 'text-gray-600',
      bg: 'bg-gray-50'
    },
  ];

  return (
    <div className="mx-auto max-w-[1150px]">
      <div className="mb-4">
        <h2 className="text-xl font-bold">Thống kê cơ sở</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {summaryData.map((item) => (
          <div
            key={item.label}
            className={`flex flex-col rounded-2xl border p-6 transition hover:shadow-sm ${item.bg}`}
          >
            <div className={`text-2xl font-bold md:text-3xl ${item.color}`}>
              {item.isPrice ? formatSinglePrice(item.digit) : formatNumber(item.digit)}
            </div>
            <div className="mt-1 text-sm font-medium text-gray-600">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Summary;