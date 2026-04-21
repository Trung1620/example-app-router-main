"use client";

import { CartProductType, SelectedImgType } from "@/app/[locale]/product/[productId]/ProductDetails";

interface SetColorProps {
  images: {
    url: string;
    colorName: string;
    colorCode: string;
  }[];
  cartProduct: CartProductType;
  handleColorSelect: (value: SelectedImgType) => void;
}

const SetColor: React.FC<SetColorProps> = ({ images, cartProduct, handleColorSelect }) => {
  return (
    <div className="flex items-center gap-4 mt-2">
      <span className="font-semibold text-sm">COLOR:</span>
      <div className="flex gap-2">
        {images.map((img) => (
          <div
            key={img.colorName}
            onClick={() =>
              handleColorSelect({
                image: img.url,
                color: img.colorName,
                colorCode: img.colorCode,
              })
            }
            className={`h-7 w-7 rounded-full flex items-center justify-center cursor-pointer
              ${cartProduct.selectedImg.color === img.colorName ? "ring-2 ring-teal-500" : ""}
            `}
          >
            <div
              className="h-5 w-5 rounded-full border border-slate-300"
              style={{ backgroundColor: img.colorCode }}
            ></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SetColor;
