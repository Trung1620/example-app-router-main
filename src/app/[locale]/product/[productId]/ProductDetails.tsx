"use client";

import { useEffect, useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { MdCheckCircle } from "react-icons/md";
import Image from "next/image";

import Button from "../../components/Button";
import ProductImage from "../../components/products/ProductImage";
import SetColor from "../../components/products/SetColor";
import SetQuatity from "../../components/products/SetQuantity";
import { useCart } from "@/hooks/useCart";

export type CartProductType = {
  id: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  selectedImg: SelectedImgType;
  quantity: number;
  price: number;
};

export type SelectedImgType = {
  color: string;
  colorCode: string;
  image: string;
};

interface ProductDetailsProps {
  product: any;
}

const Horizontal = () => <hr className="w-[30%] my-2" />;

const ProductDetails: React.FC<ProductDetailsProps> = ({ product }) => {
  const locale = useLocale();
  const t = useTranslations("Product");
  const { handleAddProductToCart, cartProducts } = useCart();
  const router = useRouter();

  const name = locale === "vi" ? product.nameVi : product.nameEn;
  const description = locale === "vi" ? product.descriptionVi : product.descriptionEn;
  const price = locale === "vi" ? product.priceVnd : product.priceUsd;

  const fallbackImage = {
    image: "/placeholder.png",
    color: "Default",
    colorCode: "#000000",
  };

  const [cartProduct, setCartProduct] = useState<CartProductType>({
    id: product.id,
    name,
    description,
    category: product.category,
    brand: product.brand,
    selectedImg: product.images?.[0]
      ? {
          image: product.images[0].url,
          color: product.images[0].colorName,
          colorCode: product.images[0].colorCode || "#000000",
        }
      : fallbackImage,
    quantity: 1,
    price,
  });

  const [isProductInCart, setIsProductInCart] = useState(false);

  useEffect(() => {
    const exists = cartProducts?.some((item) => item.id === product.id);
    setIsProductInCart(Boolean(exists));
  }, [cartProducts, product.id]);

  const handleColorSelect = useCallback((value: SelectedImgType) => {
    setCartProduct((prev) => ({
      ...prev,
      selectedImg: value,
    }));
  }, []);

  const handleQtyIncrease = useCallback(() => {
    setCartProduct((prev) => ({
      ...prev,
      quantity: Math.min(99, prev.quantity + 1),
    }));
  }, []);

  const handleQtyDecrease = useCallback(() => {
    setCartProduct((prev) => ({
      ...prev,
      quantity: Math.max(1, prev.quantity - 1),
    }));
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
      <ProductImage
        cartProduct={cartProduct}
        product={product}
        handleColorSelect={handleColorSelect}
      />

      <div className="flex flex-col gap-1 text-slate-500 text-sm">
        <h2 className="text-3xl font-medium text-slate-700">{name}</h2>

        <Horizontal />
        <div className="text-justify">{description}</div>

        <Horizontal />
        <div><span className="font-semibold">{t("category")}:</span> {product.category}</div>
        <div><span className="font-semibold">{t("brand")}:</span> {product.brand}</div>
        <div><span className="font-semibold">{t("size")}:</span> {product.size || t("noSize")}</div>
        <div className={product.inStock ? "text-teal-400" : "text-rose-400"}>
          {product.inStock ? t("inStock") : t("outOfStock")}
        </div>

        <Horizontal />

        {isProductInCart ? (
          <>
            <p className="mb-2 text-slate-500 flex items-center gap-1">
              <MdCheckCircle className="text-teal-400" size={20} />
              <span>{t("alreadyInCart")}</span>
            </p>
            <div className="max-w-[300px]">
              <Button label={t("viewCart")}
                outline
                onClick={() => router.push("/cart")}
              />
            </div>
          </>
        ) : (
          <>
            <SetColor
              cartProduct={cartProduct}
              images={product.images}
              handleColorSelect={handleColorSelect}
            />
            <Horizontal />
            <SetQuatity
              cartProduct={cartProduct}
              handleQtyIncrease={handleQtyIncrease}
              handleQtyDecrease={handleQtyDecrease}
            />
            <Horizontal />
            <div className="max-w-[300px]">
              <Button
                label={t("addToCart")}
                onClick={() => handleAddProductToCart(cartProduct)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProductDetails;
