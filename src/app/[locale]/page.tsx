// src/app/[locale]/page.tsx
import { getTranslations } from 'next-intl/server';
import Container from './components/Container';
import HomeBannerCarousel, { BannerProduct } from './components/HomeBannerCarousel';

import ProductCard from './components/products/ProductCard';
import NullData from './components/NullData';
import getProducts from '@/actions/getProducts';
import HomeBlogSection from './components/HomeBlogSection';
import { getBlogs } from '../../actions/getBlogs';
import ExportedCountries from './components/ExportedCountries';
import prisma from '@/libs/prismadb';

// 👉 kiểu props theo style "params/searchParams là Promise"
type HomePageProps = {
  params: Promise<{ locale: 'vi' | 'en' }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

// 👉 Kiểu cho dữ liệu banner lấy từ Prisma
type BannerProductFromDb = {
  id: string;
  nameVi: string | null;
  priceVnd: number | null;
  images: { url: string }[];
};

export async function generateStaticParams() {
  return [{ locale: 'vi' }, { locale: 'en' }];
}

export default async function HomePage({ params, searchParams }: HomePageProps) {
  const { locale } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};

  const t = await getTranslations({ locale, namespace: 'Home' });

  const category =
    typeof resolvedSearchParams.category === 'string'
      ? resolvedSearchParams.category
      : null;

  const searchTerm =
    typeof resolvedSearchParams.searchTerm === 'string'
      ? resolvedSearchParams.searchTerm
      : null;

  const products = await getProducts({ category, searchTerm, locale });

  /** ===== BANNER ===== */
  let bannerItems: BannerProduct[] = [];
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'site' },
      select: { homeBannerProductIds: true },
    });

    const ids = settings?.homeBannerProductIds ?? [];

    if (ids.length > 0) {
      const bannerProducts = (await prisma.product.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          nameVi: true,
          priceVnd: true,
          images: { select: { url: true } },
        },
      })) as BannerProductFromDb[];

      bannerItems = ids
        .map((id) => bannerProducts.find((p) => p.id === id))
        .filter(Boolean)
        .map((p) => ({
          id: p!.id,
          slug: p!.id,
          name: p!.nameVi ?? 'Sản phẩm',
          price: Number(p!.priceVnd ?? 0),
          imageUrl: p!.images?.[0]?.url ?? '/placeholder.png',
        }));
    }
  } catch {
    bannerItems = [];
  }

  const rawBlogs = await getBlogs({ locale });

  const blogs = rawBlogs
    .filter((b: any) => b.titleVi && b.titleEn)
    .map((blog: any) => ({
      id: blog.id,
      slug: blog.slug,
      thumbnailUrl: blog.thumbnailUrl ?? '',
      title: { vi: blog.titleVi, en: blog.titleEn },
      meta_description: {
        vi: blog.metaDescVi ?? '',
        en: blog.metaDescEn ?? '',
      },
    }));

  if (!products || products.length === 0) {
    return <NullData title={t('noProducts')} />;
  }

  return (
    // ✅ padding nhỏ trên mobile, lớn dần trên desktop
    <div className="px-3 py-4 sm:px-6 sm:py-8">
      {/* ❗ Container vẫn giữ, nhưng grid sẽ quyết định layout */}
      <Container>
        {bannerItems.length > 0 && (
          <HomeBannerCarousel items={bannerItems} label={t('newCollections')} />
        )}

        {/* ✅ GRID CHUẨN MOBILE 2 CỘT */}
        <div
          className="
            mt-4
            grid
            grid-cols-2
            gap-3
            sm:grid-cols-3
            sm:gap-4
            lg:grid-cols-4
            xl:grid-cols-5
          "
        >
          {products.map((product: any) => (
            <ProductCard key={product.id} data={product} />
          ))}
        </div>

        {blogs.length > 0 && (
          <HomeBlogSection locale={locale} blogs={blogs} />
        )}

        <ExportedCountries />
      </Container>
    </div>
  );
}
