import { NextResponse } from "next/server";
import prisma from "../../../../libs/prismadb";

export async function GET() {
  try {
    const posts = await prisma.blogPost.findMany({
      where: {
        published: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error("❌ GET /api/blogs error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}