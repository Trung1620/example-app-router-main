import prismadb from "@/libs/prismadb";
import { Prisma } from "@prisma/client";

interface IParams {
  productId?: string;
}

export type ProductByIdPayload = Prisma.ProductGetPayload<{
  include: {
    images: true;
    reviews: {
      include: {
        user: {
          select: {
            id: true;
            name: true;
            email: true;
            image: true;
          };
        };
      };
    };
  };
}>;

export default async function getProductById(
  params: IParams
): Promise<(Omit<ProductByIdPayload, "reviews"> & { reviews: ProductByIdPayload["reviews"] }) | null> {
  try {
    const { productId } = params;

    if (!productId) return null;

    const product = await prismadb.product.findUnique({
      where: { id: productId },
      include: {
        images: true,
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (!product) return null;

    // ✅ sort theo createdDate (model Review của bạn)
    const sortedReviews = [...product.reviews].sort(
      (a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
    );

    return {
      ...product,
      reviews: sortedReviews,
    };
  } catch (error: any) {
    console.error("❌ getProductById error:", error);
    throw new Error(error?.message || "Unknown error");
  }
}
