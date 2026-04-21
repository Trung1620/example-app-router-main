import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await requireApiContext(req);
    const body = await req.json();
    const { name, image, phone, bio } = body;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updatedUser = await prismadb.user.update({
      where: { id: userId },
      data: {
        name,
        image,
        phone,
        bio,
      },
    });

    return NextResponse.json({
        success: true,
        user: {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            image: updatedUser.image,
            phone: updatedUser.phone,
            bio: updatedUser.bio,
        }
    });
  } catch (error) {
    console.error("UPDATE_USER_ERROR", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
