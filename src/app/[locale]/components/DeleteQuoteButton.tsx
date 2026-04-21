"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function DeleteQuoteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (!confirm("Bạn có chắc muốn xóa báo giá này?")) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/quotes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "Xóa thất bại");
        return;
      }
      // refresh lại danh sách
      startTransition(() => router.refresh());
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      className="border px-3 py-1 text-red-600 hover:bg-red-50 disabled:opacity-60"
      disabled={loading || pending}
      title="Xóa báo giá"
    >
      {loading || pending ? "Đang xóa..." : "Xóa"}
    </button>
  );
}
