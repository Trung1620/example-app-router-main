// src/app/[locale]/admin/customers/new/page.tsx
import CustomerForm from "@/app/[locale]/admin/customers/ui/CustomerForm";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

export default async function NewCustomerPage(_props: PageProps) {
  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Tạo khách hàng</h1>
        <p className="text-sm text-gray-500">Thêm khách vào CRM.</p>
      </div>

      <CustomerForm mode="create" />
    </div>
  );
}
