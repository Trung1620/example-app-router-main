"use client";

import { useForm, FieldValues, SubmitHandler } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";

import Input from "@/app/[locale]/components/inputs/Input";
import TextArea from "@/app/[locale]/components/inputs/TextArea";
import Button from "@/app/[locale]/components/Button";
import { uploadFileToFirebase } from "@/utils/uploadFileToFirebase";
import TextEditor from "@/app/[locale]/components/inputs/TextEditor";

const PostBlogPage = () => {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      titleVi: "",
      titleEn: "",
      contentVi: "",
      contentEn: "",
      metaDescVi: "",
      metaDescEn: "",
      slug: "",
      thumbnail: null,
    },
  });

  const thumbnail = watch("thumbnail");

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    setIsLoading(true);
    try {
      let thumbnailUrl = "";

      if (data.thumbnail && data.thumbnail[0]) {
        try {
          thumbnailUrl = await uploadFileToFirebase(data.thumbnail[0]);
        } catch (error) {
          console.error(error);
          toast.error("Lỗi upload ảnh. Tiếp tục lưu bài không có ảnh đại diện.");
        }
      }

      const response = await fetch("/api/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titleVi: data.titleVi,
          titleEn: data.titleEn,
          contentVi: data.contentVi,
          contentEn: data.contentEn,
          slug: data.slug,
          thumbnailUrl,
          metaDescVi: data.metaDescVi,
          metaDescEn: data.metaDescEn,
          published: true,
        }),
      });

      if (response.ok) {
        toast.success("Bài viết đã được đăng!");
        router.push("/admin/manage-blog");
      } else {
        toast.error("Đăng bài thất bại.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Có lỗi khi đăng bài");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Đăng bài Blog mới</h1>

      <form method="POST" encType="multipart/form-data" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input id="slug" label="Slug (url bài viết)" register={register} required errors={errors} />
        <Input id="titleVi" label="Tiêu đề (Tiếng Việt)" register={register} required errors={errors} />
        <Input id="titleEn" label="Tiêu đề (Tiếng Anh)" register={register} required errors={errors} />
        <TextEditor
          label="Nội dung (Tiếng Việt)"
          value={watch("contentVi")}
          onChange={(value) => setValue("contentVi", value)}
        />

        <TextEditor
          label="Nội dung (Tiếng Anh)"
          value={watch("contentEn")}
          onChange={(value) => setValue("contentEn", value)}
        />

        <Input id="metaDescVi" label="Meta Description (Việt)" register={register} errors={errors} />
        <Input id="metaDescEn" label="Meta Description (English)" register={register} errors={errors} />

        <div>
          <label className="block text-sm font-medium mb-1">Thumbnail ảnh (tuỳ chọn)</label>
          <input
            type="file"
            {...register("thumbnail")}
            accept="image/*"
          />
        </div>

        <Button label={isLoading ? "Đang đăng..." : "Đăng bài"} disabled={isLoading} type="submit" />
      </form>
    </div>
  );
};

export default PostBlogPage;
