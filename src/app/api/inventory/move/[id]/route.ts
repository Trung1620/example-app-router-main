import prismadb from "@/libs/prismadb";
import { NextRequest, NextResponse } from "next/server";
import { getApiAuth } from "@/app/api/_auth";
import { getOrgIdForApiOrThrow } from "@/app/api/_org";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await getApiAuth(req);
        if (!auth.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { orgId } = await getOrgIdForApiOrThrow(req, auth.userId);

    const { id } = await params;

    const move = await prismadb.stockMove.findFirst({
        where: { id, orgId } as any,
        include: { items: { include: { product: true, variant: true } }, warehouse: true },
    });

    if (!move) return NextResponse.json({ error: "Move not found" }, { status: 404 });
    return NextResponse.json({ move });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
