 "use client";

import React from "react";

type Variant = {
  id: string;
  sku: string;
  name?: string | null;
  size?: string | null;
  color?: string | null;
  priceVnd?: number | null;
  productId?: string | null;
};

export default function VariantSelect({
  value,
  onPick,
}: {
  value?: string;
  onPick: (v: Variant | null) => void;
}) {
  const [items, setItems] = React.useState<Variant[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/variants");
        const json = await res.json();
        if (!cancelled) setItems(json.items || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <select
      className="border rounded px-2 py-2 text-sm w-full"
      value={value || ""}
      onChange={(e) => {
        const id = e.target.value;
        const v = items.find((x) => x.id === id) || null;
        onPick(v);
      }}
      disabled={loading}
    >
      <option value="">{loading ? "Đang tải variant..." : "Chọn Variant/SKU"}</option>
      {items.map((v) => (
        <option key={v.id} value={v.id}>
          {v.sku}
          {v.name ? ` • ${v.name}` : ""}
          {v.size ? ` • ${v.size}` : ""}
          {v.color ? ` • ${v.color}` : ""}
        </option>
      ))}
    </select>
  );
}
