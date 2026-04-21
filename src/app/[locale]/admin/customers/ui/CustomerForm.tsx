"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CustomerType = "company" | "individual" | "";

export type CustomerFormInitial = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  taxId?: string | null;
  address?: string | null;
  country?: string | null;
  city?: string | null;

  type?: string | null;
  contactName?: string | null;
  groupName?: string | null;
  tags?: string[] | null;
  notes?: string | null;
};

type Props = {
  mode: "create" | "edit";
  initial?: CustomerFormInitial;
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  taxId: string;
  address: string;
  country: string;
  city: string;

  type: CustomerType;
  contactName: string;
  groupName: string;
  tagsText: string; // "a, b, c"
  notes: string;
};

function normalizeTags(tagsText: string): string[] {
  const parts = tagsText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // remove duplicates (case-insensitive), keep original casing of first appearance
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of parts) {
    const key = t.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(t);
    }
  }
  return out;
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="space-y-1">
      <div className="text-sm font-medium text-gray-700">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="space-y-1">
      <div className="text-sm font-medium text-gray-700">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
      />
    </label>
  );
}

export default function CustomerForm({ mode, initial }: Props) {
  const router = useRouter();

  const initialState: FormState = useMemo(() => {
    const tagsText = (initial?.tags || []).join(", ");

    const rawType = (initial?.type || "").toLowerCase();
    const type: CustomerType =
      rawType === "company" || rawType === "individual" ? (rawType as any) : "";

    return {
      name: initial?.name || "",
      email: initial?.email || "",
      phone: initial?.phone || "",
      companyName: initial?.companyName || "",
      taxId: initial?.taxId || "",
      address: initial?.address || "",
      country: initial?.country || "VN",
      city: initial?.city || "",

      type,
      contactName: initial?.contactName || "",
      groupName: initial?.groupName || "",
      tagsText,
      notes: initial?.notes || "",
    };
  }, [initial]);

  const [form, setForm] = useState<FormState>(initialState);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>("");

  const tagsPreview = useMemo(() => normalizeTags(form.tagsText), [form.tagsText]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Vui lòng nhập tên khách hàng.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      companyName: form.companyName.trim() || null,
      taxId: form.taxId.trim() || null,
      address: form.address.trim() || null,
      country: form.country.trim() || "VN",
      city: form.city.trim() || null,

      type: form.type || null,
      contactName: form.contactName.trim() || null,
      groupName: form.groupName.trim() || null,
      tags: normalizeTags(form.tagsText),
      notes: form.notes.trim() || null,
    };

    try {
      setSaving(true);

      const url =
        mode === "create"
          ? "/api/customers"
          : `/api/customers/${encodeURIComponent(initial!.id)}`;

      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Lưu thất bại. Vui lòng thử lại.");
      }

      router.refresh();
      router.push("../customers"); // từ /customers/new hoặc /customers/[id] quay về list
    } catch (err: any) {
      setError(err?.message || "Có lỗi xảy ra.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (mode !== "edit") return;
    setError("");

    const ok = window.confirm("Xoá khách hàng này? Hành động không thể hoàn tác.");
    if (!ok) return;

    try {
      setDeleting(true);

      const res = await fetch(`/api/customers/${encodeURIComponent(initial!.id)}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Xoá thất bại. Vui lòng thử lại.");
      }

      router.refresh();
      router.push("../customers");
    } catch (err: any) {
      setError(err?.message || "Có lỗi xảy ra.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-xl border bg-white p-4 space-y-4">
        {/* Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label="Tên khách hàng *"
            value={form.name}
            onChange={(v) => set("name", v)}
            placeholder="VD: Minh Khôi / Anh Tuấn / Cty ABC…"
          />
          <Input
            label="Công ty (tuỳ chọn)"
            value={form.companyName}
            onChange={(v) => set("companyName", v)}
            placeholder="VD: CÔNG TY TNHH …"
          />
          <label className="space-y-1">
            <div className="text-sm font-medium text-gray-700">Loại khách</div>
            <select
              value={form.type}
              onChange={(e) => set("type", e.target.value as CustomerType)}
              className="h-10 w-full rounded-lg border px-3 text-sm bg-white outline-none focus:ring-2 focus:ring-black/10"
            >
              <option value="">(Chưa chọn)</option>
              <option value="company">Công ty</option>
              <option value="individual">Cá nhân</option>
            </select>
          </label>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label="Người liên hệ"
            value={form.contactName}
            onChange={(v) => set("contactName", v)}
            placeholder="VD: Anh Hùng / Chị Lan…"
          />
          <Input
            label="Số điện thoại"
            value={form.phone}
            onChange={(v) => set("phone", v)}
            placeholder="VD: 09xxxxxxxx"
          />
          <Input
            label="Email"
            value={form.email}
            onChange={(v) => set("email", v)}
            placeholder="VD: abc@gmail.com"
            type="email"
          />
        </div>

        {/* Row 3 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label="Mã số thuế (MST)"
            value={form.taxId}
            onChange={(v) => set("taxId", v)}
            placeholder="VD: 010xxxxxxx"
          />
          <Input
            label="Nhóm khách"
            value={form.groupName}
            onChange={(v) => set("groupName", v)}
            placeholder="VD: Khách sỉ / Đại lý / VIP…"
          />
          <Input
            label="Tags (cách nhau bằng dấu phẩy)"
            value={form.tagsText}
            onChange={(v) => set("tagsText", v)}
            placeholder="VD: mid-autumn, repeat, export"
          />
        </div>

        {/* Tags preview */}
        {tagsPreview.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tagsPreview.slice(0, 12).map((t) => (
              <span
                key={t}
                className="rounded-full border px-2 py-0.5 text-xs bg-gray-50"
              >
                {t}
              </span>
            ))}
            {tagsPreview.length > 12 && (
              <span className="text-xs text-gray-500">+{tagsPreview.length - 12}</span>
            )}
          </div>
        )}

        {/* Address */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label="Quốc gia"
            value={form.country}
            onChange={(v) => set("country", v)}
            placeholder="VN"
          />
          <Input
            label="Tỉnh/Thành phố"
            value={form.city}
            onChange={(v) => set("city", v)}
            placeholder="VD: Hà Nội"
          />
          <Input
            label="Địa chỉ"
            value={form.address}
            onChange={(v) => set("address", v)}
            placeholder="Số nhà, đường, phường/xã…"
          />
        </div>

        <Textarea
          label="Ghi chú (notes)"
          value={form.notes}
          onChange={(v) => set("notes", v)}
          placeholder="VD: Khách hay đặt giỏ đỏ, cần báo trước 7 ngày, yêu cầu đóng gói carton 5 lớp…"
          rows={5}
        />

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => router.push("../customers")}
          className="h-10 rounded-lg border px-4 text-sm hover:bg-gray-50"
          disabled={saving || deleting}
        >
          Huỷ
        </button>

        <div className="flex gap-2">
          {mode === "edit" && (
            <button
              type="button"
              onClick={onDelete}
              className="h-10 rounded-lg border border-red-200 px-4 text-sm text-red-700 hover:bg-red-50"
              disabled={saving || deleting}
            >
              {deleting ? "Đang xoá..." : "Xoá"}
            </button>
          )}

          <button
            type="submit"
            className="h-10 rounded-lg bg-black px-4 text-sm text-white hover:opacity-90 disabled:opacity-60"
            disabled={saving || deleting}
          >
            {saving ? "Đang lưu..." : mode === "create" ? "Tạo khách" : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </form>
  );
}
