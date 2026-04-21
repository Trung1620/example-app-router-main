import {redirect} from "next/navigation";
import {cookies} from "next/headers";
import prismadb from "@/libs/prismadb";
import getCurrentUser from "@/actions/getCurrentUser";
import SelectOrgClient from "./ui";

type Props = {
  params: Promise<{locale: string}>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

function pickFirst(
  value: string | string[] | undefined
): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

function normalizeNextPath(nextValue: string | undefined, locale: string) {
  const fallback = `/${locale}/admin`;

  if (!nextValue) return fallback;

  const trimmed = nextValue.trim();
  if (!trimmed) return fallback;

  // Chỉ cho phép internal path
  if (!trimmed.startsWith("/")) return fallback;

  // Chặn protocol-relative như //evil.com
  if (trimmed.startsWith("//")) return fallback;

  return trimmed;
}

export default async function SelectOrgPage({params, searchParams}: Props) {
  const {locale} = await params;

  const user = await getCurrentUser();
  if (!user?.id) {
    redirect(`/${locale}/login`);
  }

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get("active_org_id")?.value ?? null;

  const raw = searchParams ? await searchParams : {};

  const next = normalizeNextPath(pickFirst(raw?.next), locale);
  const force = pickFirst(raw?.force) === "1";

  // Đã có org active và không phải chế độ đổi org
  if (activeOrgId && !force) {
    redirect(next);
  }

  const memberships = await prismadb.orgMember.findMany({
    where: {userId: user.id},
    include: {
      org: {
        select: {
          id: true,
          name: true,
          code: true
        }
      }
    },
    orderBy: {createdAt: "desc"}
  });

  const orgs = memberships.map((m) => ({
    id: m.org.id,
    name: m.org.name,
    code: m.org.code || null,
    role: m.role
  }));

  if (orgs.length === 0) {
    redirect(`/${locale}/admin`);
  }

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-6">
      <div className="text-2xl font-bold">Chọn tổ chức (Org)</div>
      <div className="mt-1 text-sm text-gray-600">
        Bạn cần chọn Org để tiếp tục vào trang quản trị.
      </div>

      {activeOrgId ? (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Bạn đang đổi sang tổ chức khác.
        </div>
      ) : null}

      <div className="mt-6">
        <SelectOrgClient locale={locale} orgs={orgs} nextPath={next} />
      </div>
    </div>
  );
}