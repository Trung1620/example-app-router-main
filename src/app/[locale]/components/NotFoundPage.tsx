// src/app/[locale]/not-found.tsx
'use client';

import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
      <h1 className="text-4xl font-bold mb-4">404 - Không tìm thấy trang</h1>
      <p className="text-lg text-gray-600 mb-6">
        Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
      </p>
      <Link
        href="/"
        className="bg-emerald-600 text-white px-6 py-2 rounded hover:bg-emerald-700 transition"
      >
        Quay về trang chủ
      </Link>
    </div>
  );
}
