import prismadb from "@/libs/prismadb";
import { Prisma } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; orgCode: string; slug: string }>;
};

const _productArgs = Prisma.validator<Prisma.ProductDefaultArgs>()({
  include: { images: true },
});

type ProductWithImages = Prisma.ProductGetPayload<typeof _productArgs>;

export default async function ShopProductPage({ params }: Props) {
  const { locale, orgCode, slug } = await params;

  const org = await prismadb.org.findFirst({
    where: { code: orgCode },
    select: { id: true, code: true, name: true },
  });

  if (!org) return <div className="p-6">Không tìm thấy shop.</div>;

  // ⚠️ Nếu bạn chưa có field slug trong Product:
  // - tạm thời dùng slug = id (org/product/[id])
  // - hoặc bạn thêm field slug vào schema rồi backfill sau
  const product = (await prismadb.product.findFirst({
    where: { orgId: org.id, id: slug }, // nếu có slug field thì đổi thành: slug
    include: { images: true },
  })) as ProductWithImages | null;

  if (!product) return <div className="p-6">Không tìm thấy sản phẩm.</div>;

  const hero = product.images?.[0]?.url || null;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      <Link href={`/${locale}/shop/${orgCode}`} className="text-sm underline">
        ← Quay lại shop
      </Link>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-2xl bg-white p-3">
          {hero ? (
            <div className="relative w-full aspect-square">
              <Image
                src={hero}
                alt={product.nameVi || product.nameEn || "Product"}
                fill
                className="object-cover rounded-xl"
              />
            </div>
          ) : (
            <div className="w-full aspect-square rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">
              No image
            </div>
          )}

          {product.images?.length > 1 ? (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {product.images.slice(0, 10).map((img) => (
                <div key={img.id} className="relative aspect-square">
                  <Image src={img.url} alt="thumb" fill className="object-cover rounded-lg" />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <div className="text-2xl font-bold">
            {product.nameVi || product.nameEn || "Sản phẩm"}
          </div>

          <div className="text-sm text-gray-600 mt-2">
            {product.descriptionVi || product.descriptionEn || ""}
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <div>
              <span className="font-semibold">Danh mục:</span> {product.category}
            </div>
            <div>
              <span className="font-semibold">Thương hiệu:</span> {product.brand}
            </div>
            {product.size ? (
              <div>
                <span className="font-semibold">Kích thước:</span> {product.size}
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex gap-3">
            <a
              href={`https://zalo.me/`} // TODO: bạn sẽ lấy zalo theo Org settings
              target="_blank"
              className="px-4 py-2 rounded-lg bg-black text-white"
            >
              Liên hệ Zalo
            </a>
            <a
              href={`mailto:`} // TODO: lấy email theo Org settings
              className="px-4 py-2 rounded-lg border"
            >
              Gửi yêu cầu báo giá
            </a>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            Shop: {org.name} ({org.code})
          </div>
        </div>
      </div>
    </div>
  );
}
