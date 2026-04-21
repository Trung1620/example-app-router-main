import '@/globals.css';
import {ReactNode} from 'react';
import {notFound} from 'next/navigation';
import {getMessages} from 'next-intl/server';
import {NextIntlClientProvider} from 'next-intl';
import {locales, type AppLocale} from '@/i18n';

import NavBar from './components/nav/NavBar';
import Footer from './components/footer/Footer';
import CartProvider from '../../providers/CartProvider';
import {Toaster} from 'react-hot-toast';
import {Analytics} from '@vercel/analytics/next';

import getCurrentUser from '@/actions/getCurrentUser';

export const dynamic = 'force-dynamic';

type Props = {
  children: ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export async function generateStaticParams() {
  return locales.map((locale) => ({locale}));
}

export default async function LocaleLayout({children, params}: Props) {
  const resolved = await params;
  const localeStr = resolved.locale;

  if (!locales.includes(localeStr as AppLocale)) {
    notFound();
  }

  const locale = localeStr as AppLocale;

  const messages = await getMessages({locale});
  const currentUser = await getCurrentUser();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="text-slate-700">
        <Toaster />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <CartProvider>
            <div className="flex flex-col min-h-screen">
              <NavBar currentUser={currentUser} />
              <main className="flex-grow">{children}</main>
              <Footer />
            </div>
          </CartProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
