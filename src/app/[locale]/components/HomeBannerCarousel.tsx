'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type {JSX} from 'react';

export type BannerProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  salePrice?: number;
  imageUrl: string;
  highlight?: string;
};

function formatVND(n: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(n);
}

/* ===== Arrow Button (SVG mảnh – trắng – sang) ===== */
function ArrowButton({
  direction,
  onClick
}: {
  direction: 'left' | 'right';
  onClick: () => void;
}) {
  return (
    <button
      aria-label={direction === 'left' ? 'Prev' : 'Next'}
      onClick={onClick}
      className={`
        absolute top-1/2 -translate-y-1/2 z-10
        w-11 h-11 rounded-full
        bg-white/70 backdrop-blur
        hover:bg-white
        transition
        flex items-center justify-center
        shadow-md
        ${direction === 'left' ? 'left-4' : 'right-4'}
      `}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#0f172a"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {direction === 'left' ? (
          <polyline points="15 18 9 12 15 6" />
        ) : (
          <polyline points="9 18 15 12 9 6" />
        )}
      </svg>
    </button>
  );
}

type Props = {
  items: BannerProduct[];
  autoPlayMs?: number;
  label?: string;
};

const HomeBannerCarousel: React.FC<Props> = ({
  items,
  autoPlayMs = 5000,
  label
}: Props): JSX.Element => {
  const listRef = React.useRef<HTMLDivElement>(null);
  const [index, setIndex] = React.useState(0);

  const goTo = (i: number) => {
    if (!listRef.current || items.length === 0) return;
    const clamped = (i + items.length) % items.length;
    const width = listRef.current.clientWidth;
    listRef.current.scrollTo({
      left: width * clamped,
      behavior: 'smooth'
    });
    setIndex(clamped);
  };

  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  React.useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(next, autoPlayMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, items.length, autoPlayMs]);

  React.useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const onScroll = () => {
      const w = el.clientWidth || 1;
      const i = Math.round(el.scrollLeft / w);
      setIndex(i);
    };

    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-emerald-700 to-emerald-400">
      {/* ===== Arrows ===== */}
      {items.length > 1 && (
        <>
          <ArrowButton direction="left" onClick={prev} />
          <ArrowButton direction="right" onClick={next} />
        </>
      )}

      {/* ===== Slides ===== */}
      <div
        ref={listRef}
        className="relative w-full overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar"
      >
        <div className="flex w-full" style={{minWidth: '100%'}}>
          {items.map((p) => (
            <article
              key={p.id}
              className="
                snap-start shrink-0 w-full
                grid grid-cols-1 md:grid-cols-[1.1fr_1fr]
                items-center gap-6
                px-6 md:px-10
                py-8 md:py-12
              "
              style={{minWidth: '100%'}}
            >
              {/* ===== Text ===== */}
              <div className="text-center md:text-left text-white">
                {label && (
                  <p className="text-white/90 text-sm md:text-base mb-1">
                    {label}
                  </p>
                )}

                <h2 className="text-2xl md:text-4xl font-bold mb-2 line-clamp-2">
                  {p.name}
                </h2>

                {p.highlight && (
                  <div className="inline-block px-3 py-1 rounded-full bg-yellow-300 text-emerald-900 font-semibold text-sm mb-3">
                    {p.highlight}
                  </div>
                )}

                <div className="flex items-baseline gap-3 justify-center md:justify-start mb-4">
                  {p.salePrice ? (
                    <>
                      <span className="text-3xl font-extrabold text-white">
                        {formatVND(p.salePrice)}
                      </span>
                      <span className="text-lg line-through text-white/70">
                        {formatVND(p.price)}
                      </span>
                    </>
                  ) : (
                    <span className="text-3xl font-extrabold text-white">
                      {formatVND(p.price)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 justify-center md:justify-start">
                  <Link
                    href={`/product/${p.slug}`}
                    className="rounded-xl bg-white text-emerald-700 font-semibold px-5 py-2 hover:shadow"
                  >
                    Xem chi tiết
                  </Link>
                  <Link
                    href={`/product/${p.slug}`}
                    className="rounded-xl border border-white/80 text-white font-medium px-5 py-2 hover:bg-white/10"
                  >
                    Thêm vào giỏ
                  </Link>
                </div>
              </div>

              {/* ===== Image (crop full + bo góc) ===== */}
              <div className="relative aspect-[4/3] md:aspect-[16/10] w-full">
                <div className="relative w-full h-full rounded-2xl overflow-hidden bg-white/10">
                  {/* fade mép */}
                  <div
                    className="
        absolute inset-0 z-10 pointer-events-none
        bg-gradient-to-r
        from-emerald-700/35
        via-transparent
        to-emerald-400/35
      "
                  />

                  <Image
                    src={p.imageUrl || '/placeholder.png'}
                    alt={p.name}
                    fill
                    sizes="(max-width:768px) 100vw, 50vw"
                    className="
        object-cover
        transition-transform duration-300
        group-hover:scale-[1.03]
      "
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* ===== Dots ===== */}
      {items.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => goTo(i)}
              className={`h-2.5 rounded-full transition-all ${
                index === i
                  ? 'w-6 bg-white'
                  : 'w-2.5 bg-white/60 hover:bg-white'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default HomeBannerCarousel;
