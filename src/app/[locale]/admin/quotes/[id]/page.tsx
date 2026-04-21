// src/app/[locale]/admin/quotes/[id]/page.tsx
import prismadb from '@/libs/prismadb';
import QRCode from 'qrcode';
import { getBaseUrl } from '@/utils/getBaseUrl';
import PrintButton from '../../../components/PrintButton';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getOrgIdOrThrowServer } from '@/libs/getOrgId';

// ✅ dùng chung button ở public (import RELATIVE để khỏi dính [locale] trong path)
import DeleteDeliveryButton from '../../../q/components/DeleteDeliveryButton';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

/** ✅ Server Action: delete delivery note (ADMIN) */
async function deleteDeliveryAction(formData: FormData) {
  'use server';

  const deliveryId = String(formData.get('deliveryId') || '').trim();
  const quoteId = String(formData.get('quoteId') || '').trim();
  const locale = String(formData.get('locale') || 'vi').trim();

  if (!deliveryId || !quoteId) return;

  const orgId = await getOrgIdOrThrowServer();

  const d = await prismadb.delivery.findUnique({
    where: { id: deliveryId },
    select: { id: true, orgId: true, quoteId: true }
  });

  // ✅ đúng quote + đúng org
  if (!d) return;
  if (String(d.quoteId) !== String(quoteId)) return;
  if (d.orgId && String(d.orgId) !== String(orgId)) return;

  await prismadb.$transaction(async (tx) => {
    // DeliveryItem model does not exist in this schema, Delivery has relation to Quote.
    await tx.delivery.delete({ where: { id: deliveryId } });
  });

  revalidatePath(`/${locale}/admin/quotes/${quoteId}`);
  redirect(`/${locale}/admin/quotes/${quoteId}`);
}

/** ✅ Server Action: set quote status (ADMIN) - có EXPIRED */
async function setQuoteStatusAction(formData: FormData) {
  'use server';

  const orgId = await getOrgIdOrThrowServer();

  const quoteId = String(formData.get('quoteId') || '').trim();
  const locale = String(formData.get('locale') || 'vi').trim();
  const status = String(formData.get('status') || '').trim();

  const allowed = [
    'DRAFT',
    'CONFIRMED',
    'DELIVERING',
    'DONE',
    'CANCELLED'
  ] as const;

  if (!quoteId || !(allowed as readonly string[]).includes(status)) return;

  await prismadb.quote.updateMany({
    where: { id: quoteId, orgId } as any,
    data: { status: status as any }
  });

  revalidatePath(`/${locale}/admin/quotes/${quoteId}`);
}

// Removed addPaymentAction and deletePaymentAction because QuotePayment model was removed.

export default async function AdminQuoteViewPage({ params }: Props) {
  const { locale, id } = await params;
  const orgId = await getOrgIdOrThrowServer();

  // ✅ chỉ đọc đúng org
  const q = await prismadb.quote.findFirst({
    where: { id, orgId } as any,
    include: {
      items: true,
      customer: true,
    }
  });

  if (!q) return <div className="p-6">Không tìm thấy báo giá.</div>;

  const deliveries = await prismadb.delivery.findMany({
    where: { quoteId: q.id, orgId } as any,
    orderBy: { createdAt: 'desc' }
  });

  const base =
    (await getBaseUrl()) ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'http://localhost:3000';

  const publicUrl = `${base}/${locale}/q/${q.id}`;
  const qr = await QRCode.toDataURL(publicUrl, { margin: 1, scale: 6 });

  const currency = (q as any)?.currency || 'VND';
  const money = (v: any) => formatMoney(v, locale, currency);

  const subTotal = Number((q as any)?.subTotal ?? 0);
  const discountAmount = Number((q as any)?.discountAmount ?? 0);
  const taxAmount = Number((q as any)?.taxAmount ?? 0);
  const householdTaxAmount = Number((q as any)?.householdTaxAmount ?? 0);
  const shippingFee = Number((q as any)?.shippingFee ?? 0);
  const grandTotal = Number((q as any)?.grandTotal ?? 0);

  // legacy deposit fields (nếu vẫn dùng)
  const depositAmount = Number((q as any)?.depositAmount ?? 0);
  const remaining = Math.max(0, grandTotal - depositAmount);
  const isPaidEnough = depositAmount > 0 && depositAmount >= grandTotal;

  // Tính thanh toán dựa trên paymentStatus
  const isPaidEnoughByPayments = q.paymentStatus === 'PAID';
  const paidTotal = isPaidEnoughByPayments ? grandTotal : 0;
  const remainingByPayments = grandTotal - paidTotal;

  const items = (q as any).items || [];

  return (
    <div className="p-4 md:p-6 print:p-0 flex flex-col items-center">
      <style>{`
        @media print {
          .no-print { display:none !important; }
          .no-print-inline { display:none !important; }
          @page { size: A4; margin: 12mm; }
          .sheet { width: 210mm; min-height: 297mm; box-shadow: none !important; }
        }
        .wrap-break-word { overflow-wrap:anywhere; word-break:break-word; }
      `}</style>

      {/* ✅ ADMIN actions */}
      <div className="no-print w-full max-w-4xl flex flex-wrap justify-end mb-2 gap-2">
        {/* ✅ đổi status */}
        <form action={setQuoteStatusAction} className="flex items-center gap-2">
          <input type="hidden" name="quoteId" value={(q as any).id} />
          <input type="hidden" name="locale" value={locale} />
          <select
            name="status"
            defaultValue={(q as any).status}
            className="border rounded-lg px-2 py-2 text-sm bg-white"
          >
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="DELIVERING">Delivering</option>
            <option value="DONE">Done</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <button className="px-3 py-2 border rounded-lg text-sm">
            Cập nhật
          </button>
        </form>

        {/* ✅ Route bạn đang có: /delivery-note/new/[quoteId] */}
        <a
          href={`/${locale}/delivery-note/new/${q.id}`}
          className="px-4 py-2 rounded-lg border text-sm"
        >
          Tạo phiếu giao (nhiều đợt)
        </a>

        <a
          href={`/${locale}/q/${q.id}`}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 rounded-lg border text-sm"
        >
          Mở link công khai
        </a>

        <PrintButton />
      </div>

      <div className="sheet w-full max-w-4xl bg-white p-4 md:p-6 print:p-3 shadow">
        {/* Header (compact like public) */}
        <div className="grid grid-cols-12 gap-3 items-start">
          {/* Title */}
          <div className="col-span-12 md:col-span-6">
            <div className="font-bold text-xl leading-tight print:text-lg">
              QUOTATION <span className="text-gray-400">/</span>
              <span className="ml-1">BÁO GIÁ</span>
            </div>
            <div className="mt-1 text-[11px] text-gray-600 leading-tight print:text-[10px]">
              KHANH NGUYEN CO., LTD <span className="text-gray-400">•</span>{' '}
              CÔNG TY TNHH KHÁNH NGUYÊN
            </div>
          </div>

          {/* Meta: No/Date/Status (gọn 1 cụm) */}
          <div className="col-span-8 md:col-span-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="border rounded px-2 py-1 leading-tight print:px-1 print:py-[2px]">
                <div className="text-[10px] text-gray-500">No. • Số</div>
                <div className="text-sm font-semibold print:text-[11px]">
                  {(q as any).number}
                </div>
              </div>

              <div className="border rounded px-2 py-1 leading-tight print:px-1 print:py-[2px]">
                <div className="text-[10px] text-gray-500">Date • Ngày</div>
                <div className="text-sm font-semibold print:text-[11px]">
                  {formatDate((q as any).createdAt, locale)}
                </div>
              </div>

              {/* Status chiếm 2 cột để không đội chiều cao quá nhiều */}
              <div className="border rounded px-2 py-1 leading-tight col-span-2 print:px-1 print:py-[2px]">
                <div className="text-[10px] text-gray-500">
                  Status • Trạng thái
                </div>
                <div className="mt-1">
                  <StatusBadge status={(q as any).status} />
                </div>
              </div>
            </div>
          </div>

          {/* QR */}
          <div className="col-span-4 md:col-span-2 flex justify-end">
            <div className="border rounded p-2 print:p-1">
              <div className="text-[10px] text-gray-500 mb-1 leading-tight">
                QR
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr}
                alt="QR"
                className="w-20 h-20 md:w-24 md:h-24 print:w-16 print:h-16"
              />
            </div>
          </div>
        </div>
        {/* Company & Customer (compact like public) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-[11px] leading-tight print:text-[10px] print:mt-3">
          {/* SELLER */}
          <div className="border rounded p-3 print:p-2">
            <div className="font-semibold mb-2 print:mb-1">
              SELLER <span className="text-gray-400">•</span> BÊN BÁN
            </div>

            <dl className="grid grid-cols-12 gap-x-2 gap-y-1">
              <dt className="col-span-4 text-gray-500">Company • Công ty</dt>
              <dd className="col-span-8 font-medium">
                KHANH NGUYEN CO., LTD
                <div className="text-[10px] text-gray-600">
                  CÔNG TY TNHH KHÁNH NGUYÊN
                </div>
              </dd>

              <dt className="col-span-4 text-gray-500">Address • Địa chỉ</dt>
              <dd className="col-span-8">Truong Yen, Chuong My, Ha Noi</dd>

              <dt className="col-span-4 text-gray-500">Tax code • MST</dt>
              <dd className="col-span-8">0110300172</dd>

              <dt className="col-span-4 text-gray-500">Email • Website</dt>
              <dd className="col-span-8">
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  <span>trangbamboovn@gmail.com</span>
                  <span className="text-gray-700">trangbamboo.com</span>
                </div>
              </dd>
            </dl>
          </div>

          {/* BUYER */}
          <div className="border rounded p-3 print:p-2">
            <div className="font-semibold mb-2 print:mb-1">
              QUOTE TO <span className="text-gray-400">•</span> THÔNG TIN KHÁCH
              HÀNG
            </div>

            <dl className="grid grid-cols-12 gap-x-2 gap-y-1">
              <dt className="col-span-4 text-gray-500">Customer • Liên hệ</dt>
              <dd className="col-span-8 font-medium">
                {(q as any).customer?.name || (q as any).contactName || '—'}
              </dd>

              <dt className="col-span-4 text-gray-500">Email • Phone</dt>
              <dd className="col-span-8">
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {(q as any).contactEmail ? (
                    <span>{(q as any).contactEmail}</span>
                  ) : (
                    <span>—</span>
                  )}
                  {(q as any).contactPhone ? (
                    <span>{(q as any).contactPhone}</span>
                  ) : null}
                </div>
              </dd>

              {(q as any).contactTaxId ? (
                <>
                  <dt className="col-span-4 text-gray-500">Tax code • MST</dt>
                  <dd className="col-span-8">{(q as any).contactTaxId}</dd>
                </>
              ) : null}

              {(q as any).contactAddress ? (
                <>
                  <dt className="col-span-4 text-gray-500">
                    Address • Địa chỉ
                  </dt>
                  <dd className="col-span-8 wrap-break-word">
                    {(q as any).contactAddress}
                  </dd>
                </>
              ) : null}
            </dl>
          </div>
        </div>

        {/* ✅ Admin Delivery list */}
        <div className="no-print mt-4 border rounded-xl p-3 text-sm">
          <div className="font-semibold">
            PHIẾU GIAO HÀNG (ĐỢT GIAO)
            <div className="text-xs font-medium text-gray-600">
              Tạo nhiều phiếu giao từ 1 báo giá để giao nhiều đợt
            </div>
          </div>

          {deliveries.length === 0 ? (
            <div className="mt-2 text-gray-600">Chưa có phiếu giao nào.</div>
          ) : (
            <div className="mt-2 space-y-2">
              {deliveries.map((d: any) => (
                <div
                  key={d.id}
                  className="border rounded-lg px-3 py-2 hover:bg-gray-50 flex items-start justify-between gap-3"
                >
                  <a
                    href={`/${locale}/delivery-note/${d.id}`}
                    className="block flex-1 min-w-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold truncate">{d.number}</div>
                      <div className="text-xs text-gray-600 shrink-0">
                        {formatDate(d.createdAt, locale)}
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {d.carrier ? `Vận chuyển: ${d.carrier}` : 'Vận chuyển: —'}
                      {d.note ? ` • Ghi chú: ${d.note}` : ''}
                    </div>
                  </a>

                  <form action={deleteDeliveryAction} className="shrink-0">
                    <input type="hidden" name="deliveryId" value={d.id} />
                    <input type="hidden" name="quoteId" value={(q as any).id} />
                    <input type="hidden" name="locale" value={locale} />
                    <DeleteDeliveryButton deliveryNumber={d.number} />
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===================== ITEMS ===================== */}

        {/* Mobile */}
        <div className="mt-6 space-y-3 md:hidden">
          <div className="font-semibold">
            ITEMS
            <div className="text-xs font-medium text-gray-600">
              DANH SÁCH HÀNG
            </div>
          </div>

          {items.map((it: any, idx: number) => {
            const lineTotal =
              it.lineTotal ??
              (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);

            return (
              <div key={it.id ?? idx} className="border rounded p-3">
                <div className="flex gap-3">
                  <div className="w-24 shrink-0">
                    {it.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <a href={it.imageUrl} target="_blank" rel="noreferrer">
                        <img
                          src={it.imageUrl}
                          alt=""
                          className="w-24 h-24 object-contain bg-white border rounded"
                        />
                      </a>
                    ) : (
                      <div className="w-24 h-24 border rounded flex items-center justify-center text-gray-400">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold wrap-break-word">
                      {it.nameVi}
                    </div>

                    {!!it.size && (
                      <div className="text-sm text-gray-700 mt-1 wrap-break-word">
                        <span className="font-medium">Kích thước:</span>{' '}
                        {it.size}
                      </div>
                    )}

                    {!!it.sku && (
                      <div className="text-sm text-gray-700 mt-1 wrap-break-word">
                        <span className="font-medium">Phụ kiện:</span> {it.sku}
                      </div>
                    )}

                    <div className="text-sm text-gray-700 mt-1">
                      <span className="font-medium">ĐVT:</span> {it.unit} ·{' '}
                      <span className="font-medium">SL:</span> {it.quantity}
                    </div>

                    <div className="text-sm text-gray-700 mt-1">
                      <span className="font-medium">Đơn giá:</span>{' '}
                      {money(it.unitPrice)}
                    </div>

                    <div className="text-sm mt-1">
                      <span className="font-semibold">Thành tiền:</span>{' '}
                      <span className="font-semibold">{money(lineTotal)}</span>
                    </div>
                  </div>
                </div>

                {!!it.note && (
                  <div className="mt-2 text-sm text-gray-700 wrap-break-word">
                    <span className="font-medium">Lưu ý:</span> {it.note}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop/Print */}
        <div className="hidden md:block mt-6">
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full border text-sm table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <Th
                    en="Item name"
                    vi="Tên hàng"
                    align="left"
                    className="w-[160px]"
                  />
                  <Th
                    en="Size"
                    vi="Kích thước"
                    align="left"
                    className="w-[90px]"
                  />
                  <Th
                    en="Accessories"
                    vi="Phụ kiện"
                    align="left"
                    className="w-[120px]"
                  />
                  <Th en="Image" vi="Ảnh" align="center" className="w-[90px]" />
                  <Th en="Unit" vi="ĐVT" align="center" className="w-[55px]" />
                  <Th en="Qty" vi="SL" align="right" className="w-[45px]" />
                  <Th
                    en="Unit price"
                    vi="Đơn giá"
                    align="right"
                    className="w-[90px]"
                  />
                  <Th
                    en="Amount"
                    vi="Thành tiền"
                    align="right"
                    className="w-[95px]"
                  />
                  <Th en="Note" vi="Lưu ý" align="left" />
                </tr>
              </thead>

              <tbody>
                {items.map((it: any) => (
                  <tr key={it.id}>
                    <td className="border p-2 wrap-break-word align-top">
                      {it.nameVi}
                    </td>
                    <td className="border p-2 wrap-break-word align-top">
                      {it.size || ''}
                    </td>
                    <td className="border p-2 wrap-break-word align-top">
                      {it.sku || ''}
                    </td>

                    <td className="border p-2 align-middle">
                      {it.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <a href={it.imageUrl} target="_blank" rel="noreferrer">
                          <img
                            src={it.imageUrl}
                            alt=""
                            className="w-full h-20 object-cover border rounded cursor-zoom-in"
                          />
                        </a>
                      ) : (
                        <div className="text-center text-gray-500">-</div>
                      )}
                    </td>

                    <td className="border p-2 text-center align-top">
                      {it.unit}
                    </td>
                    <td className="border p-2 text-right align-top">
                      {it.quantity}
                    </td>
                    <td className="border p-2 text-right align-top">
                      {money(it.unitPrice)}
                    </td>
                    <td className="border p-2 text-right align-top">
                      {money(it.lineTotal)}
                    </td>
                    <td className="border p-2 wrap-break-word align-top">
                      {it.note || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes + Totals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div>
            <div className="font-semibold">
              NOTES
              <div className="text-xs font-medium text-gray-600">GHI CHÚ</div>
            </div>

            <div className="whitespace-pre-wrap mt-2">
              {(q as any).notesVi || '-'}
            </div>

            {(q as any).validUntil && (
              <div className="mt-3 italic">
                <div className="text-xs font-medium text-gray-600">
                  Valid until
                </div>
                <div className="text-sm font-semibold">Hiệu lực đến</div>
                <div>{formatDate((q as any).validUntil, locale)}</div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <RowBi
              labelEn="Subtotal"
              labelVi="Tạm tính"
              value={subTotal}
              money={money}
            />

            {discountAmount > 0 && (
              <RowBi
                labelEn="Discount"
                labelVi="Chiết khấu"
                value={discountAmount}
                money={money}
              />
            )}

            {taxAmount > 0 && (
              <RowBi
                labelEn="VAT"
                labelVi="Thuế VAT"
                value={taxAmount}
                money={money}
              />
            )}

            {householdTaxAmount !== 0 && (
              <RowBi
                labelEn={`Household business tax (${(q as any).householdTaxPercent ?? 0}%)`}
                labelVi={`Thuế hộ kinh doanh (${(q as any).householdTaxPercent ?? 0}%)`}
                value={householdTaxAmount}
                money={money}
              />
            )}

            {shippingFee > 0 && (
              <RowBi
                labelEn="Shipping fee"
                labelVi="Phí vận chuyển"
                value={shippingFee}
                money={money}
              />
            )}

            <hr />

            <RowBi
              strong
              labelEn="Grand total"
              labelVi="Tổng cộng"
              value={grandTotal}
              money={money}
            />

            {depositAmount > 0 && (
              <>
                <RowBi
                  labelEn="Deposit / Advance payment"
                  labelVi="Đặt cọc / Ứng trước"
                  value={depositAmount}
                  money={money}
                />
                <RowBi
                  strong
                  labelEn="Remaining balance"
                  labelVi="Còn lại"
                  value={remaining}
                  money={money}
                />

                {isPaidEnough && (
                  <div className="text-right text-sm italic text-green-700">
                    Paid in full
                    <div className="text-xs">Đã thanh toán đủ</div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ===================== PAYMENTS / DEBT (REMOVED) ===================== */}
        </div>

        {/* Sign */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10">
          <div className="text-center">
            <div className="font-semibold">
              SELLER
              <div className="text-xs font-medium text-gray-600">
                ĐẠI DIỆN BÊN BÁN
              </div>
            </div>
            <div className="text-xs italic mb-1">
              Signature, full name, company stamp
              <div>Ký, ghi rõ họ tên, đóng dấu</div>
            </div>
            <div className="h-24 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/khanh-nguyen-stamp-sign.png"
                alt="Ký tên & đóng dấu Khánh Nguyên"
                className="max-h-24 object-contain"
              />
            </div>
          </div>

          <div className="text-center">
            <div className="font-semibold">
              BUYER
              <div className="text-xs font-medium text-gray-600">
                XÁC NHẬN BÊN MUA
              </div>
            </div>
            <div className="text-xs italic">
              Signature, full name
              <div>Ký, ghi rõ họ tên</div>
            </div>
            <div className="h-24" />
            <div>……………………………………</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ====== UI HELPERS ====== */

function Th({
  en,
  vi,
  align,
  className = ''
}: {
  en: string;
  vi: string;
  align: 'left' | 'center' | 'right';
  className?: string;
}) {
  const cls =
    align === 'left'
      ? 'text-left'
      : align === 'center'
        ? 'text-center'
        : 'text-right';

  return (
    <th className={`border p-2 ${cls} ${className}`}>
      <div className="leading-tight whitespace-normal wrap-break-word">
        <div className="text-[11px] font-medium text-gray-600">{en}</div>
        <div className="text-sm font-semibold">{vi}</div>
      </div>
    </th>
  );
}

function RowBi({
  labelEn,
  labelVi,
  value,
  strong = false,
  money
}: {
  labelEn: string;
  labelVi: string;
  value: any;
  strong?: boolean;
  money: (v: any) => string;
}) {
  return (
    <div className="flex justify-between items-end gap-4">
      <div className="leading-tight">
        <div className="text-xs font-medium text-gray-600">{labelEn}</div>
        <div className={strong ? 'text-sm font-semibold' : 'text-sm'}>
          {labelVi}
        </div>
      </div>
      <div className={strong ? 'font-semibold text-lg' : ''}>
        {money(value)}
      </div>
    </div>
  );
}

function formatMoney(value: any, locale: string, currency: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);

  try {
    return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'VND' ? 0 : 2
    }).format(n);
  } catch {
    return n.toLocaleString(locale);
  }
}

function formatDate(d: any, locale: string) {
  const dt = d instanceof Date ? d : new Date(d);
  const safeLocale = locale === 'vi' ? 'vi-VN' : locale || 'vi-VN';
  try {
    return dt.toLocaleDateString(safeLocale);
  } catch {
    return dt.toLocaleDateString('vi-VN');
  }
}

/** ✅ badge trạng thái */
function StatusBadge({ status }: { status: string }) {
  const s = String(status || '').toUpperCase();

  const map: Record<string, { label: string; cls: string }> = {
    DRAFT: { label: 'Draft', cls: 'bg-gray-100 text-gray-800 border-gray-200' },
    CONFIRMED: { label: 'Confirmed', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    DELIVERING: { label: 'Delivering', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    DONE: { label: 'Done', cls: 'bg-green-50 text-green-700 border-green-200' },
    CANCELLED: { label: 'Cancelled', cls: 'bg-red-50 text-red-700 border-red-200' },
  };

  const item = map[s] || {
    label: s || '—',
    cls: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${item.cls}`}
    >
      {item.label}
    </span>
  );
}
