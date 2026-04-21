// src/app/[locale]/admin/stock/in/page.tsx
import prismadb from "@/libs/prismadb";
import StockInClient from "./ui";
import { getOrgIdOrThrowServer } from "@/libs/getOrgId";
import { redirect } from "next/navigation";


export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type WarehouseLite = { id: string; name: string };
type ProductLite = { id: string; nameVi: string; sku?: string; size?: string };

export default async function StockInPage({ params }: PageProps) {
  const { locale } = await params;

  let orgId: string;
  try {
    orgId = await getOrgIdOrThrowServer();
  } catch {
    redirect(`/${locale}/admin/select-org?next=/${locale}/admin/stock/in`);
  }

  const warehousesDb = await prismadb.warehouse.findMany({
    where: { orgId } as any,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });

  const productsDb = await prismadb.product.findMany({
    where: { orgId } as any,
    orderBy: { createdAt: "desc" },
    select: { id: true, nameVi: true, nameEn: true, size: true },
  });

  const warehouses: WarehouseLite[] = warehousesDb.map((w) => ({
    id: String(w.id),
    name: w.name,
  }));

  const products: ProductLite[] = productsDb.map((p) => ({
    id: String(p.id),
    nameVi: p.nameVi || p.nameEn || "—",
    sku: "",
    size: p.size || "",
  }));

  return (
    <div className="p-4 md:p-6">
      <div className="text-xl font-semibold">Nhập kho</div>
      <div className="text-sm text-gray-600 mt-1">
        Tạo StockMove (IN) + StockMoveItem.
      </div>

      <div className="mt-4">
        <StockInClient locale={locale} warehouses={warehouses} products={products} />
      </div>
    </div>
  );
}
