'use client';

import { useCart } from '@/hooks/useCart';
import Link from 'next/link';
import { MdArrowBack } from 'react-icons/md';
import Heading from '../components/Heading';
import Button from '../components/Button';
import ItemContent from './ItemContent';
import { formatSinglePrice } from '@/utils/formatPrice';
import { SafeUser } from '@/types';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface CartClientProps {
  currentUser: SafeUser | null;
}

const CartClient: React.FC<CartClientProps> = ({ currentUser }) => {
  const { cartProducts, handleClearCart, cartTotalAmount } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'vi';
  const t = useTranslations('Cart');

  if (!cartProducts || cartProducts.length === 0) {
    return (
      <div className="flex flex-col items-center">
        <div className="text-2xl">{t('empty')}</div>
        <div>
          <Link href={`/${locale}`}>
            <span className="text-slate-500 flex items-center gap-1 mt-2">
              <MdArrowBack />
              <span>{t('startShopping')}</span>
            </span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Heading title={t('title')} center />
      <div className="grid grid-cols-5 text-xs gap-4 pb-2 items-center mt-8">
        <div className="col-span-2 justify-self-start">{t('product')}</div>
        <div className="justify-self-center">{t('price')}</div>
        <div className="justify-self-center">{t('quantity')}</div>
        <div className="justify-self-end">{t('total')}</div>
      </div>
      <div>
        {cartProducts.map((item) => (
          <ItemContent key={item.id} item={item} />
        ))}
      </div>
      <div className="border-t-[1.5px] border-slate-200 py-4 flex justify-between gap-4">
        <div className="w-[90px]">
          <Button label={t('clear')} onClick={handleClearCart} small outline />
        </div>
        <div className="text-sm flex flex-col gap-1 items-start">
          <div className="flex justify-between w-full text-base font-semibold">
            <span>{t('subtotal')}</span>
            <span>{formatSinglePrice(cartTotalAmount, locale)}</span>
          </div>
          <p className="text-slate-500">{t('taxNote')}</p>
          <Button
            label={currentUser ? t('checkout') : t('loginToCheckout')}
            outline={!currentUser}
            onClick={() =>
              router.push(currentUser ? `/${locale}/checkout` : `/${locale}/login`)
            }
          />
          <Link href={`/${locale}`}>
            <span className="text-slate-500 flex items-center gap-1 mt-2">
              <MdArrowBack />
              <span>{t('continueShopping')}</span>
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CartClient;
