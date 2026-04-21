import prisma from "../../libs/prismadb";

export async function getBlogs(p0: { locale: "vi" | "en"; }) {
  // Model blogPost đã bị loại bỏ khỏi Schema, tạm thời trả về rỗng để tránh lỗi
  return [];
}

export async function getBlogBySlug(slug: string) {
  // Model blogPost đã bị loại bỏ khỏi Schema
  return null;
}
