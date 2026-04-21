"use client";

import { useTranslations } from "next-intl";
import { useForm, FieldValues, SubmitHandler } from "react-hook-form";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import Heading from "../../components/Heading";
import Input from "../../components/inputs/Input";
import TextArea from "../../components/inputs/TextArea";
import CustomCheckBox from "../../components/inputs/CustomCheckBox";
import CategoryInput from "../../components/inputs/CategoryInput";
import SelectColor from "../../components/inputs/SelectColor";
import Button from "../../components/Button";

import { categories } from "@/utils/Categories";
import { colors } from "@/utils/Colors";
import { uploadFileToFirebase } from "@/utils/uploadFileToFirebase"; // ✅ import hàm mới

export type ImageType = {
  color: string;
  colorCode: string;
  image: File | null;
};

export type UploadedImageType = {
  color: string;
  colorCode: string;
  image: string;
};

const AddProductForm = () => {
  const router = useRouter();
  const t = useTranslations("Admin");

  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<ImageType[]>([]);
  const [isProductCreated, setIsProductCreated] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      nameVi: "",
      nameEn: "",
      descriptionVi: "",
      descriptionEn: "",
      priceVnd: "",
      priceUsd: "",
      size: "",
      brand: "",
      category: "",
      inStock: false,
    },
  });

  const category = watch("category");

  useEffect(() => {
    setCustomValue("images", images);
  }, [images]);

  useEffect(() => {
    if (isProductCreated) {
      reset();
      setImages([]);
      setIsProductCreated(false);
    }
  }, [isProductCreated, reset]);

  const setCustomValue = (id: string, value: any) => {
    setValue(id, value, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const addImageToState = useCallback((value: ImageType) => {
    setImages((prev) => (!prev ? [value] : [...prev, value]));
  }, []);

  const removeImageFromState = useCallback((color: string) => {
    setImages((prev) => prev.filter((item) => item.color !== color));
  }, []);
  
  

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    if (!data.category) return toast.error(t("categoryRequired"));
    if (!images || images.length === 0) return toast.error(t("imageRequired"));

    setIsLoading(true);
    toast(t("creatingProduct"));

    const uploadedImages: UploadedImageType[] = [];

    try {
      for (const item of images) {
        if (item.image) {
          const downloadURL = await uploadFileToFirebase(item.image); // ✅ dùng hàm đã tách
          uploadedImages.push({ ...item, image: downloadURL });
        }
      }

      const productData = {
        nameVi: data.nameVi,
        nameEn: data.nameEn,
        descriptionVi: data.descriptionVi,
        descriptionEn: data.descriptionEn,
        priceVnd: parseFloat(data.priceVnd),
        priceUsd: parseFloat(data.priceUsd),
        size: data.size,
        brand: data.brand,
        category: data.category,
        inStock: data.inStock,
        images: uploadedImages,
      };

      await fetch("/api/product", {
        method: "POST",
        body: JSON.stringify(productData),
        headers: { "Content-Type": "application/json" },
      });

      toast.success(t("productCreated"));
      setIsProductCreated(true);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(t("productCreateError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Heading title={t("addProduct")} center />

      <Input id="nameVi" label={t("nameVi")} register={register} required errors={errors} />
      <Input id="nameEn" label={t("nameEn")} register={register} required errors={errors} />
      <TextArea id="descriptionVi" label={t("descVi")} register={register} required errors={errors} />
      <TextArea id="descriptionEn" label={t("descEn")} register={register} required errors={errors} />

      <Input id="priceVnd" label={t("priceVnd")} type="number" register={register} required errors={errors} />
      <Input id="priceUsd" label={t("priceUsd")} type="number" register={register} required errors={errors} />
      <Input id="size" label={t("size")} register={register} errors={errors} />
      <Input id="brand" label={t("brand")} register={register} required errors={errors} />

      <CustomCheckBox id="inStock" register={register} label={t("inStock")} />

      <div className="my-4">
        <div className="font-semibold mb-2">{t("selectCategory")}</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {categories.map((item) =>
            item.label === "All" ? null : (
              <CategoryInput
                key={item.label}
                label={item.label}
                icon={item.icon}
                selected={category === item.label}
                onClick={() => setCustomValue("category", item.label)}
              />
            )
          )}
        </div>
      </div>

      <div className="mt-6">
        <p className="font-semibold mb-2">{t("selectColorAndImages")}</p>
        <div className="grid grid-cols-2 gap-4">
          {colors.map((item, idx) => (
            <SelectColor
            key={idx}
            item={item}
            addImageToState={addImageToState}
            removeImageFromState={() => removeImageFromState(item.color)} // ✅ sửa ở đây
            isProductCreated={isProductCreated}
          />
          
          ))}
        </div>
      </div>

      <Button
        label={isLoading ? t("loading") : t("addProduct")}
        onClick={handleSubmit(onSubmit)}
      />
    </>
  );
};

export default AddProductForm;
