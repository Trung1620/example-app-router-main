// src/app/[locale]/admin/customers/[id]/page.tsx
import prismadb from "@/libs/prismadb";
import { getOrgIdOrThrowServer } from "@/libs/getOrgId";
import { notFound } from "next/navigation";
import CustomerForm from "../ui/CustomerForm";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function EditCustomerPage({ params }: PageProps) {
  const { id } = await params;

  const orgId = await getOrgIdOrThrowServer();

  const customer = await prismadb.customer.findFirst({
    where: { id, orgId } as any, // cast để tránh TS kén ObjectId
  });

  if (!customer) return notFound();

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Sửa khách hàng</h1>
        <p className="text-sm text-gray-500">Cập nhật thông tin CRM.</p>
      </div>

      <CustomerForm mode="edit" initial={customer as any} />
    </div>
  );
}
