import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);
    const body = await req.json();
    const { 
      jobId, 
      quantity, 
      note
    } = body;

    const progressModel = (prismadb as any).productionProgress || (prismadb as any).ProductionProgress;
    const jobSheetModel = (prismadb as any).jobSheet || (prismadb as any).JobSheet;
    
    if (!progressModel || !jobSheetModel) {
      return NextResponse.json({ error: "Models not found in Prisma" }, { status: 500 });
    }

    const nQuantity = parseInt(quantity || 0);

    // 1. Create progress record
    const progress = await progressModel.create({
      data: {
        orgId,
        jobId,
        quantity: nQuantity,
        note
      }
    });

    // 2. Update JobSheet completedQuantity
    await jobSheetModel.update({
      where: { id: jobId },
      data: {
        completedQuantity: {
          increment: nQuantity
        }
      }
    });

    return NextResponse.json({ progress }, { status: 201 });
  } catch (error: any) {
    console.error("[PRODUCTION_PROGRESS_POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");

    const progressModel = (prismadb as any).productionProgress || (prismadb as any).ProductionProgress;
    
    if (!progressModel) {
      return NextResponse.json({ progress: [] });
    }

    const progress = await progressModel.findMany({
      where: { 
        orgId,
        ...(jobId ? { jobId } : {})
      },
      include: {
        job: {
          include: {
            artisan: { select: { name: true } },
            product: { select: { nameVi: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ progress });
  } catch (error: any) {
    console.error("[PRODUCTION_PROGRESS_GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
