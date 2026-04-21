"use client";

import Image from "next/image";

type ImageItem = {
  url: string;
  colorName: string;
  colorCode: string;
};

interface Props {
  images: ImageItem[];
  selectedImage: ImageItem;
  onSelect: (img: ImageItem) => void;
}

const ImageSelector: React.FC<Props> = ({ images, selectedImage, onSelect }) => {
  return (
    <div className="flex flex-col gap-2">
      {images.map((img, idx) => (
        <div
          key={idx}
          className={`w-12 h-12 border ${img.url === selectedImage.url ? "border-blue-500" : "border-gray-300"} cursor-pointer`}
          onClick={() => onSelect(img)}
        >
          <Image
            src={img.url}
            alt={img.colorName}
            width={48}
            height={48}
            className="object-cover w-full h-full"
          />
        </div>
      ))}
    </div>
  );
};

export default ImageSelector;
