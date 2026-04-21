
// src/app/[locale]/delivery-note/[deliveryId]/page.tsx
import prismadb from '@/libs/prismadb';
import PrintButton from '../../components/PrintButton';
import DeliveryEditor from './ui';
import ConfirmDeliveryButton from './components/ConfirmDeliveryButton';
import { getOrgIdOrThrowServer } from '@/libs/getOrgId';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string; deliveryId: string }> };

function formatDate(locale: string, d: Date) {
  return d.toLocaleDateString(locale);
}

export default async function DeliveryNotePage({ params }: Props) {
  const { locale, deliveryId } = await params;
  const orgId = await getOrgIdOrThrowServer();

  const d = await prismadb.delivery.findFirst({
    where: { id: deliveryId, orgId } as any,
    include: {
      items: { include: { quoteItem: true } },
      quote: { include: { customer: true, items: true } }
    }
  });

  if (!d) return <div className="p-6">Không tìm thấy phiếu giao hàng.</div>;

  const q: any = d.quote;
  const customerName = q.customer?.name || q.contactName || '—';
  const customerPhone = q.contactPhone || q.customer?.phone || '—';
  const customerAddress = q.contactAddress || q.customer?.address || '—';

  return (
    <div className="p-4 md:p-6 print:p-0 flex flex-col items-center">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            box-shadow: none !important;
          }
          .no-print { display:none !important; }
          @page { size: A4; margin: 12mm; }
        }
        .wrap-break-word { overflow-wrap: anywhere; word-break: break-word; }
      `}</style>

      <div className="no-print w-full max-w-4xl flex items-center justify-between mb-2 gap-2">
        <div className="text-sm text-gray-600">
          Phiếu: <b>{d.number}</b> • Từ quote: <b>{q.number}</b>
        </div>
        <div className="flex gap-2">
          <ConfirmDeliveryButton
            locale={locale}
            deliveryId={d.id}
            disabled={d.status !== 'DRAFT'}
          />
          <PrintButton />
        </div>
      </div>

      <div className="no-print w-full max-w-4xl mb-3">
        <DeliveryEditor
          deliveryId={d.id}
          carrier={d.carrier || ''}
          note={d.note || ''}
          items={q.items.map((qi: any) => {
            const found = d.items.find((x: any) => x.quoteItemId === qi.id);
            return {
              quoteItemId: qi.id,
              nameVi: qi.nameVi,
              sku: qi.sku,
              size: qi.size,
              unit: qi.unit,
              maxQty: qi.quantity,
              qty: found?.qty || 0
            };
          })}
        />
      </div>

      {/* ✅ CHỈ in phần này */}
      <div className="sheet print-area w-full max-w-4xl bg-white p-4 md:p-6 shadow">
        <div className="text-center">
          <h1 className="text-2xl font-bold">PHIẾU GIAO HÀNG</h1>
          <div className="text-sm text-gray-700 mt-1">
            <div className="font-semibold">KHÁNH NGUYÊN CO., LTD</div>
            <div>Truong Yen, Chuong My, Ha Noi • MST: 0110300172</div>
            <div>trangbamboovn@gmail.com • trangbamboo.com</div>
          </div>

          <div className="text-sm text-gray-700 mt-2">
            Mã phiếu: <b>{d.number}</b> • Ngày:{' '}
            <b>{formatDate(locale, new Date(d.createdAt))}</b>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 text-sm">
          <div className="border rounded-xl p-3">
            <div className="text-xs text-gray-600">Người nhận</div>
            <div className="font-semibold wrap-break-word">{customerName}</div>

            <div className="mt-2 text-xs text-gray-600">SĐT</div>
            <div className="font-medium wrap-break-word">{customerPhone}</div>

            <div className="mt-2 text-xs text-gray-600">Địa chỉ</div>
            <div className="font-medium wrap-break-word">{customerAddress}</div>
          </div>

          <div className="border rounded-xl p-3">
            <div className="text-xs text-gray-600">Vận chuyển</div>
            <div className="font-semibold wrap-break-word">
              {d.carrier || '—'}
            </div>

            <div className="mt-2 text-xs text-gray-600">Ghi chú</div>
            <div className="font-medium whitespace-pre-wrap wrap-break-word">
              {d.note || '—'}
            </div>
          </div>
        </div>

        <table className="w-full border mt-6 text-sm table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th className="border p-2 w-[60px] text-center">STT</th>
              <th className="border p-2 text-left">Sản phẩm</th>
              <th className="border p-2 w-[90px] text-center">SL</th>
              <th className="border p-2 w-40 text-left">Ghi chú</th>
            </tr>
          </thead>

          <tbody>
            {d.items.map((it: any, idx: number) => (
              <tr key={it.id}>
                <td className="border p-2 text-center">{idx + 1}</td>

                <td className="border p-2">
                  <div className="font-semibold wrap-break-word">
                    {it.quoteItem?.nameVi || ''}
                  </div>
                  <div className="text-xs text-gray-600 wrap-break-word">
                    {it.quoteItem?.sku ? `SKU: ${it.quoteItem.sku}` : ''}
                    {it.quoteItem?.size ? ` | Size: ${it.quoteItem.size}` : ''}
                    {it.quoteItem?.unit ? ` | ĐVT: ${it.quoteItem.unit}` : ''}
                  </div>
                </td>

                <td className="border p-2 text-center font-semibold">
                  {it.qty}
                </td>
                <td className="border p-2"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ✅ CHỮ KÝ + DẤU ở Người giao */}
        <div className="grid grid-cols-2 gap-4 mt-10">
          <div className="text-center border border-dashed rounded-xl p-4 h-28 flex flex-col justify-between">
            <div>
              <div className="font-semibold">Người giao</div>
              <div className="text-xs text-gray-600">
                (Ký, ghi rõ họ tên, đóng dấu)
              </div>
            </div>

            <div className="flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/khanh-nguyen-stamp-sign.png"
                alt="Ký tên & đóng dấu Khánh Nguyên"
                className="max-h-20 object-contain"
              />
            </div>
          </div>

          <div className="text-center border border-dashed rounded-xl p-4 h-28 flex flex-col justify-between">
            <div>
              <div className="font-semibold">Người nhận</div>
              <div className="text-xs text-gray-600">(Ký, ghi rõ họ tên)</div>
            </div>
            <div className="text-gray-500">……………………………………</div>
          </div>
        </div>
      </div>
    </div>
  );
}