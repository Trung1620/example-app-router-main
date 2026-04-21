import prismadb from "@/libs/prismadb";
import DeliveryFromQuoteForm from "./ui";
import { getOrgIdOrThrowServer } from "@/libs/getOrgId";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; quoteId: string }> };

export default async function NewDeliveryPage({ params }: Props) {
  const { quoteId } = await params;
  const orgId = await getOrgIdOrThrowServer();

  const q = await prismadb.quote.findFirst({
    where: { id: quoteId, orgId } as any,
    include: { items: true, customer: true },
  });
  if (!q) return <div className="p-6">Không tìm thấy báo giá.</div>;

  const deliveries = await prismadb.delivery.findMany({
    where: { quoteId, orgId } as any,
    include: { items: true },
  });

  const deliveredMap: Record<string, number> = {};
  for (const d of deliveries) {
    for (const it of d.items) {
      deliveredMap[it.quoteItemId] = (deliveredMap[it.quoteItemId] || 0) + it.qty;
    }
  }

  return (
    <DeliveryFromQuoteForm
      quoteId={q.id}
      quoteNumber={(q as any).number}
      customerName={(q as any).customer?.name || (q as any).contactName || ""}
      items={q.items.map((it) => ({
        id: it.id,
        nameVi: it.nameVi,
        sku: it.sku,
        size: it.size,
        unit: it.unit,
        quantity: it.quantity,
        delivered: deliveredMap[it.id] || 0,
      }))}
    />
  );
}
