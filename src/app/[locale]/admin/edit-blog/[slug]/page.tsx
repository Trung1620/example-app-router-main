"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation"; // ✅ gom chung luôn

import { useForm, FieldValues, SubmitHandler } from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";

import { getBlogBySlug } from "@/actions/getBlogs";
import Input from "@/app/[locale]/components/inputs/Input";
import TextArea from "@/app/[locale]/components/inputs/TextArea";
import Button from "@/app/[locale]/components/Button";
import { uploadFileToFirebase } from "@/utils/uploadFileToFirebase";

const EditBlogPage = () => {
  const t = useTranslations("Admin");
  const router = useRouter();
  const params = useParams(); // ✅ Gọi trong thân function
  const { slug } = params as { slug: string }; // ✅ ép kiểu nếu cần

  const [isLoading, setIsLoading] = useState(false);
  const [existingThumbnail, setExistingThumbnail] = useState<string>("");

  const {
    register,
    handleSubmit,
    reset,
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
      thumbnail: null,
    },
  });

  const thumbnail = watch("thumbnail");

  useEffect(() => {
    if (slug) {
      fetchBlog();
    }
  }, [slug]);
  const fetchBlog = async () => {
    try {
      const res = await fetch(`/api/blog/${slug}`);
      if (!res.ok) {
        throw new Error("Không tìm thấy bài viết");
      }
      const blog = await res.json();
      reset({
        titleVi: blog.titleVi,
        titleEn: blog.titleEn,
        contentVi: blog.contentVi,
        contentEn: blog.contentEn,
        metaDescVi: blog.metaDescVi ?? "",
        metaDescEn: blog.metaDescEn ?? "",
      });
      if (blog.thumbnailUrl) {
        setExistingThumbnail(blog.thumbnailUrl);
      }
    } catch (error) {
      console.error(error);
      toast.error("Không tìm thấy bài viết");
      router.push("/admin/manage-blog");
    }
  };


  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    setIsLoading(true);
    try {
      let thumbnailUrl = existingThumbnail;

      if (data.thumbnail && data.thumbnail[0]) {
        thumbnailUrl = await uploadFileToFirebase(data.thumbnail[0]);
      }

      await fetch(`/api/blog/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titleVi: data.titleVi,
          titleEn: data.titleEn,
          contentVi: data.contentVi,
          contentEn: data.contentEn,
          thumbnailUrl,
          metaDescVi: data.metaDescVi,
          metaDescEn: data.metaDescEn,
        }),
      });

      toast.success("Cập nhật bài viết thành công!");
      router.push("/admin/manage-blog");
    } catch (error) {
      console.error(error);
      toast.error("Có lỗi khi cập nhật");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Sửa Bài Blog</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input id="titleVi" label="Tiêu đề (Tiếng Việt)" register={register} required errors={errors} />
        <Input id="titleEn" label="Tiêu đề (Tiếng Anh)" register={register} required errors={errors} />
        <TextArea id="contentVi" label="Nội dung (Tiếng Việt)" register={register} required errors={errors} />
        <TextArea id="contentEn" label="Nội dung (Tiếng Anh)" register={register} required errors={errors} />
        <Input id="metaDescVi" label="Meta Description (Việt)" register={register} errors={errors} />
        <Input id="metaDescEn" label="Meta Description (English)" register={register} errors={errors} />

        {existingThumbnail && (
          <div className="relative my-2">
            <p className="text-sm mb-1">Thumbnail hiện tại:</p>
            <div className="relative w-32 h-32">
              <img
                src={existingThumbnail}
                alt="Thumbnail"
                className="object-cover w-full h-full rounded"
              />
              <button
                type="button"
                onClick={() => setExistingThumbnail("")}
                className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700"
              >
                ✕
              </button>
            </div>
          </div>
        )}


        <div>
          <label className="block text-sm font-medium mb-1">Cập nhật ảnh thumbnail (nếu cần)</label>
          <input
            type="file"
            {...register("thumbnail")}
            accept="image/*"
          />
        </div>

        <Button label={isLoading ? "Đang lưu..." : "Lưu thay đổi"} disabled={isLoading} type="submit" />
      </form>
    </div>
  );
};

export default EditBlogPage;
