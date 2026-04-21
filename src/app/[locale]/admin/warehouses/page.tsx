import prismadb from "@/libs/prismadb";
import WarehousesClient from "./ui";
import { getOrgIdOrThrowServer } from "@/libs/getOrgId";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ locale: string }> };

export default async function WarehousesPage({ params }: Props) {
  const { locale } = await params;
  const orgId = await getOrgIdOrThrowServer();

  const rows = await prismadb.warehouse.findMany({
    where: { orgId } as any,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-4 md:p-6">
      <div className="text-xl font-semibold">Kho hàng</div>
      <div className="text-sm text-gray-600 mt-1">
        Tạo kho để dùng cho nhập/xuất kho.
      </div>

      <div className="mt-4">
        <WarehousesClient locale={locale} initialRows={rows as any} />
      </div>
    </div>
  );
}
