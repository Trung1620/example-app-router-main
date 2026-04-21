"use client";
import React from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";

type Product = {
  id: string;
  nameVi: string | null;
  // API có thể trả trực tiếp imageUrl (map sẵn) hoặc các field dưới đây:
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  images?: { url: string; alt?: string }[];
};

export default function AdminHomeBannerPage() {
  const router = useRouter();
  const { locale } = useParams() as { locale: "vi" | "en" };

  const [all, setAll] = React.useState<Product[] | null>(null);
  const [ids, setIds] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const safeJson = async (res: Response) => {
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const text = await res.text();
      throw new Error(`Server returned non-JSON (${res.status}). ${text.slice(0, 120)}`);
    }
    return res.json();
  };

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [idsRes, allRes] = await Promise.all([
        fetch("/api/admin/homebanner", { headers: { accept: "application/json" } }),
        fetch("/api/admin/products?limit=200", { headers: { accept: "application/json" } }),
      ]);

      if (idsRes.status === 401 || idsRes.status === 403) {
        router.push(`/${locale}/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
        return;
      }

      const idsJson: string[] = await safeJson(idsRes);
      const allJson: Product[] = await safeJson(allRes);

      setIds(idsJson);
      setAll(allJson);
    } catch (e: any) {
      setError(e?.message ?? "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  }, [router, locale]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggle = (id: string) => {
    setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  const move = (id: string, dir: -1 | 1) => {
    setIds((cur) => {
      const i = cur.indexOf(id);
      if (i < 0) return cur;
      const next = [...cur];
      const j = Math.max(0, Math.min(cur.length - 1, i + dir));
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const save = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/admin/homebanner", {
        method: "PUT",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify(ids),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Save failed ${res.status}`);
      }
      alert("Đã lưu danh sách HomeBanner!");
    } catch (e: any) {
      alert(e?.message ?? "Không thể lưu");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Đang tải...</div>;
  if (error)
    return (
      <div className="p-6 text-red-600 space-y-2">
        <div>Lỗi: {error}</div>
        <button onClick={fetchData} className="underline">
          Thử lại
        </button>
      </div>
    );
  if (!all) return <div className="p-6">Không có dữ liệu.</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Chọn sản phẩm hiển thị ở HomeBanner</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {all.map((p) => {
          const selected = ids.includes(p.id);
          // 👇 Ưu tiên imageUrl (API đã map), sau đó thumbnailUrl, rồi images[0].url
          const img = p.imageUrl ?? p.thumbnailUrl ?? p.images?.[0]?.url ?? "/placeholder.png";
          return (
            <div
              key={p.id}
              className={`border rounded-xl overflow-hidden ${selected ? "ring-2 ring-emerald-500" : ""}`}
            >
              <div className="relative aspect-square bg-gray-50">
                <Image src={img} alt={p.nameVi ?? "Product"} fill className="object-cover" />
              </div>
              <div className="p-3 space-y-2">
                <div className="text-sm font-semibold line-clamp-2">{p.nameVi ?? "Sản phẩm"}</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => move(p.id, -1)} className="px-2 py-1 border rounded">
                    ↑
                  </button>
                  <button onClick={() => move(p.id, 1)} className="px-2 py-1 border rounded">
                    ↓
                  </button>
                  <button
                    onClick={() => toggle(p.id)}
                    className={`ml-auto px-2 py-1 rounded ${
                      selected ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
                    }`}
                  >
                    {selected ? "Bỏ" : "Chọn"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? "Đang lưu..." : "Lưu HomeBanner"}
        </button>
        <button onClick={fetchData} className="px-5 py-2 rounded-xl border border-neutral-300">
          Tải lại
        </button>
      </div>
    </div>
  );
}
