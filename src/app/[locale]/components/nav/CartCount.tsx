'use client';

import { useCart } from "@/hooks/useCart";
import { useRouter } from "next/navigation";
import { CiShoppingCart } from "react-icons/ci";

type Props = {
  locale: string;
};

const CartCount = ({ locale }: Props) => {
  const { cartTotalQty } = useCart();
  const router = useRouter();

  return (
    <div
      className="relative cursor-pointer"
      onClick={() => router.push(`/${locale}/cart`)}
    >
      <div className="text-3xl">
        <CiShoppingCart />
      </div>
      <span
        className="absolute -top-2 -right-2 bg-slate-700 text-white h-5 w-5 rounded-full flex items-center justify-center text-xs"
      >
        {cartTotalQty}
      </span>
    </div>
  );
};

export default CartCount;
