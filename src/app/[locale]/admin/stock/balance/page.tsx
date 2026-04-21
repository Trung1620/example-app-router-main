import prismadb from "@/libs/prismadb";
import BalanceClient from "./BalanceClient";
import { getOrgIdOrThrowServer } from "@/libs/getOrgId";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StockBalancePage({ searchParams }: PageProps) {
  const orgId = await getOrgIdOrThrowServer();

  const sp = (await searchParams) || {};
  const warehouseId = typeof sp.warehouseId === "string" ? sp.warehouseId : "";

  const warehouses = await prismadb.warehouse.findMany({
    where: { orgId } as any,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, address: true },
  });

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Tồn kho</h1>
        <div className="text-sm text-gray-600">
          Chọn kho để xem số lượng tồn theo từng sản phẩm.
        </div>
      </div>

      <BalanceClient
        warehouses={warehouses}
        initialWarehouseId={warehouseId || (warehouses[0]?.id ?? "")}
      />
    </div>
  );
}
