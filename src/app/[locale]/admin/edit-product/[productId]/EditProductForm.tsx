"use client";

import { useState } from "react";
import { useForm, FieldValues, SubmitHandler } from "react-hook-form";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";

import Heading from "../../../../../app/[locale]/components/Heading";
import Input from "../../../../../app/[locale]/components/inputs/Input";
import TextArea from "../../../../../app/[locale]/components/inputs/TextArea";
import CategoryInput from "../../../../../app/[locale]/components/inputs/CategoryInput";
import CustomCheckBox from "../../../../../app/[locale]/components/inputs/CustomCheckBox";
import SelectColor from "../../../../../app/[locale]/components/inputs/SelectColor";
import Button from "../../../../../app/[locale]/components/Button";

import { uploadFileToFirebase } from "@/utils/uploadFileToFirebase";
import { categories } from "@/utils/Categories";
import { colors } from "@/utils/Colors";

type ImageState = {
  color: string;
  colorCode: string;
  url: string;
  image?: File;
};

interface EditProductFormProps {
  product: any;
}

const EditProductForm: React.FC<EditProductFormProps> = ({ product }) => {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<ImageState[]>(product.images || []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      nameVi: product.nameVi || "",
      nameEn: product.nameEn || "",
      descriptionVi: product.descriptionVi || "",
      descriptionEn: product.descriptionEn || "",
      priceVnd: product.priceVnd || "",
      priceUsd: product.priceUsd || "",
      size: product.size || "",
      brand: product.brand || "",
      category: product.category || "",
      inStock: product.inStock || false,
    },
  });

  const category = watch("category");

  const setCustomValue = (id: string, value: any) => {
    setValue(id, value, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const addImageToState = (value: { color: string; colorCode: string; image: File | null }) => {
    if (!value.image) return;
    const newImage: ImageState = {
      color: value.color,
      colorCode: value.colorCode,
      url: "",
      image: value.image,
    };
    setImages((prev) => [...prev.filter((img) => img.color !== value.color), newImage]);
  };

  const removeImageFromState = (color: string) => {
    setImages((prev) => prev.filter((img) => img.color !== color));
  };

  const handleDelete = async () => {
    const confirm = window.confirm(t("confirmDelete"));
    if (!confirm) return;

    try {
      const res = await fetch(`/api/product/${product.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success(t("productDeleted"));
        router.push("/admin/manage-products");
        router.refresh();
      } else {
        toast.error(t("deleteError"));
      }
    } catch (error) {
      console.error(error);
      toast.error(t("deleteError"));
    }
  };

  // Optional: Check if image still exists
  const checkIfImageExists = async (url: string): Promise<boolean> => {
    try {
      const res = await fetch(url, { method: "HEAD" });
      return res.ok;
    } catch {
      return false;
    }
  };

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    setIsLoading(true);
    toast(t("updatingProduct"));

    try {
      const uploadedImages: ImageState[] = [];

      for (const item of images) {
        if (item.image) {
          const url = await uploadFileToFirebase(item.image);
          if (url) {
            uploadedImages.push({
              color: item.color,
              colorCode: item.colorCode,
              url,
            });
          }
        } else if (item.url && item.url !== "") {
          const exists = await checkIfImageExists(item.url);
          if (exists) {
            uploadedImages.push(item);
          }
        }
      }

      const updatedData = {
        ...data,
        priceVnd: parseFloat(data.priceVnd),
        priceUsd: parseFloat(data.priceUsd),
        images: uploadedImages,
      };

      await fetch(`/api/product/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });

      toast.success(t("productUpdated"));
      router.push("/admin/manage-products");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(t("updateError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Heading title={t("editProduct") + `: ${product.nameVi}`} center />

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
          {colors.map((item, idx) => {
            const existing = images.find((img) => img.color === item.color);
            return (
              <SelectColor
                key={idx}
                item={item}
                addImageToState={addImageToState}
                removeImageFromState={removeImageFromState}
                isProductCreated={false}
                existingImageUrl={existing?.url}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex gap-4">
        <Button
          label={isLoading ? t("loading") : t("saveChanges")}
          onClick={handleSubmit(onSubmit)}
          disabled={isLoading}
        />
        <Button
          label={t("delete")}
          onClick={handleDelete}
          outline
          disabled={isLoading}
        />
      </div>
    </>
  );
};

export default EditProductForm;
