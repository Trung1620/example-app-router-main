import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function GET(req: NextRequest) {
  try {
    const { orgId, member } = await requireApiContext(req);
    
    // Only Owner or Admin can list members
    if (member.role !== "OWNER" && member.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const members = await prismadb.orgMember.findMany({
      where: { orgId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(members);
  } catch (error: any) {
    console.error("GET OrgMembers Error:", error);
    return new NextResponse(error.message || "Internal Error", { status: 500 });
  }
}
