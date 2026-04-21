import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/authOptions";

async function requireAdminJSON() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Nếu có role trong session → bật check:
  // if ((session.user as any)?.role !== "ADMIN") {
  //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // }
  return null;
}

export async function GET() {
  const guard = await requireAdminJSON();
  if (guard) return guard;

  const settings = await prisma.siteSettings.findUnique({
    where: { id: "site" },
    select: { homeBannerProductIds: true },
  });

  return NextResponse.json(settings?.homeBannerProductIds ?? []);
}

export async function PUT(req: Request) {
  const guard = await requireAdminJSON();
  if (guard) return guard;

  let ids: string[];
  try {
    ids = await req.json();
    if (!Array.isArray(ids)) throw new Error("Invalid payload");
  } catch {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }

  const settings = await prisma.siteSettings.upsert({
    where: { id: "site" },
    update: { homeBannerProductIds: ids },
    create: { id: "site", homeBannerProductIds: ids },
  });

  return NextResponse.json(settings.homeBannerProductIds);
}
