import prismadb from "@/libs/prismadb";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; orgCode: string }> };

export default async function ShopByOrgPage({ params }: Props) {
  const { locale, orgCode } = await params;

  const org = await prismadb.org.findFirst({
    where: { code: orgCode } as any,
    select: { id: true, name: true, code: true },
  } as any);

  if (!org) return <div className="p-6">Không tìm thấy shop.</div>;

  const products = await prismadb.product.findMany({
    where: { orgId: org.id, status: "ACTIVE" } as any,
    orderBy: { createdAt: "desc" },
    include: { images: true },
    take: 60,
  } as any);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="text-2xl font-bold">{org.name}</div>
      <div className="text-sm text-gray-600 mt-1">Sản phẩm đang bán</div>

      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((p: any) => (
          <Link
            key={p.id}
            href={`/${locale}/shop/${orgCode}/product/${p.slug || p.id}`}
            className="border rounded-xl p-3 bg-white hover:shadow"
          >
            <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden">
              {p.images?.[0]?.url ? (
                <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />
              ) : null}
            </div>

            <div className="mt-2 text-sm font-medium line-clamp-2">
              {p.nameVi || p.nameEn || "—"}
            </div>
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="text-sm text-gray-600 mt-6">Chưa có sản phẩm ACTIVE.</div>
      ) : null}
    </div>
  );
}
