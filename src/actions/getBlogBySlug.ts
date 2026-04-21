import prisma from "../../libs/prismadb";

export async function getBlogBySlug(slug: string) {
  try {
    const post = await prisma.blogPost.findFirst({
      where: { slug },
    });

    return post;
  } catch (error) {
    console.error("❌ getBlogBySlug error:", error);
    return null;
  }
}
