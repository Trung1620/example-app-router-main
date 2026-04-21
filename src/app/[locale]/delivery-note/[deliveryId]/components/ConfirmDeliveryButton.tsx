// src/app/[locale]/delivery-note/[deliveryId]/components/ConfirmDeliveryButton.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type WarehouseRow = {
  id: string;
  name: string;
  note?: string | null;
};

export default function ConfirmDeliveryButton(props: {
  locale: string;
  deliveryId: string;
  disabled?: boolean;
}) {
  const r = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [msg, setMsg] = useState<string | null>(null);

  const canConfirm = !props.disabled;

  const title = useMemo(() => {
    if (!canConfirm) return "Đã xác nhận / Không thể xác nhận";
    return "Xác nhận giao hàng";
  }, [canConfirm]);

  // ✅ load kho khi mở popup
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setMsg(null);

      try {
        // ✅ API hiện tại của bạn trả { rows }
        const res = await fetch("/api/warehouses", { cache: "no-store" });
        const json = await res.json();

        if (!res.ok) throw new Error(json?.error || "Load warehouses failed");

        const rows: WarehouseRow[] = json?.rows || [];

        if (cancelled) return;

        setWarehouses(rows);

        // ✅ tránh stale warehouseId: chỉ set nếu đang rỗng
        if (rows.length) {
          setWarehouseId((cur) => cur || rows[0].id);
        } else {
          setMsg("Chưa có kho nào. Vào Admin → Kho hàng để tạo kho trước.");
        }
      } catch (e: any) {
        if (!cancelled) setMsg(e?.message || "Load warehouses error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const onConfirm = async () => {
    if (!canConfirm) return;

    if (!warehouseId) {
      setMsg("Vui lòng chọn kho trước khi xác nhận.");
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/deliveries/${props.deliveryId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warehouseId }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Confirm failed");

      // ✅ confirm xong đóng modal luôn cho “gọn”
      setOpen(false);

      // ✅ reload Server Component để status/phiếu kho cập nhật
      r.refresh();
    } catch (e: any) {
      setMsg(e?.message || "Confirm error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={!canConfirm}
        onClick={() => setOpen(true)}
        className={`px-4 py-2 rounded-lg border text-sm ${
          canConfirm
            ? "bg-white hover:bg-gray-50"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
        title={title}
      >
        Xác nhận giao
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-label="Close"
          />

          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border p-4">
            <div className="font-semibold text-lg">Chọn kho để xuất</div>
            <div className="text-sm text-gray-600 mt-1">
              Mỗi đợt giao có thể xuất từ kho khác nhau.
            </div>

            <div className="mt-4">
              <div className="text-xs text-gray-600 mb-1">Kho hàng</div>

              <select
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                disabled={loading || warehouses.length === 0}
              >
                {warehouses.length === 0 ? (
                  <option value="">(Chưa có kho)</option>
                ) : (
                  warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))
                )}
              </select>

              {warehouses.length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  Ghi chú:{" "}
                  {warehouses.find((x) => x.id === warehouseId)?.note || "—"}
                </div>
              )}
            </div>

            {msg && (
              <div className="mt-3 text-sm text-gray-700">{msg}</div>
            )}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-lg border text-sm"
                disabled={loading}
              >
                Huỷ
              </button>

              <button
                type="button"
                onClick={onConfirm}
                disabled={loading || !warehouseId || warehouses.length === 0}
                className="px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-60"
              >
                {loading ? "Đang xác nhận..." : "Xác nhận & xuất kho"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
