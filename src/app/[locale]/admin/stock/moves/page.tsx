import prismadb from '@/libs/prismadb';
import { getOrgIdOrThrowServer } from '@/libs/getOrgId';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string }> };

export default async function StockMovesPage({ params }: Props) {
  const { locale } = await params;
  const orgId = await getOrgIdOrThrowServer();

  const rows = await prismadb.stockMove.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { warehouse: true, items: { include: { product: true } } }
  } as any);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold">Phiếu nhập/xuất kho</div>
          <div className="text-sm text-gray-600 mt-1">50 phiếu gần nhất</div>
        </div>
        <Link
          href={`/${locale}/admin/stock/in`}
          className="px-4 py-2 rounded-lg bg-black text-white"
        >
          + Nhập kho
        </Link>
      </div>

      <div className="mt-5 space-y-3">
        {rows.map((m: any) => (
          <div key={m.id} className="border rounded-xl p-4 bg-white">
            <Link
              href={`/${locale}/admin/stock/moves/${m.id}`}
              className="font-semibold hover:underline"
            >
              {m.type} • {m.warehouse?.name || '—'}
            </Link>

            <div className="text-xs text-gray-600 mt-1">
              {new Date(m.createdAt).toLocaleString('vi-VN')} •{' '}
              {m.refType || 'MANUAL'}
            </div>
            {m.note ? (
              <div className="text-sm mt-2 whitespace-pre-wrap">{m.note}</div>
            ) : null}

            <div className="mt-3 border-t pt-3 space-y-1">
              {m.items?.map((it: any) => (
                <div key={it.id} className="text-sm flex justify-between">
                  <div className="truncate pr-3">
                    {it.product?.nameVi || it.productId}
                  </div>
                  <div className="font-semibold">{it.qty}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {rows.length === 0 ? (
          <div className="text-sm text-gray-600">Chưa có phiếu nào.</div>
        ) : null}
      </div>
    </div>
  );
}
