"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Props = {
  quoteId: string;
  quoteNumber: string;
  customerName: string;
  items: {
    id: string; // ✅ quoteItemId
    nameVi: string;
    sku: string;
    size?: string | null;
    unit?: string | null;
    quantity: number;
    delivered: number;
  }[];
};

type CreateDeliveryPayload = {
  carrier?: string;
  note?: string;
  // ✅ server route expects { quoteItemId, qty }
  items: { quoteItemId: string; qty: number }[];
};

export default function DeliveryFromQuoteForm(props: Props) {
  const r = useRouter();
  const { locale } = useParams<{ locale: string; quoteId: string }>();

  const [carrier, setCarrier] = useState("");
  const [note, setNote] = useState("");

  // ✅ initial map theo remaining
  const initial = useMemo(() => {
    const m: Record<string, number> = {};
    for (const it of props.items) {
      const remaining = Math.max(0, Number(it.quantity || 0) - Number(it.delivered || 0));
      m[it.id] = remaining; // mặc định giao hết phần còn lại
    }
    return m;
  }, [props.items]);

  const [qtyMap, setQtyMap] = useState<Record<string, number>>(initial);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ✅ nếu props.items đổi (reload page / quote khác), reset qtyMap
  useEffect(() => {
    setQtyMap(initial);
  }, [initial]);

  const clamp = (v: number, max: number) => {
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(max, v));
  };

  const onCreate = async () => {
    setLoading(true);
    setErr(null);

    try {
      // ✅ build items đúng theo schema route /api/quotes/[quoteId]/deliveries
      const itemsPayload: CreateDeliveryPayload["items"] = props.items.map((it) => {
        const remaining = Math.max(0, Number(it.quantity || 0) - Number(it.delivered || 0));
        const raw = Number(qtyMap[it.id] ?? 0);
        return {
          quoteItemId: it.id,
          qty: clamp(raw, remaining),
        };
      });

      const payload: CreateDeliveryPayload = {
        carrier: carrier?.trim() || undefined,
        note: note?.trim() || undefined,
        items: itemsPayload,
      };

      // ✅ ĐÚNG route mới: /api/quotes/${quoteId}/deliveries
      const res = await fetch(`/api/quotes/${props.quoteId}/deliveries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Create delivery failed");

      // ✅ route server trả: { ok: true, delivery }
      const deliveryId: string | undefined = json?.delivery?.id;
      if (!deliveryId) throw new Error("Missing deliveryId from API response");

      // ✅ đúng route theo folder: /[locale]/delivery-note/[deliveryId]
      r.push(`/${locale}/delivery-note/${deliveryId}`);
      r.refresh();
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="text-xl font-bold">Tạo đợt giao hàng</div>
      <div className="text-sm text-gray-600 mt-1">
        Quote: <b>{props.quoteNumber}</b> • Khách: <b>{props.customerName}</b>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        <div className="border rounded-xl p-3 bg-white">
          <div className="text-xs text-gray-600">Vận chuyển</div>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2"
            placeholder="GHN / GHTK / Nhà xe..."
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
          />
        </div>

        <div className="border rounded-xl p-3 bg-white">
          <div className="text-xs text-gray-600">Ghi chú</div>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2"
            placeholder="Giao giờ hành chính..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-5 border rounded-xl overflow-hidden bg-white">
        <div className="bg-gray-50 px-4 py-3 font-semibold">
          Hàng hoá &amp; số lượng giao
        </div>

        <div className="divide-y">
          {props.items.map((it) => {
            const remaining = Math.max(0, Number(it.quantity || 0) - Number(it.delivered || 0));
            const v = qtyMap[it.id] ?? 0;

            return (
              <div
                key={it.id}
                className="p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
              >
                <div className="md:col-span-7">
                  <div className="font-semibold">{it.nameVi}</div>
                  <div className="text-xs text-gray-600">
                    {it.sku ? `SKU: ${it.sku}` : ""}
                    {it.size ? ` | Size: ${it.size}` : ""}
                    {it.unit ? ` | ĐVT: ${it.unit}` : ""}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Báo giá: <b>{it.quantity}</b> • Đã giao: <b>{it.delivered}</b> • Còn
                    lại: <b>{remaining}</b>
                  </div>
                </div>

                <div className="md:col-span-5 flex gap-2 items-center">
                  <input
                    type="number"
                    min={0}
                    max={remaining}
                    className="w-32 border rounded-lg px-3 py-2"
                    value={v}
                    onChange={(e) => {
                      const raw = Number(e.target.value);
                      const next = clamp(raw, remaining);
                      setQtyMap((p) => ({ ...p, [it.id]: next }));
                    }}
                  />

                  <button
                    type="button"
                    className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
                    onClick={() => setQtyMap((p) => ({ ...p, [it.id]: remaining }))}
                  >
                    Giao hết
                  </button>

                  <button
                    type="button"
                    className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
                    onClick={() => setQtyMap((p) => ({ ...p, [it.id]: 0 }))}
                  >
                    0
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {err && <div className="mt-3 text-red-600 text-sm">{err}</div>}

      <div className="mt-5 flex justify-end">
        <button
          disabled={loading}
          onClick={onCreate}
          className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-60"
        >
          {loading ? "Đang tạo..." : "Tạo phiếu & in"}
        </button>
      </div>
    </div>
  );
}
