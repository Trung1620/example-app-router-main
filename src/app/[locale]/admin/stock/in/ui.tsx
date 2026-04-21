"use client";

import { useMemo, useState } from "react";

type WarehouseOpt = { id: string; name: string };
type ProductOpt = { id: string; nameVi: string; sku?: string; size?: string };

export default function StockInClient(props: {
  locale: string;
  warehouses: WarehouseOpt[];
  products: ProductOpt[];
}) {
  const [warehouseId, setWarehouseId] = useState(props.warehouses[0]?.id || "");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<ProductOpt | null>(null);
  const [qty, setQty] = useState<number>(0);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return props.products.slice(0, 30);
    return props.products
      .filter((p) => {
        const s = `${p.nameVi} ${p.sku || ""} ${p.size || ""}`.toLowerCase();
        return s.includes(t);
      })
      .slice(0, 30);
  }, [q, props.products]);

  const submit = async () => {
    setMsg(null);
    if (!warehouseId) return setMsg("Chưa chọn kho.");
    if (!selected) return setMsg("Chưa chọn sản phẩm.");
    if (!qty || qty <= 0) return setMsg("Số lượng phải > 0.");

    setLoading(true);
    try {
      const res = await fetch("/api/stock-moves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId,
          type: "IN",
          note,
          items: [{ productId: selected.id, qty }],
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Create stock move failed");

      setMsg("✅ Đã nhập kho thành công.");
      setSelected(null);
      setQty(0);
      setNote("");
      setQ("");
    } catch (e: any) {
      setMsg(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-xl p-4 bg-white space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <div className="text-xs text-gray-600">Kho</div>
          <select
            className="mt-1 w-full border rounded-lg px-3 py-2"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
          >
            {props.warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <div className="text-xs text-gray-600">Tìm sản phẩm (tên / SKU / size)</div>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Gõ để tìm..."
          />
          <div className="mt-2 border rounded-lg max-h-56 overflow-auto">
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelected(p)}
                className={`w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-gray-50 ${
                  selected?.id === p.id ? "bg-gray-50" : ""
                }`}
              >
                <div className="font-medium">{p.nameVi}</div>
                <div className="text-xs text-gray-600">
                  {p.sku ? `SKU: ${p.sku}` : ""}
                  {p.size ? ` • Size: ${p.size}` : ""}
                </div>
              </button>
            ))}
            {filtered.length === 0 && <div className="px-3 py-3 text-sm text-gray-600">Không thấy sản phẩm.</div>}
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-3">
        <div className="text-sm font-semibold">Sản phẩm đã chọn</div>
        {selected ? (
          <div className="mt-2 text-sm">
            <div className="font-medium">{selected.nameVi}</div>
            <div className="text-xs text-gray-600">
              {selected.sku ? `SKU: ${selected.sku}` : ""}
              {selected.size ? ` • Size: ${selected.size}` : ""}
            </div>
          </div>
        ) : (
          <div className="mt-2 text-sm text-gray-600">Chưa chọn.</div>
        )}

        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-gray-600">Số lượng nhập</div>
            <input
              type="number"
              min={0}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value) || 0)}
            />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-gray-600">Ghi chú</div>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập từ NCC / lô hàng / ghi chú..."
            />
          </div>
        </div>

        {msg && <div className="mt-3 text-sm text-gray-700">{msg}</div>}

        <div className="mt-3 flex justify-end">
          <button
            onClick={submit}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-black text-white"
          >
            {loading ? "Đang lưu..." : "Xác nhận nhập kho"}
          </button>
        </div>
      </div>
    </div>
  );
}
