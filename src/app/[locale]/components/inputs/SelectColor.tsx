"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";

type ColorOption = {
  color: string;
  colorCode: string;
};

type Props = {
  item: ColorOption;
  addImageToState: (value: {
    color: string;
    colorCode: string;
    image: File | null;
  }) => void;
  removeImageFromState: (color: string) => void;
  isProductCreated: boolean;
  existingImageUrl?: string;
};

const SelectColor: React.FC<Props> = ({
  item,
  addImageToState,
  removeImageFromState,
  existingImageUrl,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(existingImageUrl ?? null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    addImageToState({
      color: item.color,
      colorCode: item.colorCode,
      image: file,
    });
  };

  useEffect(() => {
    return () => {
      if (preview && !existingImageUrl) URL.revokeObjectURL(preview);
    };
  }, [preview, existingImageUrl]);

  const handleImageError = () => {
    console.warn(`⚠️ Ảnh lỗi hoặc không tồn tại: ${preview}`);
    setPreview(null);
    removeImageFromState(item.color);
  };

  return (
    <div className="flex flex-col items-center border p-3 rounded-md shadow-sm bg-white">
      <div className="text-sm font-semibold mb-2">{item.color}</div>

      <div
        className="w-8 h-8 rounded-full mb-2 border"
        style={{ backgroundColor: item.colorCode }}
      />

      {preview && (
        <div className="relative w-24 h-24 mb-2">
          <Image
            src={preview}
            alt={`Preview ${item.color}`}
            fill
            className="object-cover rounded"
            onError={handleImageError}
          />
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFileChange}
      />
      <button
        type="button"
        className="text-xs text-blue-600 underline"
        onClick={() => fileInputRef.current?.click()}
      >
        {preview ? "Đổi ảnh" : "Chọn ảnh"}
      </button>

      {preview && (
        <button
          type="button"
          className="text-xs text-red-500 mt-1"
          onClick={() => {
            setPreview(null);
            removeImageFromState(item.color);
          }}
        >
          Xóa ảnh
        </button>
      )}
    </div>
  );
};

export default SelectColor;
