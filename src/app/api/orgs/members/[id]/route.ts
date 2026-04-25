import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { orgId, member: currentUser } = await requireApiContext(req);
    const memberId = params.id;
    
    // Only Owner or Admin can update member status
    if (currentUser.role !== "OWNER" && currentUser.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json();
    const { status, role } = body;

    const updatedMember = await prismadb.orgMember.update({
      where: { id: memberId, orgId },
      data: {
        ...(status && { status }),
        ...(role && { role }),
      } as any

    });

    return NextResponse.json(updatedMember);
  } catch (error: any) {
    console.error("PATCH OrgMember Error:", error);
    return new NextResponse(error.message || "Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { orgId, member: currentUser } = await requireApiContext(req);
    const memberId = params.id;

    if (currentUser.role !== "OWNER" && currentUser.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    await prismadb.orgMember.delete({
      where: { id: memberId, orgId }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error("DELETE OrgMember Error:", error);
    return new NextResponse(error.message || "Internal Error", { status: 500 });
  }
}
