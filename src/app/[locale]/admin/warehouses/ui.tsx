"use client";

import { useState } from "react";

type Row = {
  id: string;
  name: string;
  note?: string | null;
  createdAt?: string | Date;
};

export default function WarehousesClient(props: {
  locale: string;
  initialRows: Row[];
}) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<Row[]>(props.initialRows || []);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const create = async () => {
    setMsg(null);
    const n = name.trim();
    if (!n) return setMsg("Vui lòng nhập tên kho.");

    setLoading(true);
    try {
      const res = await fetch("/api/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Create warehouse failed");

      // reload list nhanh (mvp)
      const res2 = await fetch("/api/warehouses", { cache: "no-store" });
      const json2 = await res2.json();
      setRows(json2.rows || []);

      setName("");
      setNote("");
      setMsg("✅ Đã tạo kho.");
    } catch (e: any) {
      setMsg(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-xl p-4 bg-white">
        <div className="font-semibold">Tạo kho mới</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div>
            <div className="text-xs text-gray-600">Tên kho</div>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Kho xưởng / Kho thành phẩm / Kho nguyên liệu"
            />
          </div>
          <div>
            <div className="text-xs text-gray-600">Ghi chú</div>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: để hàng xuất khẩu"
            />
          </div>
        </div>

        {msg && <div className="mt-3 text-sm text-gray-700">{msg}</div>}

        <div className="mt-3 flex justify-end">
          <button
            onClick={create}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-black text-white"
          >
            {loading ? "Đang tạo..." : "Tạo kho"}
          </button>
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden bg-white">
        <div className="bg-gray-50 px-4 py-3 font-semibold">Danh sách kho</div>
        <div className="divide-y">
          {rows.map((r) => (
            <div key={r.id} className="px-4 py-3">
              <div className="font-medium">{r.name}</div>
              {r.note ? <div className="text-xs text-gray-600">{r.note}</div> : null}
            </div>
          ))}
          {rows.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-600">Chưa có kho nào.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
