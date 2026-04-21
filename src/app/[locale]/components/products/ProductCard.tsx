'use client';

import Link from 'next/link';
import Image from 'next/image';
import {useLocale, useTranslations} from 'next-intl';
import {formatSinglePrice} from '@/utils/formatPrice';
import type {ProductWithImages} from '@/types/ProductWithImages';
import {BadgeDollarSign, Ruler, Palette, Layers} from 'lucide-react';

interface ProductCardProps {
  data: ProductWithImages;
}

export default function ProductCard({data}: ProductCardProps) {
  const locale = useLocale();
  const t = useTranslations('Product');

  const name = (locale === 'vi' ? data.nameVi : data.nameEn) ?? t('noName');
  const price = locale === 'vi' ? (data.priceVnd ?? 0) : (data.priceUsd ?? 0);
  const imageUrl = data.images?.[0]?.url || '/placeholder.png';

  const sizeText = data.size ?? t('noSize');

  // fallback text (không dùng key mới để tránh typed error)
  const fallbackColor = locale === 'vi' ? 'Chưa có màu' : 'No color';
  const fallbackMaterial =
    locale === 'vi' ? 'Chưa có chất liệu' : 'No material';

  const colorText = (
    Array.isArray((data as any).colors) && (data as any).colors?.length
      ? (data as any).colors.join(', ')
      : ((data as any).color ?? fallbackColor)
  ) as string;

  const materialText =
    (data as any).material ?? (data as any).category ?? fallbackMaterial;

  return (
    <div
      className="group relative rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col h-full
                bg-white hover:bg-teal-50/60"
    >
      {' '}
      {/* Cover */}
      <Link href={`/${locale}/product/${data.id}`} className="block relative">
        <div className="relative w-full aspect-16/11 bg-gray-100 overflow-hidden">
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>
      </Link>
      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        {/* Title */}
        <Link href={`/${locale}/product/${data.id}`} className="block">
          <h3 className="text-[15px] sm:text-base font-semibold leading-snug line-clamp-2 group-hover:text-teal-700 transition-colors min-h-[44px]">
            {name}
          </h3>
        </Link>

        {/* Meta */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-gray-600">
          <span className="inline-flex items-center gap-1">
            <BadgeDollarSign size={16} className="opacity-70" />
            <span className="font-semibold text-gray-900">
              {formatSinglePrice(price, locale)}
            </span>
          </span>

          <span className="inline-flex items-center gap-1">
            <Ruler size={16} className="opacity-70" />
            <span className="line-clamp-1">{sizeText}</span>
          </span>

          <span className="inline-flex items-center gap-1">
            <Palette size={16} className="opacity-70" />
            <span className="line-clamp-1">{colorText}</span>
          </span>

          <span className="inline-flex items-center gap-1">
            <Layers size={16} className="opacity-70" />
            <span className="line-clamp-1">{materialText}</span>
          </span>
        </div>

        {/* Button luôn nằm đáy */}
        <div className="mt-auto pt-3">
          <Link href={`/${locale}/product/${data.id}`} className="block">
            <button
              className="w-full h-10 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium
                       hover:border-gray-400 hover:bg-gray-50 transition-colors"
            >
              {locale === 'vi' ? 'Xem chi tiết' : 'View details'}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
