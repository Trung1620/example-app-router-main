"use client";

import { formatSinglePrice } from "@/utils/formatPrice";
import { truncateText } from "@/utils/truncateText";
import Image from "next/image";
import { useLocale } from "next-intl";

interface OrderItemProps {
  item: {
    id: string;
    name: string;
    quantity: number;
    price: number;
    selectedImg: {
      url: string;
      color: string;
    };
  };
}

const OrderItem: React.FC<OrderItemProps> = ({ item }) => {
  const locale = useLocale();

  return (
    <div className="grid grid-cols-5 text-xs md:text-sm gap-4 border-t-[1.5px] border-slate-200 py-4 items-center">
      <div className="col-span-2 justify-self-start flex gap-2 md:gap-4">
        <div className="relative w-[70px] aspect-square">
          <Image
            src={item.selectedImg.url}
            alt={item.name}
            fill
            className="object-contain"
          />
        </div>
        <div className="flex flex-col gap-1">
          <div>{truncateText(item.name)}</div>
          <div>{item.selectedImg.color}</div>
        </div>
      </div>
      <div className="justify-self-center">
        {formatSinglePrice(item.price, locale)}
      </div>
      <div className="justify-self-center">{item.quantity}</div>
      <div className="justify-self-end font-semibold">
        {formatSinglePrice(item.price * item.quantity, locale)}
      </div>
    </div>
  );
};

export default OrderItem;
