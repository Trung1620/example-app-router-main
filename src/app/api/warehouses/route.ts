// src/app/api/warehouses/route.ts
import prismadb from "@/libs/prismadb";
import { NextResponse } from "next/server";
import { requireApiContext } from "@/app/api/_auth";

export const dynamic = "force-dynamic";

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

async function ensureUniqueCode(orgId: string, base: string) {
  let code = base || "warehouse";
  let i = 1;

  // check trùng -> thêm suffix -2 -3...
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = await prismadb.warehouse.findFirst({
      where: { orgId, code } as any,
      select: { id: true },
    });
    if (!exists) return code;
    i += 1;
    code = `${base}-${i}`;
  }
}

export async function GET(req: Request) {
  const { orgId } = await requireApiContext(req);

  const rows = await prismadb.warehouse.findMany({
    where: { orgId } as any,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ rows });
}

export async function POST(req: Request) {
  const { orgId } = await requireApiContext(req);

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || "").trim();
  const note = String(body?.note || "").trim();
  const address = String(body?.address || "").trim();

  if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });

  const base = slugify(name);
  const code = await ensureUniqueCode(orgId, base);

  const created = await prismadb.warehouse.create({
    data: {
      orgId,
      code,
      name,
      note: note || undefined,
      address: address || undefined,
    } as any,
  });

  return NextResponse.json({ id: created.id });
}

export async function DELETE(req: Request) {
  const { orgId } = await requireApiContext(req);
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prismadb.warehouse.delete({
    where: { id, orgId } as any,
  });

  return NextResponse.json({ success: true });
}
