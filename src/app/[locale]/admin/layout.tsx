// src/app/[locale]/admin/layout.tsx
import { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { locales, type AppLocale } from '@/i18n';

import AdminNav from '../components/admin/AdminNav';

type Props = {
  children: ReactNode;
  // 👇 Mở rộng theo đúng type của Next: locale là string
  params: Promise<{
    locale: string;
  }>;
};

export const dynamicParams = false;

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function AdminLayout({ children, params }: Props) {
  // ✅ await params theo yêu cầu mới của Next
  const resolved = await params;
  const localeStr = resolved.locale;

  // ✅ Thu hẹp về AppLocale bằng runtime check
  if (!locales.includes(localeStr as AppLocale)) {
    notFound();
  }

  const locale = localeStr as AppLocale;

  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex flex-col min-h-screen">
        <AdminNav />
        <main className="flex-grow">{children}</main>
      </div>
    </NextIntlClientProvider>
  );
}
