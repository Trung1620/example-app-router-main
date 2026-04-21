"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";

const ManageBlogPage = () => {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [blogs, setBlogs] = useState<any[]>([]);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null); // ✅

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      const res = await fetch("/api/blogs");
      const data = await res.json();
      setBlogs(data);
    } catch (error) {
      console.error("❌ Error fetching blogs:", error);
      toast.error("Không lấy được danh sách bài viết");
    }
  };

  const handleDelete = async (slug: string) => {
    const confirm = window.confirm("Bạn có chắc muốn xoá bài này?");
    if (!confirm) return;

    try {
      setDeletingSlug(slug); // ✅ Đang xóa bài này
      const res = await fetch(`/api/blog/${slug}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Xoá thành công");
        fetchBlogs();
      } else {
        toast.error("Xoá thất bại");
      }
    } catch (error) {
      console.error(error);
      toast.error("Có lỗi khi xoá");
    } finally {
      setDeletingSlug(null); // ✅ Xóa xong
    }
  };

  const handleEdit = (slug: string) => {
    router.push(`/admin/edit-blog/${slug}`);
  };

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Quản lý bài Blog</h1>

      <div className="grid gap-6">
        {blogs.map((post) => (
          <div key={post.slug} className="border p-4 rounded-lg flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">{post.titleVi}</h2>
              <p className="text-sm text-gray-500">{post.slug}</p>
            </div>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={() => handleEdit(post.slug)}
                disabled={deletingSlug !== null}
              >
                Sửa
              </button>
              <button
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={() => handleDelete(post.slug)}
                disabled={deletingSlug !== null}
              >
                {deletingSlug === post.slug ? "Đang xoá..." : "Xoá"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ManageBlogPage;
