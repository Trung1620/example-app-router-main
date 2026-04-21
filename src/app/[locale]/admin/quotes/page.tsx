// src/app/[locale]/admin/quotes/page.tsx

import Link from 'next/link';
import Image from 'next/image';
import QRCode from 'qrcode';

import prismadb from '@/libs/prismadb';
import {getBaseUrl} from '@/utils/getBaseUrl';
import DeleteQuoteButton from '../../components/DeleteQuoteButton';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

async function makeQR(url: string) {
  return QRCode.toDataURL(url, {margin: 1, scale: 4});
}

type QuotesListPageProps = {
  params: Promise<{locale: string}>;
};

export default async function QuotesListPage({
  params,
}: QuotesListPageProps) {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'Admin.Quotes'});

  const orgId = await getOrgIdOrThrowServer();

  const base =
    (await getBaseUrl()) ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'http://localhost:3000';

  const items = await prismadb.quote.findMany({
    where: {orgId},
    orderBy: {createdAt: 'desc'},
  });

  const cards = await Promise.all(
    items.map(async (q) => {
      const publicUrl = `${base}/${locale}/q/${q.id}`;
      const qr = await makeQR(publicUrl);

      return (
        <div key={q.id} className="border rounded p-3 space-y-2 bg-white">
          <div className="flex justify-between items-center gap-3">
            <div className="min-w-0">
              <Link href={`/${locale}/admin/quotes/${q.id}`} className="block">
                <div className="text-lg font-semibold truncate">
                  {q.number || t('noNumber')}
                </div>

                <div className="text-sm text-gray-600 truncate">
                  {q.contactName || t('walkInCustomer')}
                </div>

                <div className="text-xs text-gray-500 mt-1">
                  {q.status}
                </div>
              </Link>
            </div>

            <Image
              src={qr}
              alt={t('qrAlt')}
              width={80}
              height={80}
              className="w-20 h-20 border shrink-0"
              unoptimized
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${locale}/admin/quotes/${q.id}`}
              className="px-3 py-2 border rounded text-sm"
            >
              {t('view')}
            </Link>

            <Link
              href={`/${locale}/admin/quotes/${q.id}/edit`}
              className="px-3 py-2 border rounded text-sm"
            >
              {t('edit')}
            </Link>

            <a
              href={`/${locale}/q/${q.id}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 border rounded text-sm"
            >
              {t('viewPublic')}
            </a>

            <DeleteQuoteButton id={q.id} />
          </div>
        </div>
      );
    })
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('listTitle')}</h1>

        <Link
          href={`/${locale}/admin/quotes/new`}
          className="px-4 py-2 rounded bg-black text-white text-sm"
        >
          {t('newQuote')}
        </Link>
      </div>

      {cards.length === 0 ? (
        <div className="border rounded p-6 text-sm text-gray-600">
          {t('noQuotes')}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{cards}</div>
      )}
    </div>
  );
}