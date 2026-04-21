"use client";

import {
  CartProductType,
  SelectedImgType,
} from "../../product/[productId]/ProductDetails";
import Image from "next/image";

interface ProductImageProps {
  cartProduct: CartProductType;
  product: any;
  handleColorSelect: (value: SelectedImgType) => void;
}

const ProductImage: React.FC<ProductImageProps> = ({
  cartProduct,
  product,
  handleColorSelect,
}) => {
  const productImages = product.images ?? [];

  return (
    <div
      className="grid grid-cols-6 gap-2 h-full
        max-h-[500px] min-h-[300px] sm:min-h-[400px]"
    >
      <div
        className="flex flex-col items-center justify-center gap-4
        cursor-pointer border h-full max-h-[500px] min-h-[300px] sm:min-h-[400px]"
      >
        {productImages.length > 0 ? (
          productImages.map((image: any) => (
            <div
              key={image.colorName}
              onClick={() =>
                handleColorSelect({
                  image: image.url,
                  color: image.colorName,
                  colorCode: image.colorCode,
                })
              }
              className={`relative w-[80%] aspect-square rounded border-teal-300 ${
                cartProduct.selectedImg.color === image.colorName
                  ? "border-[1.5px]"
                  : "border-none"
              }`}
            >
              <Image
                src={image.url || "/placeholder.png"}
                alt={`Image of product color ${image.colorName || "unknown"}`}
                fill
                className="object-contain"
              />
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500 text-center">No images</p>
        )}
      </div>

      <div className="col-span-5 relative aspect-square">
        <Image
          fill
          src={cartProduct.selectedImg?.image || "/placeholder.png"}
          alt={cartProduct.name || "Product image"}
          className="w-full h-full object-contain max-h-[500px] min-h-[300px] sm:min-h-[400px]"
        />
      </div>
    </div>
  );
};

export default ProductImage;
