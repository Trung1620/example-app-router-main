"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type WarehouseLite = {
  id: string;
  name: string;
  address: string | null;
};

type BalanceRow = {
  id: string;
  productId: string | null;
  variantId: string | null;
  qty: number;
  updatedAt: string;
  product: {
    id: string;
    nameVi: string | null;
    nameEn: string | null;
    brand: string;
    category: string;
    priceVnd: number | null;
    imageUrl: string | null;
  } | null;
  variant: {
    id: string;
    sku: string;
    name: string | null;
    size: string | null;
    color: string | null;
    priceVnd: number | null;
  } | null;
  warehouse: { id: string; name: string };
};

export default function BalanceClient(props: {
  warehouses: WarehouseLite[];
  initialWarehouseId: string;
}) {
  const r = useRouter();

  const [warehouseId, setWarehouseId] = useState(props.initialWarehouseId);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<BalanceRow[]>([]);
  const [isPending, startTransition] = useTransition();

  const hasWarehouses = props.warehouses.length > 0;

  const load = async (wid: string) => {
    if (!wid) return;

    setErr(null);

    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/stock-balance?warehouseId=${encodeURIComponent(wid)}`,
          { cache: "no-store" }
        );

        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Load balance failed");

        setItems(Array.isArray(json.items) ? json.items : []);
      } catch (e: any) {
        setItems([]);
        setErr(e?.message || "Load balance failed");
      }
    });
  };


  useEffect(() => {
    if (!hasWarehouses) return;
    if (!warehouseId) return;
    load(warehouseId);
  }, [warehouseId, hasWarehouses]);

  const totalSku = items.length;
  const totalQty = useMemo(() => items.reduce((s, x) => s + (x.qty || 0), 0), [items]);

  const onChangeWarehouse = (id: string) => {
    setWarehouseId(id);
    r.replace(`?warehouseId=${encodeURIComponent(id)}`);
  };

  if (!hasWarehouses) {
    return (
      <div className="border rounded-xl p-4 bg-white">
        <div className="font-medium">Chưa có kho</div>
        <div className="text-sm text-gray-600 mt-1">
          Bạn hãy tạo kho trước (Warehouses) rồi quay lại trang Tồn kho.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row gap-3 md:items-end">
        <div className="w-full md:w-[360px]">
          <div className="text-xs text-gray-600">Chọn kho</div>
          <select
            className="mt-1 w-full border rounded-lg px-3 py-2 bg-white"
            value={warehouseId}
            onChange={(e) => onChangeWarehouse(e.target.value)}
          >
            {props.warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 text-sm">
          <div className="px-3 py-2 border rounded-lg bg-white">
            SKU: <b>{totalSku}</b>
          </div>
          <div className="px-3 py-2 border rounded-lg bg-white">
            Tổng SL: <b>{totalQty}</b>
          </div>
          <button
            className="px-3 py-2 border rounded-lg bg-white"
            onClick={() => load(warehouseId)}
            disabled={isPending}
          >
            {isPending ? "Đang tải..." : "Tải lại"}
          </button>
        </div>
      </div>

      <div className="border rounded-xl bg-white overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold">Danh sách tồn</div>
          {isPending && <div className="text-sm text-gray-600">Đang tải...</div>}
        </div>

        {err && <div className="p-4 text-sm text-red-600">{err}</div>}

        {!isPending && !err && items.length === 0 && (
          <div className="p-4 text-sm text-gray-600">Kho này chưa có tồn kho.</div>
        )}

        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="text-left px-4 py-2">Sản phẩm</th>
                  <th className="text-left px-4 py-2">SKU / Variant</th>
                  <th className="text-right px-4 py-2">Tồn</th>
                  <th className="text-left px-4 py-2">Cập nhật</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
                          {row.product?.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={row.product.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-xs text-gray-400">No img</div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {row.product?.nameVi ||
                              row.product?.nameEn ||
                              row.variant?.name ||
                              row.product?.id ||
                              row.variant?.id ||
                              "N/A"}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {(row.product?.brand || "") && (row.product?.category || "")
                              ? `${row.product?.brand} • ${row.product?.category}`
                              : row.product?.category || row.product?.brand || ""}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-2 text-gray-700">
                      {row.variant ? (
                        <div className="space-y-0.5">
                          <div className="font-medium">{row.variant.sku}</div>
                          <div className="text-xs text-gray-500">
                            {[row.variant.size, row.variant.color].filter(Boolean).join(" • ") || "-"}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">—</span>
                      )}
                    </td>

                    <td className="px-4 py-2 text-right">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-900 text-white">
                        {row.qty}
                      </span>
                    </td>

                    <td className="px-4 py-2 text-gray-700">
                      {new Date(row.updatedAt).toLocaleString("vi-VN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
