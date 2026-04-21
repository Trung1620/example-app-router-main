'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type BlogPost = {
  id: string;
  slug: string;
  title: { vi: string; en: string };
  meta_description: { vi: string; en: string };
  thumbnailUrl?: string;
};

export default function HomeBlogSection({
  blogs,
  locale,
}: {
  blogs: BlogPost[];
  locale: 'vi' | 'en';
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const titleText = locale === 'vi' ? 'Tin tức mới nhất' : 'Latest Blog Posts';

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 320; // ~min-w 280 + gap/padding
    el.scrollBy({ left: direction === 'left' ? -cardWidth : cardWidth, behavior: 'smooth' });
  };

  if (!blogs || blogs.length === 0) return null;

  return (
    <div className="py-12">
      <div className="flex justify-between items-center mb-4 px-2">
        <h2 className="text-2xl font-bold">{titleText}</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label="Previous posts"
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label="Next posts"
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* đặt ref ở container có overflow */}
      <div
        ref={scrollRef}
        className="overflow-x-auto scrollbar-hidden px-2 scroll-smooth"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        <div className="flex gap-4">
          {blogs.map((blog) => (
            <div
              key={blog.id}
              className="min-w-[280px] max-w-[280px] flex-shrink-0 bg-white rounded-lg shadow-md snap-start"
            >
              <Link href={`/${locale}/blog/${blog.slug}`} className="block group">
                <div className="relative w-full h-48 rounded-t-lg overflow-hidden">
                  <Image
                    src={blog.thumbnailUrl || '/placeholder.jpg'}
                    alt={blog.title[locale] || 'Blog thumbnail'}
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 280px, 320px"
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-base font-semibold line-clamp-2 transition-colors group-hover:text-teal-600">
                    {blog.title[locale]}
                  </h3>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                    {blog.meta_description[locale] || ''}
                  </p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
