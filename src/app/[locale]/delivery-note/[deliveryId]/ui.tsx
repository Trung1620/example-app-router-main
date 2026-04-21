"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type DeliveryEditorItem = {
  quoteItemId: string;
  nameVi: string;
  sku: string;
  size?: string | null;
  unit?: string | null;
  maxQty: number;
  qty: number;
};

export default function DeliveryEditor(props: {
  deliveryId: string;
  carrier: string;
  note: string;
  items: DeliveryEditorItem[];
}) {
  const router = useRouter();

  const [carrier, setCarrier] = useState(props.carrier);
  const [note, setNote] = useState(props.note);
  const [items, setItems] = useState<DeliveryEditorItem[]>(props.items);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // ✅ Nếu server refresh xong trả props mới, đồng bộ lại state
  useEffect(() => {
    setCarrier(props.carrier);
    setNote(props.note);
    setItems(props.items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.deliveryId, props.carrier, props.note, props.items]);

  const clampQty = (v: number, max: number) => {
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(max, v));
  };

  const save = async () => {
    setLoading(true);
    setMsg(null);

    try {
      const payloadItems = items.map((x) => ({
        quoteItemId: x.quoteItemId,
        qty: clampQty(Number(x.qty) || 0, x.maxQty),
      }));

      const res = await fetch(`/api/delivery/${props.deliveryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carrier,
          note,
          items: payloadItems,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Save failed");

      setMsg("Đã lưu ✅");

      // ✅ QUAN TRỌNG: reload Server Component để bảng phiếu bên dưới cập nhật ngay
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-xl p-3 bg-white">
      <div className="font-semibold">Sửa số lượng giao (trước khi in)</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <div>
          <div className="text-xs text-gray-600">Vận chuyển</div>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            placeholder="GHN / GHTK / Nhà xe..."
          />
        </div>

        <div>
          <div className="text-xs text-gray-600">Ghi chú</div>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Giao giờ hành chính..."
          />
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {items.map((it, idx) => (
          <div
            key={it.quoteItemId}
            className="flex items-center justify-between gap-3 border rounded-lg p-2"
          >
            <div className="min-w-0">
              <div className="font-medium truncate">{it.nameVi}</div>
              <div className="text-xs text-gray-600">
                {it.sku ? `SKU: ${it.sku}` : ""}
                {it.size ? ` | ${it.size}` : ""}
                {it.unit ? ` | ${it.unit}` : ""}
                {` | Max: ${it.maxQty}`}
              </div>
            </div>

            <input
              type="number"
              min={0}
              max={it.maxQty}
              className="w-24 border rounded-lg px-3 py-2"
              value={it.qty}
              onChange={(e) => {
                const raw = Number(e.target.value);
                const v = clampQty(raw, it.maxQty);

                setItems((prev) => {
                  const next = [...prev];
                  next[idx] = { ...next[idx], qty: v };
                  return next;
                });
              }}
            />
          </div>
        ))}
      </div>

      {msg && (
        <div
          className={`mt-2 text-sm ${
            msg.includes("✅") ? "text-green-700" : "text-gray-700"
          }`}
        >
          {msg}
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <button
          onClick={save}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-60"
        >
          {loading ? "Đang lưu..." : "Lưu số lượng"}
        </button>
      </div>
    </div>
  );
}
