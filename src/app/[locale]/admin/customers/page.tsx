// src/app/[locale]/admin/customers/page.tsx
import Link from "next/link";
import prismadb from "@/libs/prismadb";
import { getOrgIdOrThrowServer } from "@/libs/getOrgId";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function pick1(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminCustomersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = (await searchParams) || {};
  const orgId = await getOrgIdOrThrowServer();

  const q = (pick1(sp.q) || "").trim();
  const group = (pick1(sp.group) || "").trim();
  const tag = (pick1(sp.tag) || "").trim();

  const where: any = { orgId };

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { companyName: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { taxId: { contains: q, mode: "insensitive" } },
    ];
  }
  if (group) where.groupName = { equals: group, mode: "insensitive" };
  if (tag) where.tags = { has: tag };

  const customers = await prismadb.customer.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  // quick facets (optional)
  const groups = Array.from(new Set(customers.map((c: any) => c.groupName).filter(Boolean)));
  const tags = Array.from(new Set(customers.flatMap((c: any) => c.tags || []).filter(Boolean)));

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Customers</h1>
          <div className="text-sm text-gray-600">CRM khách hàng</div>
        </div>

        <Link
          href={`/${locale}/admin/customers/new`}
          className="px-4 py-2 rounded-lg border text-sm"
        >
          + Tạo khách hàng
        </Link>
      </div>

      {/* Filters */}
      <form className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Tìm: tên / công ty / sđt / email / MST..."
          className="border rounded-lg px-3 py-2 text-sm"
        />

        <select
          name="group"
          defaultValue={group}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">— Nhóm khách —</option>
          {groups.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>

        <select
          name="tag"
          defaultValue={tag}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">— Tag —</option>
          {tags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <button className="px-4 py-2 rounded-lg border text-sm">Lọc</button>
      </form>

      {/* Table */}
      <div className="overflow-x-auto border rounded-xl bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Tên</th>
              <th className="p-3 text-left">Công ty</th>
              <th className="p-3 text-left">SĐT</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Nhóm</th>
              <th className="p-3 text-left">Tags</th>
              <th className="p-3 text-right">Sửa</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td className="p-4 text-gray-600" colSpan={7}>
                  Chưa có khách hàng.
                </td>
              </tr>
            ) : (
              customers.map((c: any) => (
                <tr key={c.id} className="border-t">
                  <td className="p-3">
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-gray-600">
                      {c.taxId ? `MST: ${c.taxId}` : ""}
                    </div>
                  </td>
                  <td className="p-3">{c.companyName || "—"}</td>
                  <td className="p-3">{c.phone || "—"}</td>
                  <td className="p-3">{c.email || "—"}</td>
                  <td className="p-3">{c.groupName || "—"}</td>
                  <td className="p-3">
                    {(c.tags || []).slice(0, 4).map((t: string) => (
                      <span
                        key={t}
                        className="inline-flex mr-1 mb-1 px-2 py-0.5 border rounded-full text-xs"
                      >
                        {t}
                      </span>
                    ))}
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      className="px-3 py-2 rounded-lg border text-sm"
                      href={`/${locale}/admin/customers/${c.id}`}
                    >
                      Sửa
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
