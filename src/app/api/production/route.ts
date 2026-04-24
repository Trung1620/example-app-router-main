import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);

    const orders = await prismadb.productionOrder.findMany({
      where: { orgId },
      include: {
        product: { select: { nameVi: true, sku: true, images: true } },
        artisan: { select: { name: true } },
        jobSheets: { include: { artisan: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders);
  } catch (error: any) {
    console.error("[PRODUCTION_GET]", error);
    return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);
    const body = await req.json();
    const { 
      orderNumber, 
      productId, 
      artisanIds, // Mảng các ID thợ
      materials,  // Mảng { materialId, quantity }
      quantity, 
      laborCostPerUnit,
      otherCosts,
      duration,
      startDate,
      expectedEndDate,
      notes 
    } = body;

    if (!orderNumber || !productId || !quantity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const nQuantity = parseInt(quantity || 1);
    const nLaborCost = parseFloat(laborCostPerUnit || 0);
    const nOtherCosts = parseFloat(otherCosts || 0);
    const nShippingCost = parseFloat(body.shippingCost || 0);

    // Tính toán tiền nguyên liệu
    let totalMaterialCost = 0;
    const materialData = [];
    if (Array.isArray(materials)) {
      for (const m of materials) {
        const mat = await prismadb.material.findUnique({ where: { id: m.materialId } });
        if (mat) {
          const cost = (mat.price || 0) * (m.quantity || 0);
          totalMaterialCost += cost;
          materialData.push({
            materialId: m.materialId,
            quantity: m.quantity || 0,
            unitCost: mat.price || 0
          });
        }
      }
    }

    const tLabor = nQuantity * nLaborCost;
    const tActual = totalMaterialCost + tLabor + nOtherCosts + nShippingCost;

    const order = await prismadb.productionOrder.create({
      data: {
        orgId,
        orderNumber,
        productId,
        quantity: nQuantity,
        laborCostPerUnit: nLaborCost,
        totalLaborCost: tLabor,
        totalMaterialCost,
        totalShippingCost: nShippingCost,
        otherCosts: nOtherCosts,
        actualTotalCost: tActual,
        duration: duration ? parseInt(duration) : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        expectedEndDate: expectedEndDate ? new Date(expectedEndDate) : undefined,
        note: notes,
        artisanId: Array.isArray(artisanIds) && artisanIds.length > 0 ? artisanIds[0] : undefined,
      },
    });

    // Tự động tạo Phiếu gia công (JobSheets) nếu có thợ được chọn
    if (Array.isArray(artisanIds) && artisanIds.length > 0) {
      for (const artisanId of artisanIds) {
        await prismadb.jobSheet.create({
          data: {
            orgId,
            orderId: order.id,
            artisanId,
            productId,
            quantity: nQuantity, // Mặc định giao hết cho thợ này (nếu có 1 thợ) hoặc chia đều? 
            // Ở đây tạm để mặc định là nQuantity cho đơn giản, người dùng có thể sửa sau.
            unitPrice: nLaborCost,
            totalAmount: nQuantity * nLaborCost,
            status: "OPEN",
            startDate: startDate ? new Date(startDate) : new Date(),
          }
        });
      }
    }

    return NextResponse.json(order);
  } catch (error: any) {
    console.error("[PRODUCTION_POST]", error);
    return NextResponse.json({ error: error?.message || "Internal Error" }, { status: 500 });
  }
}
