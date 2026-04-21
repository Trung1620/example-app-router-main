'use client';

import {useTranslations} from 'next-intl';

export default function ExportedCountries() {
  const t = useTranslations('Exportedcountries');

  // Mảng key cố định (literal)
  const countries = [
    { key: 'japan',    flag: '🇯🇵' },
    { key: 'usa',      flag: '🇺🇸' },
    { key: 'uk',       flag: '🇬🇧' },
    { key: 'korea',    flag: '🇰🇷' }, // sửa 'KO' -> '🇰🇷'
    { key: 'thailand', flag: '🇹🇭' },
    { key: 'china',    flag: '🇨🇳' }
  ] as const;

  // Lấy đúng kiểu tham số mà t() chấp nhận (union key theo messages)
  type TKey = Parameters<typeof t>[0];

  return (
    <div className="py-12 px-4 bg-[#f9f9f9]">
      <h2 className="text-2xl font-bold text-center mb-6">
        {t('title')}
      </h2>

      <div className="flex flex-wrap justify-center gap-4 text-lg font-medium text-gray-700">
        {countries.map(({ key, flag }) => (
          <span
            key={key}
            className="flex items-center gap-2 border px-4 py-2 rounded-full bg-white shadow-sm hover:shadow-md transition"
          >
            <span className="text-xl">{flag}</span>
            <span>{t(key as TKey)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
