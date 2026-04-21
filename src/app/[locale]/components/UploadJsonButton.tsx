'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

type BlogEntry = {
  slug: string;
  titleVi: string;
  titleEn: string;
  contentVi: string;
  contentEn: string;
  metaDescVi: string;
  metaDescEn: string;
  thumbnailUrl?: string;
  published?: boolean;
};

export default function UploadJsonButton() {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);

    try {
      const text = await file.text();
      const data: BlogEntry[] = JSON.parse(text);

      for (const entry of data) {
        const res = await fetch('/api/blog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: entry.slug,
            titleVi: entry.titleVi,
            titleEn: entry.titleEn,
            contentVi: entry.contentVi,
            contentEn: entry.contentEn,
            metaDescVi: entry.metaDescVi ?? '',
            metaDescEn: entry.metaDescEn ?? '',
            thumbnailUrl: entry.thumbnailUrl ?? '',
            published: entry.published ?? false,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Lỗi khi gửi slug "${entry.slug}": ${errorText}`);
        }
      }

      toast.success('🎉 Tải lên thành công!');
    } catch (err: any) {
      console.error(err);
      toast.error(`❌ Upload thất bại: ${err.message}`);
    } finally {
      setLoading(false);
      e.target.value = ''; // reset input
    }
  };

  return (
    <div className="mt-6">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Tải file JSON bài blog lên:
      </label>
      <div className="flex items-center gap-3">
        <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded cursor-pointer">
          {loading ? 'Đang tải...' : 'Chọn file JSON'}
          <input
            type="file"
            accept=".json"
            onChange={handleUpload}
            disabled={loading}
            className="hidden"
          />
        </label>
        {fileName && (
          <span className="text-sm text-gray-700 truncate max-w-[300px]">
            📄 Đã chọn: <strong>{fileName}</strong>
          </span>
        )}
      </div>
    </div>
  );
}
