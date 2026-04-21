'use client';

import {useState, useMemo, useCallback} from 'react';
import {useRouter, useParams} from 'next/navigation';

type Item = {
  sku: string;
  nameVi: string;
  size?: string; // 👈 thêm
  unit?: string;
  quantity: number;
  unitPrice: number;
  note?: string;
  imageUrl?: string;
};

export default function NewQuotePage() {
  const router = useRouter();
  const {locale} = useParams<{locale: string}>();

  const [items, setItems] = useState<Item[]>([
    {
      sku: '',
      nameVi: '',
      unit: 'chiếc',
      quantity: 0,
      unitPrice: 0,
      imageUrl: undefined
    }
  ]);

  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [householdTaxPercent, setHouseholdTaxPercent] = useState(0);
  const [shippingFee, setShippingFee] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactTaxId, setContactTaxId] = useState('');
  const [contactAddress, setContactAddress] = useState('');

  const [notesVi, setNotesVi] = useState('');
  const [validUntil, setValidUntil] = useState<string>('');

  const [uploadingRow, setUploadingRow] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  /** ====== TÍNH TOÁN TỔNG ====== */
  const subTotal = useMemo(
    () => items.reduce((s, i) => s + (i.quantity || 0) * (i.unitPrice || 0), 0),
    [items]
  );
  const discountAmount = subTotal * (discountPercent / 100);
  const afterDiscount = subTotal - discountAmount;
  const taxAmount = afterDiscount * (taxPercent / 100);

  // 👇 DÙNG % NHẬP
  const householdTaxAmount = afterDiscount * (householdTaxPercent / 100);

  const grandTotal =
    afterDiscount + taxAmount + householdTaxAmount + (shippingFee || 0);

  /** ====== UPLOAD ẢNH CLOUDINARY ====== */
  async function handlePickImage(idx: number) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        setUploadingRow(idx);

        const sigRes = await fetch('/api/uploads/cloudinary-sign', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({folder: 'trangbamboo/quotes'})
        });

        if (!sigRes.ok) throw new Error('Không lấy được chữ ký Cloudinary');

        const {timestamp, signature, apiKey, cloudName, folder} =
          await sigRes.json();

        const cloud =
          (cloudName as string | undefined) ||
          process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

        if (!cloud) {
          throw new Error(
            'Thiếu CLOUD_NAME. Hãy set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME.'
          );
        }

        const form = new FormData();
        form.append('file', file);
        form.append('api_key', apiKey);
        form.append('timestamp', String(timestamp));
        form.append('signature', signature);
        form.append('folder', folder || 'trangbamboo/quotes');

        const upRes = await fetch(
          `https://api.cloudinary.com/v1_1/${cloud}/auto/upload`,
          {
            method: 'POST',
            body: form
          }
        );
        const data = await upRes.json();

        if (!upRes.ok) {
          throw new Error(data?.error?.message || 'Upload ảnh thất bại');
        }

        update(idx, {imageUrl: data.secure_url as string});
      } catch (err: any) {
        console.error(err);
        alert(err?.message || 'Upload ảnh thất bại');
      } finally {
        setUploadingRow(null);
      }
    };

    input.click();
  }

  /** ====== BUILD PAYLOAD NHẸ NHẤT CÓ THỂ ====== */
  function buildPayload() {
    const cleanedItems = items
      .map((it) => ({
        ...it,
        size: it.size?.trim() || undefined, // 👈 thêm
        quantity:
          Number.isFinite(it.quantity) && it.quantity > 0 ? it.quantity : 1,
        unitPrice:
          Number.isFinite(it.unitPrice) && it.unitPrice >= 0 ? it.unitPrice : 0,
        unit: it.unit?.trim() || 'chiếc'
      }))
      .filter(
        (it) => it.nameVi.trim() !== '' || it.sku.trim() !== '' || !!it.imageUrl
      );

    return {
      locale,
      items: cleanedItems,

      // số thì vẫn để 0 là được
      discountPercent: discountPercent || 0,
      taxPercent: taxPercent || 0,
      householdTaxPercent: householdTaxPercent || 0,
      shippingFee: shippingFee || 0,
      depositAmount: depositAmount || 0,

      // 👇 luôn là string (có thể rỗng), KHÔNG để null
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      contactTaxId: contactTaxId.trim(),
      contactAddress: contactAddress.trim(),
      notesVi: notesVi.trim(),

      // có ngày thì ISO, không có thì bỏ hẳn (undefined)
      validUntil: validUntil ? new Date(validUntil).toISOString() : undefined
    };
  }

  /** ====== LƯU BÁO GIÁ (CHO PHÉP CỰC ÍT FIELD) ====== */
  async function save() {
    if (isSaving) return;
    if (uploadingRow !== null) {
      alert('Đang upload ảnh, vui lòng chờ một chút rồi lưu.');
      return;
    }

    const payload = buildPayload();

    // Chỉ check duy nhất: phải có ít nhất 1 dòng hàng có tên
    if (!payload.items || payload.items.length === 0) {
      alert('Vui lòng nhập ít nhất 1 dòng hàng (tên hoặc SKU).');
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        router.push(`/${locale}/q/${data.id}`);
      } else {
        alert(data?.error || 'Lỗi lưu báo giá');
      }
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Lỗi lưu báo giá');
    } finally {
      setIsSaving(false);
    }
  }

  /** ====== UPDATE & REMOVE DÒNG ====== */
  const update = useCallback((i: number, patch: Partial<Item>) => {
    setItems((prev) =>
      prev.map((x, idx) => (idx === i ? {...x, ...patch} : x))
    );
  }, []);

  const remove = useCallback((i: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }, []);

  const addRow = () => {
    setItems((prev) => [
      ...prev,
      {
        sku: '',
        nameVi: '',
        unit: 'chiếc',
        quantity: 1,
        unitPrice: 0,
        imageUrl: undefined
      }
    ]);
  };

  /** ====== UI ====== */
  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Tạo báo giá</h1>

      {/* Thông tin liên hệ (tất cả field đều OPTIONAL) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          className="border p-2"
          placeholder="Người liên hệ (không bắt buộc)"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
        />
        <input
          className="border p-2"
          placeholder="Email liên hệ (không bắt buộc)"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
        />
        <input
          className="border p-2"
          placeholder="SĐT liên hệ (không bắt buộc)"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
        />
        <input
          className="border p-2 md:col-span-1"
          placeholder="Mã số thuế (MST) (không bắt buộc)"
          value={contactTaxId}
          onChange={(e) => setContactTaxId(e.target.value)}
        />
        <input
          className="border p-2 md:col-span-2"
          placeholder="Địa chỉ người mua (không bắt buộc)"
          value={contactAddress}
          onChange={(e) => setContactAddress(e.target.value)}
        />
      </div>

      {/* Bảng hàng hóa + cột Ảnh */}
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
                <td className="border p-2 align-top">
                  {it.imageUrl ? (
                    <div className="flex flex-col items-center gap-1">
                      <img
                        src={it.imageUrl}
                        alt=""
                        className="w-16 h-16 object-cover border rounded"
                      />
                      <button
                        className="text-xs underline"
                        onClick={() => update(idx, {imageUrl: undefined})}
                      >
                        Xoá
                      </button>
                    </div>
                  ) : (
                    <button
                      className="border px-2 py-1 text-sm disabled:opacity-60"
                      onClick={() => handlePickImage(idx)}
                      disabled={uploadingRow === idx || isSaving}
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
                    placeholder="SKU (tuỳ chọn)"
                  />
                </td>

                {/* Tên hàng */}
                <td className="border p-2">
                  <input
                    className="w-full"
                    value={it.nameVi}
                    onChange={(e) => update(idx, {nameVi: e.target.value})}
                    placeholder="Tên hàng"
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
                      update(idx, {
                        quantity: Math.max(1, Number(e.target.value) || 1)
                      })
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
                      update(idx, {
                        unitPrice: Math.max(0, Number(e.target.value) || 0)
                      })
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
                  {items.length > 1 && (
                    <button
                      className="px-2 py-1 border"
                      onClick={() => remove(idx)}
                    >
                      Xoá
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-2">
          <button className="border px-3 py-2" onClick={addRow}>
            + Thêm dòng
          </button>
        </div>
      </div>

      {/* Tổng hợp */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block">Ghi chú (tuỳ chọn)</label>
          <textarea
            className="border p-2 w-full h-24"
            value={notesVi}
            onChange={(e) => setNotesVi(e.target.value)}
          />
          <label className="block">Hiệu lực đến (tuỳ chọn)</label>
          <input
            type="date"
            className="border p-2"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Row label="Tạm tính" value={subTotal} />

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

          {/* Thuế hộ kinh doanh giống VAT */}
          <RowInput
            label="Thuế hộ kinh doanh (%)"
            value={householdTaxPercent}
            onChange={setHouseholdTaxPercent}
          />

          <Row
            label={`Tiền thuế hộ kinh doanh (${householdTaxPercent}%)`}
            value={householdTaxAmount}
          />

          <RowInput
            label="Phí vận chuyển"
            value={shippingFee}
            onChange={setShippingFee}
          />
          <RowInput
            label="Đặt cọc"
            value={depositAmount}
            onChange={setDepositAmount}
          />
          <hr />
          <Row strong label="Tổng cộng" value={grandTotal} />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-60"
          onClick={save}
          disabled={isSaving}
        >
          {isSaving ? 'Đang lưu…' : 'Lưu báo giá'}
        </button>
        <button
          className="border px-4 py-2"
          onClick={() => router.back()}
          type="button"
        >
          Huỷ
        </button>
      </div>
    </div>
  );
}

/** ====== COMPONENT PHỤ ====== */

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
        {value.toLocaleString()}
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
