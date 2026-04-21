import prismadb from "@/libs/prismadb";
import { Prisma, Product } from "@prisma/client";

export interface IProductParams {
  category?: string | null;
  searchTerm?: string | null;
  locale?: "vi" | "en";
  take?: number;
  orgId?: string | null;
}

// ✅ Type chuẩn theo model Product hiện tại
export type ProductWithRelations = Product & { category?: any };

export default async function getProducts(
  params: IProductParams
): Promise<ProductWithRelations[]> {
  try {
    const { category, searchTerm, locale = "en", take = 50, orgId } = params;

    const query: any = {};

    if (orgId) {
      query.orgId = orgId;
    }

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
                { nameVi: { contains: searchTerm, mode: "insensitive" } },
                { nameEn: { contains: searchTerm, mode: "insensitive" } },
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

    // ✅ lọc sản phẩm - chỉ cần có tên (Vi hoặc En) là hiển thị
    return cleanedProducts.filter((product) => {
      const hasName = !!product.nameVi || !!product.nameEn;
      return hasName;
    });
  } catch (error: any) {
    console.error("❌ Lỗi khi lấy sản phẩm:", error);
    throw new Error(error?.message || "Lỗi không xác định khi lấy sản phẩm");
  }
}
