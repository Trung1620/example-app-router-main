// src/app/[locale]/blog/[slug]/page.tsx
import prismadb from '@/libs/prismadb';
import { getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';

type AppLocale = (typeof routing.locales)[number]; // "en" | "vi"

// 👇 props kiểu mới: params là Promise
type BlogPostPageProps = {
  params: Promise<{ locale: AppLocale; slug: string }>;
};

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  // 🔥 BẮT BUỘC phải await params theo yêu cầu Next
  const { locale, slug } = await params;

  // Load i18n messages cho locale hiện tại
  const messages = await getMessages({ locale });

  // Lấy bài viết theo slug (chỉ notFound ở production nếu chưa publish)
  const post = await prismadb.blogPost.findUnique({
    where: { slug },
  });

  if (!post || (!post.published && process.env.NODE_ENV === 'production')) {
    notFound();
  }

  const title = locale === 'vi' ? post.titleVi : post.titleEn;
  const content = locale === 'vi' ? post.contentVi : post.contentEn;
  const metaDesc = locale === 'vi' ? post.metaDescVi : post.metaDescEn;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="max-w-4xl mx-auto py-10 p-4">
        <article>
          <h1 className="text-3xl font-bold mb-4">{title}</h1>
          {metaDesc ? <p className="text-gray-600 mb-6">{metaDesc}</p> : null}
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </article>
      </div>
    </NextIntlClientProvider>
  );
}
