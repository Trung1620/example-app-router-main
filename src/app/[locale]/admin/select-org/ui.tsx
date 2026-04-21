"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type OrgItem = {
  id: string;
  name: string;
  code: string | null;
  role: string;
};

export default function SelectOrgClient({
  locale,
  orgs,
  nextPath,
}: {
  locale: string;
  orgs: OrgItem[];
  nextPath: string;
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function choose(orgId: string) {
    setErr(null);
    setLoadingId(orgId);

    try {
      const r = await fetch("/api/orgs/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orgId }),
      });

      const j = await r.json().catch(() => null);

      if (!r.ok) {
        throw new Error(j?.error || `Failed (${r.status})`);
      }

      const safeNext =
        nextPath && nextPath.startsWith("/") ? nextPath : `/${locale}/admin`;

      startTransition(() => {
        router.push(safeNext);
        router.refresh();
      });
    } catch (e: any) {
      setErr(e?.message || "Cannot set active org");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3">
        {orgs.map((o) => {
          const disabled = !!loadingId || isPending;
          const isLoading = loadingId === o.id;

          return (
            <div
              key={o.id}
              className="flex items-center justify-between gap-4 rounded-xl border bg-white p-4"
            >
              <div className="min-w-0">
                <div className="truncate font-semibold">{o.name}</div>

                <div className="mt-1 text-xs text-gray-500">
                  {o.code ? `Code: ${o.code}` : "No code"} • Role: {o.role}
                </div>

                <div className="mt-1 break-all text-[11px] text-gray-400">
                  OrgId: {o.id}
                </div>
              </div>

              <button
                type="button"
                onClick={() => choose(o.id)}
                disabled={disabled}
                className="shrink-0 rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                {isLoading ? "Đang chọn..." : "Chọn"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="text-xs text-gray-500">
        Tip: Nếu bạn có nhiều Org, hãy chọn đúng Org bạn đang làm việc để dữ liệu
        kho/báo giá hiển thị chính xác.
      </div>
    </div>
  );
}