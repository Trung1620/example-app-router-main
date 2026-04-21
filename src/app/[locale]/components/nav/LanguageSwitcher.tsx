'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';

const locales = ['en', 'vi'] as const;

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition(); // ✅ Bỏ isPending

  const currentLocale = pathname?.split('/')?.[1] || 'vi';

  const changeLocale = (nextLocale: string) => {
    if (nextLocale === currentLocale) return;

    const segments = pathname.split('/');
    segments[1] = nextLocale;
    const newPath = segments.join('/');

    startTransition(() => {
      router.replace(newPath);
    });
  };

  return (
    <select
      value={currentLocale}
      onChange={(e) => changeLocale(e.target.value)}
      className="border border-slate-300 rounded px-2 py-1 text-sm text-slate-700 bg-white shadow-sm focus:outline-none"
    >
      {locales.map((loc) => (
        <option key={loc} value={loc}>
          {loc === 'en' ? '🇺🇸 English' : '🇻🇳 Tiếng Việt'}
        </option>
      ))}
    </select>
  );
}
