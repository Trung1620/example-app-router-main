const currencyMap: Record<string, string> = {
  vi: 'VND',
  en: 'USD',
  ja: 'JPY',
  de: 'EUR',
  fr: 'EUR',
  zh: 'CNY',
};

export const formatPrice = (
  priceObj: Record<string, number | undefined>,
  locale: string = 'vi'
): string => {
  const fallbackLocale = 'en';
  const currency = currencyMap[locale] || currencyMap[fallbackLocale];

  const amount = priceObj[locale] ?? priceObj[fallbackLocale];

  if (typeof amount !== 'number' || isNaN(amount)) return 'N/A';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'VND' || currency === 'JPY' ? 0 : 2,
  }).format(amount);
};
export const formatSinglePrice = (
  amount: number,
  locale: string = 'vi'
): string => {
  const fallbackLocale = 'en';
  const currency = currencyMap[locale] || currencyMap[fallbackLocale];

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'VND' ? 0 : 2,
  }).format(amount);
};
