'use client';

import { Order } from "@prisma/client";
import { formatSinglePrice } from "@/utils/formatPrice";
import { useLocale } from "next-intl";

interface OrderDetailsProps {
  order: Order;
}

export default function OrderDetails({ order }: OrderDetailsProps) {
  const locale = useLocale();

  return (
    <div className="space-y-4 text-sm md:text-base">
      <h2 className="text-xl font-semibold">Order Details</h2>

      <div>
        <span className="font-semibold">Order ID:</span> {order.id}
      </div>

      <div>
        <span className="font-semibold">Amount:</span>{" "}
        <span className="font-bold text-emerald-600">
          {formatSinglePrice(order.amount, locale)}
        </span>
      </div>

      <div>
        <span className="font-semibold">Currency:</span> {order.currency}
      </div>

      <div>
        <span className="font-semibold">Payment Status:</span>{" "}
        <span
          className={
            order.status === "complete" ? "text-green-600" : "text-orange-500"
          }
        >
          {order.status}
        </span>
      </div>

      <div>
        <span className="font-semibold">Delivery Status:</span>{" "}
        <span
          className={
            order.deliveryStatus === "delivered"
              ? "text-green-600"
              : "text-gray-600"
          }
        >
          {order.deliveryStatus || "Pending"}
        </span>
      </div>

      <div>
        <span className="font-semibold">Created At:</span>{" "}
        {new Date(order.createDate).toLocaleString(locale)}
      </div>

      {/* Có thể thêm danh sách sản phẩm trong đơn hàng ở đây nếu cần */}
    </div>
  );
}
