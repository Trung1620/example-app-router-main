// src/app/api/customers/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** ====== HELPERS: cho phép null / "" / undefined ====== */
const optionalString = z.preprocess((val) => {
  if (val === null || val === undefined) return undefined;
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  return val;
}, z.string().optional());

const optionalEmail = z.preprocess((val) => {
  if (val === null || val === undefined) return undefined;
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  return val;
}, z.string().optional());

/** tags: cho phép null / undefined / string "a,b" / array */
const tagsSchema = z.preprocess((val) => {
  if (val === null || val === undefined) return undefined; // PATCH: nếu không gửi thì bỏ qua
  if (Array.isArray(val)) {
    return val
      .filter((x) => typeof x === "string")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  if (typeof val === "string") {
    return val
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return undefined;
}, z.array(z.string()).optional());

/** PATCH body: mọi field optional */
const PatchBody = z.object({
  type: optionalString, // "company" | "individual"
  name: optionalString, // nếu muốn bắt buộc name khi PATCH thì xử lý riêng

  companyName: optionalString,

  taxId: optionalString,
  address: optionalString,

  email: optionalEmail,
  phone: optionalString,

  contactName: optionalString,
  groupName: optionalString,

  tags: tagsSchema,
  notes: optionalString,
  image: optionalString,
});

function json400(error: any) {
  return NextResponse.json(
    { error: "Invalid input", issues: error?.issues },
    { status: 400 }
  );
}

function json404() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

/** ====== GET /api/customers/[id] ====== */
export async function GET(req: NextRequest, { params }: Ctx) {
  const { orgId } = await requireApiContext(req);
  const { id: rawId } = await params;

  const id = String(rawId || "").trim();
  if (!id) return json404();

  const customer = await prismadb.customer.findFirst({
    where: { id, orgId } as any,
  });

  if (!customer) return json404();
  return NextResponse.json(customer);
}

/** ====== PATCH /api/customers/[id] ======
 *  - cập nhật 1 phần field
 *  - orgId-first
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { orgId } = await requireApiContext(req);
  const { id: rawId } = await params;

  const id = String(rawId || "").trim();
  if (!id) return json404();

  // ✅ ensure tồn tại trong org
  const existed = await prismadb.customer.findFirst({
    where: { id, orgId } as any,
    select: { id: true },
  });
  if (!existed) return json404();

  let json: any;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) return json400(parsed.error);

  const data: any = { ...parsed.data };

  // ✅ nếu PATCH có gửi tags = null -> muốn clear tags => cho phép clear theo key riêng
  // Nếu bạn muốn clear bằng null thì bật đoạn dưới:
  // if ("tags" in json && (json.tags === null || json.tags === undefined)) data.tags = [];

  // ✅ nếu muốn bắt buộc name không được rỗng khi gửi lên
  if ("name" in data && (!data.name || String(data.name).trim() === "")) {
    return NextResponse.json(
      {
        error: "Invalid input",
        issues: [{ path: ["name"], message: "Name is required" }],
      },
      { status: 400 }
    );
  }

  const updated = await prismadb.customer.update({
    where: { id } as any,
    data,
  });

  return NextResponse.json(updated);
}

/** ====== DELETE /api/customers/[id] ======
 *  - nếu customer đã có quote => tuỳ bạn chặn, hoặc cho xóa
 *  - ở đây: CHẶN nếu có quote để tránh mất liên kết
 */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { orgId } = await requireApiContext(req);
  const { id: rawId } = await params;

  const id = String(rawId || "").trim();
  if (!id) return json404();

  const customer = await prismadb.customer.findFirst({
    where: { id, orgId } as any,
    select: { id: true },
  });
  if (!customer) return json404();

  const quotesCount = await prismadb.quote.count({
    where: { orgId, customerId: id } as any,
  });

  if (quotesCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete customer because it has quotes", quotesCount },
      { status: 409 }
    );
  }

  await prismadb.customer.delete({
    where: { id } as any,
  });

  return NextResponse.json({ ok: true });
}
