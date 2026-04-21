import prismadb from "@/libs/prismadb";
import { getOrgIdOrThrowServer } from "@/libs/getOrgId";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function StockMoveDetailPage({ params }: Props) {
  const { id } = await params;
  const orgId = await getOrgIdOrThrowServer();

  const move = await prismadb.stockMove.findFirst({
    where: { id, orgId } as any,
    include: {
      warehouse: true,
      items: {
        include: {
          product: {
            include: { images: true },
          },
        },
      },
    },
  });

  if (!move) return notFound();

  const sign = String(move.type) === "OUT" ? -1 : 1;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="text-2xl font-bold">Chi tiết phiếu kho</div>

      <div className="mt-3 text-sm text-gray-600">
        {new Date(move.createdAt).toLocaleString("vi-VN")}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="font-medium">Loại phiếu</div>
          <div>{move.type}</div>
        </div>

        <div>
          <div className="font-medium">Kho</div>
          <div>{move.warehouse?.name || "—"}</div>
        </div>

        <div>
          <div className="font-medium">Nguồn</div>
          <div>{move.refType}</div>
        </div>

        <div>
          <div className="font-medium">Ghi chú</div>
          <div>{move.note || "—"}</div>
        </div>
      </div>

      <div className="mt-6">
        <div className="font-semibold mb-2">Danh sách sản phẩm</div>

        <div className="border rounded-lg divide-y">
          {(move.items as any[]).map((it) => {
            // ✅ Ưu tiên product (nếu có), fallback sang snapshot trên StockMoveItem
            const title =
              it.product?.nameVi ||
              it.nameVi ||
              (it.sku ? `SKU: ${it.sku}` : "") ||
              it.productId ||
              "—";

            const sub =
              it.product?.size ||
              it.size ||
              (it.sku ? `Phụ kiện/SKU: ${it.sku}` : "");

            const img =
              it.product?.images?.[0]?.url ||
              it.imageUrl || // nếu sau này bạn có lưu snapshot ảnh
              null;

            // ✅ Nếu là OUT thì hiển thị số âm cho dễ hiểu
            const displayQty = Number(it.qty || 0) * sign;

            return (
              <div
                key={it.id}
                className="p-3 flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt=""
                      className="w-10 h-10 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded shrink-0" />
                  )}

                  <div className="min-w-0">
                    <div className="font-medium truncate">{title}</div>
                    {sub ? (
                      <div className="text-xs text-gray-500 truncate">{sub}</div>
                    ) : null}
                  </div>
                </div>

                <div
                  className={`font-semibold ${String(move.type) === "OUT"
                    ? "text-red-600"
                    : "text-green-700"
                    }`}
                >
                  {displayQty}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
