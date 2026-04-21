'use client';

import {useEffect, useMemo, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';

type Item = {
  sku: string;
  nameVi: string;
  size?: string; // 👈
  unit?: string;
  quantity: number;
  unitPrice: number;
  note?: string;
  imageUrl?: string;
};

export default function EditQuotePage() {
  const router = useRouter();
  const {locale, id} = useParams<{locale: string; id: string}>();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactTaxId, setContactTaxId] = useState('');
  const [householdTaxPercent, setHouseholdTaxPercent] = useState(1);
  const [contactAddress, setContactAddress] = useState('');
  const [notesVi, setNotesVi] = useState('');
  const [validUntil, setValidUntil] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [shippingFee, setShippingFee] = useState(0);

  const [uploadingRow, setUploadingRow] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/quotes/${id}`, {cache: 'no-store'});
      const q = await res.json();

      setItems(
        q.items.map((it: any) => ({
          sku: it.sku,
          nameVi: it.nameVi,
          size: it.size ?? '', // 👈
          unit: it.unit ?? '',
          quantity: it.quantity,
          unitPrice: Number(it.unitPrice),
          note: it.note ?? '',
          imageUrl: it.imageUrl ?? undefined
        }))
      );

      setContactName(q.contactName ?? '');
      setContactEmail(q.contactEmail ?? '');
      setContactPhone(q.contactPhone ?? '');
      setContactTaxId(q.contactTaxId ?? ''); // 👈 MST
      setContactAddress(q.contactAddress ?? ''); // 👈 Địa chỉ
      setNotesVi(q.notesVi ?? '');
      setValidUntil(
        q.validUntil ? new Date(q.validUntil).toISOString().slice(0, 10) : ''
      );
      setDiscountPercent(q.discountPercent ?? 0);
      setTaxPercent(q.taxPercent ?? 0);
      setHouseholdTaxPercent(q.householdTaxPercent ?? 1);
      setShippingFee(q.shippingFee ?? 0);

      setLoading(false);
    })();
  }, [id]);

  const subTotal = useMemo(
    () => items.reduce((s, i) => s + (i.quantity || 0) * (i.unitPrice || 0), 0),
    [items]
  );
  const discountAmount = subTotal * (discountPercent / 100);
  const afterDiscount = subTotal - discountAmount;
  const taxAmount = afterDiscount * (taxPercent / 100);
  const householdTaxAmount = afterDiscount * (householdTaxPercent / 100);

  const grandTotal =
    afterDiscount + taxAmount + householdTaxAmount + (shippingFee || 0);

  async function handlePickImage(idx: number) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        setUploadingRow(idx);

        // Lấy chữ ký từ server (đã cấu hình folder 'trangbamboo/quotes')
        const sigRes = await fetch('/api/uploads/cloudinary-sign', {
          method: 'POST'
        });
        if (!sigRes.ok) throw new Error('Không lấy được chữ ký Cloudinary');
        const {timestamp, signature, apiKey, cloudName, folder} =
          await sigRes.json();

        const form = new FormData();
        form.append('file', file);
        form.append('api_key', apiKey);
        form.append('timestamp', String(timestamp));
        form.append('signature', signature);
        form.append('folder', folder); // "trangbamboo/quotes"

        const upRes = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
          {
            method: 'POST',
            body: form
          }
        );
        const data = await upRes.json();
        if (!upRes.ok)
          throw new Error(data?.error?.message || 'Upload ảnh thất bại');

        update(idx, {imageUrl: data.secure_url as string});
      } catch (err: any) {
        alert(err?.message || 'Upload ảnh thất bại');
      } finally {
        setUploadingRow(null);
      }
    };
    input.click();
  }

  async function save() {
    const res = await fetch(`/api/quotes/${id}`, {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        items,
        contactName,
        contactEmail,
        contactPhone,
        contactTaxId, // 👈 gửi MST
        contactAddress, // 👈 gửi địa chỉ
        notesVi,
        validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
        discountPercent,
        taxPercent,
        householdTaxPercent,
        shippingFee
      })
    });
    const data = await res.json();
    if (res.ok) {
      router.push(`/${locale}/q/${id}`);
    } else {
      alert(data?.error || 'Cập nhật thất bại');
    }
  }

  if (loading) return <div className="p-4">Đang tải…</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Sửa báo giá</h1>

      {/* Thông tin liên hệ + MST + Địa chỉ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          className="border p-2"
          placeholder="Người liên hệ"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
        />
        <input
          className="border p-2"
          placeholder="Email liên hệ"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
        />
        <input
          className="border p-2"
          placeholder="SĐT liên hệ"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
        />
        <input
          className="border p-2 md:col-span-1"
          placeholder="Mã số thuế (MST)"
          value={contactTaxId}
          onChange={(e) => setContactTaxId(e.target.value)}
        />
        <input
          className="border p-2 md:col-span-2"
          placeholder="Địa chỉ người mua"
          value={contactAddress}
          onChange={(e) => setContactAddress(e.target.value)}
        />
      </div>

      {/* Bảng items SỬA ĐẦY ĐỦ (có ảnh) */}
      <div className="overflow-x-auto">
        <table className="w-full border">
          <thead className="bg-gray-50">
            <tr>
              <th className="border p-2">Ảnh</th>
              <th className="border p-2">SKU</th>
              <th className="border p-2">Tên hàng</th>
              <th className="border p-2">Kích thước</th>
              <th className="border p-2">ĐVT</th>
              <th className="border p-2 text-right">SL</th>
              <th className="border p-2 text-right">Đơn giá</th>
              <th className="border p-2 text-right">Thành tiền</th>
              <th className="border p-2">Ghi chú</th>
              <th className="border p-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx}>
                {/* Ảnh */}
                <td className="border p-2 align-middle text-center">
                  {it.imageUrl ? (
                    <div className="flex flex-col items-center gap-1">
                      <img
                        src={it.imageUrl}
                        alt=""
                        className="w-16 h-16 object-cover border rounded mx-auto"
                      />
                      <button
                        className="text-xs underline"
                        onClick={() => update(idx, {imageUrl: undefined})}
                      >
                        Xoá ảnh
                      </button>
                    </div>
                  ) : (
                    <button
                      className="border px-2 py-1 text-sm disabled:opacity-60"
                      onClick={() => handlePickImage(idx)}
                      disabled={uploadingRow === idx}
                    >
                      {uploadingRow === idx ? 'Đang upload...' : 'Chọn ảnh'}
                    </button>
                  )}
                </td>

                {/* SKU */}
                <td className="border p-2">
                  <input
                    className="w-full"
                    value={it.sku}
                    onChange={(e) => update(idx, {sku: e.target.value})}
                  />
                </td>

                {/* Tên hàng */}
                <td className="border p-2">
                  <input
                    className="w-full"
                    value={it.nameVi}
                    onChange={(e) => update(idx, {nameVi: e.target.value})}
                  />
                </td>

                {/* Kích thước */}
                <td className="border p-2">
                  <input
                    className="w-full"
                    value={it.size || ''}
                    onChange={(e) => update(idx, {size: e.target.value})}
                    placeholder="VD: 30x20x10cm"
                  />
                </td>

                {/* ĐVT */}
                <td className="border p-2">
                  <input
                    className="w-full"
                    value={it.unit || ''}
                    onChange={(e) => update(idx, {unit: e.target.value})}
                  />
                </td>

                {/* SL */}
                <td className="border p-2 text-right">
                  <input
                    type="number"
                    className="w-24 text-right"
                    value={it.quantity}
                    onChange={(e) =>
                      update(idx, {quantity: Number(e.target.value)})
                    }
                  />
                </td>

                {/* Đơn giá */}
                <td className="border p-2 text-right">
                  <input
                    type="number"
                    className="w-28 text-right"
                    value={it.unitPrice}
                    onChange={(e) =>
                      update(idx, {unitPrice: Number(e.target.value)})
                    }
                  />
                </td>

                {/* Thành tiền */}
                <td className="border p-2 text-right">
                  {(it.quantity * it.unitPrice).toLocaleString()}
                </td>

                {/* Ghi chú */}
                <td className="border p-2">
                  <input
                    className="w-full"
                    value={it.note || ''}
                    onChange={(e) => update(idx, {note: e.target.value})}
                  />
                </td>

                {/* Xoá dòng */}
                <td className="border p-2">
                  <button
                    className="px-2 py-1 border"
                    onClick={() => remove(idx)}
                  >
                    Xoá
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-2">
          <button
            className="border px-3 py-2"
            onClick={() =>
              setItems([
                ...items,
                {sku: '', nameVi: '', unit: 'chiếc', quantity: 1, unitPrice: 0}
              ])
            }
          >
            + Thêm dòng
          </button>
        </div>
      </div>

      {/* Tổng hợp */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block">Ghi chú</label>
          <textarea
            className="border p-2 w-full h-24"
            value={notesVi}
            onChange={(e) => setNotesVi(e.target.value)}
          />
          <label className="block">Hiệu lực đến</label>
          <input
            type="date"
            className="border p-2"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Row label="Tạm tính" value={subTotal} />
          <Row label="Chiết khấu (từ %)" value={discountAmount} />
          <Row label="VAT (từ %)" value={taxAmount} />

          <Row
            label={`Thuế hộ kinh doanh (từ ${householdTaxPercent}%)`}
            value={householdTaxAmount}
          />

          <Row label="Phí vận chuyển" value={shippingFee} />
          <hr />
          <Row strong label="Tổng cộng" value={grandTotal} />

          <RowInput
            label="Chiết khấu (%)"
            value={discountPercent}
            onChange={setDiscountPercent}
          />
          <RowInput
            label="VAT (%)"
            value={taxPercent}
            onChange={setTaxPercent}
          />
          <RowInput
            label="Thuế hộ kinh doanh (%)"
            value={householdTaxPercent}
            onChange={setHouseholdTaxPercent}
          />
          <RowInput
            label="Phí vận chuyển"
            value={shippingFee}
            onChange={setShippingFee}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          className="bg-black text-white px-4 py-2 rounded"
          onClick={save}
        >
          Lưu thay đổi
        </button>
        <button className="border px-4 py-2" onClick={() => history.back()}>
          Huỷ
        </button>
      </div>
    </div>
  );

  function update(i: number, patch: Partial<Item>) {
    setItems((prev) =>
      prev.map((x, idx) => (idx === i ? {...x, ...patch} : x))
    );
  }
  function remove(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }
}

function Row({
  label,
  value,
  strong = false
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className={strong ? 'font-semibold text-lg' : ''}>
        {Number(value).toLocaleString()}
      </span>
    </div>
  );
}
function RowInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span>{label}</span>
      <input
        type="number"
        className="border p-1 w-40 text-right"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}
