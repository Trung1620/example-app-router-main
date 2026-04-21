import prismadb from "@/libs/prismadb";
import { Prisma, Product } from "@prisma/client";

export interface IProductParams {
  category?: string | null;
  searchTerm?: string | null;
  locale?: "vi" | "en";
  take?: number;
}

// ✅ Type chuẩn theo model Product hiện tại
export type ProductWithRelations = Product & { category?: any };

export default async function getProducts(
  params: IProductParams
): Promise<ProductWithRelations[]> {
  try {
    const { category, searchTerm, locale = "en", take = 50 } = params;

    const query: any = {};

    if (category) {
      query.category = {
        is: {
          name: {
            equals: category,
            mode: "insensitive",
          }
        }
      };
    }

    const nameField = locale === "vi" ? "nameVi" : "nameEn";
    const descField = locale === "vi" ? "descriptionVi" : "descriptionEn";

    const products = await prismadb.product.findMany({
      where: {
        ...query,
        ...(searchTerm
          ? {
              OR: [
                { [nameField]: { contains: searchTerm, mode: "insensitive" } },
                { [descField]: { contains: searchTerm, mode: "insensitive" } },
              ],
            }
          : {}),
      },

      include: {
        category: true,
      },

      orderBy: { createdAt: "desc" },
      take,
    });

    // ✅ lọc ảnh url hợp lệ + giữ nguyên category
    const cleanedProducts: any[] = products.map((product) => ({
      ...product,
      images: Array.isArray(product.images) ? product.images.filter(
        (img: any) => typeof img === 'string' ? !!img : !!(img?.url)
      ) : [],
    }));

    // ✅ lọc sản phẩm thiếu tên/mô tả theo locale
    return cleanedProducts.filter((product) => {
      const hasName = !!product[nameField as keyof Product];
      const hasDesc = !!product[descField as keyof Product];
      return Boolean(hasName && hasDesc);
    });
  } catch (error: any) {
    console.error("❌ Lỗi khi lấy sản phẩm:", error);
    throw new Error(error?.message || "Lỗi không xác định khi lấy sản phẩm");
  }
}
