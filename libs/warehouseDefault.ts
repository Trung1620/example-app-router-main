import prismadb from "@/libs/prismadb";

/**
 * Lấy warehouse mặc định cho org:
 * - Nếu org đã có warehouse: lấy cái tạo sớm nhất (hoặc bạn đổi logic tùy ý)
 * - Nếu chưa có: tự tạo "Kho chính"
 */
export async function getOrCreateDefaultWarehouseId(orgId: string) {
  // ưu tiên kho tạo sớm nhất làm mặc định
  const existed = await prismadb.warehouse.findFirst({
    where: { orgId } as any,
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (existed?.id) return existed.id;

  const created = await prismadb.warehouse.create({
    data: {
      orgId,
      name: "Kho chính",
      note: "Auto created as default warehouse",
    } as any,
    select: { id: true },
  });

  return created.id;
}
