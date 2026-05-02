import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);

    const jobSheetModel = (prismadb as any).jobSheet || (prismadb as any).JobSheet;
    
    if (!jobSheetModel) {
      return NextResponse.json({ error: "JobSheet model not found" }, { status: 500 });
    }

    const jobSheets = await jobSheetModel.findMany({
      where: { orgId },
      include: {
        artisan: { select: { name: true } },
        product: { select: { nameVi: true, sku: true } },
        order: { select: { orderNumber: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    // Generate CSV
    // Using semicolon or comma? In Vietnam, Excel often expects semicolon if regional settings are set to VN,
    // but comma is standard. UTF-8 with BOM helps Excel recognize the encoding.
    const headers = [
      "Ngày tạo",
      "Mã Lệnh",
      "Thợ",
      "Sản phẩm",
      "SKU",
      "Số lượng giao",
      "Đã hoàn thành",
      "Đơn giá",
      "Thành tiền dự kiến",
      "Trạng thái"
    ];

    const rows = jobSheets.map((item: any) => {
      return [
        new Date(item.createdAt).toLocaleDateString("vi-VN"),
        item.order?.orderNumber || "",
        `"${(item.artisan?.name || "").replace(/"/g, '""')}"`,
        `"${(item.product?.nameVi || "").replace(/"/g, '""')}"`,
        item.product?.sku || "",
        item.quantity,
        item.completedQuantity || 0,
        item.unitPrice,
        item.totalAmount,
        item.status
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\r\n");

    // Add BOM for UTF-8 (Excel requirement for special characters)
    const BOM = "\uFEFF";
    const content = BOM + csvContent;

    return new Response(content, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="PhieuGiaCong_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("[JOB_SHEETS_EXPORT]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
