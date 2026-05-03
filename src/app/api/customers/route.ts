import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";
import { z } from "zod";

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
  if (val === null || val === undefined) return [];
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
  return [];
}, z.array(z.string()).default([]));

const Body = z.object({
  type: optionalString, // "company" | "individual" (optional)
  name: z.string().min(1, "Tên khách hàng là bắt buộc"),

  companyName: optionalString,
  taxId: optionalString,
  address: optionalString,

  email: optionalEmail,
  phone: optionalString,

  contactName: optionalString,

  groupName: optionalString,
  tags: tagsSchema,

  note: optionalString,
  image: optionalString,
});

export async function GET(req: NextRequest) {
  const { orgId } = await requireApiContext(req);
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  const where: any = {
    orgId,
    ...(q
      ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { taxId: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { groupName: { equals: q as any } }, // groupName is Enum
        ],
      }
      : {}),
  };

  const items = await prismadb.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const { orgId } = await requireApiContext(req);

  let json: any;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Lấy mã khách hàng hoặc tự sinh mã duy nhất để tránh lỗi trùng lặp (Unique Constraint)
  let customerCode = (json as any).code || (json as any).customerCode;
  if (!customerCode || customerCode.trim() === "") {
    customerCode = `KH-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
  }

  // Lưu đầy đủ các trường để đồng bộ FrontEnd & BackEnd
  const prismaData: any = {
    orgId,
    name: data.name,
    email: data.email,
    phone: data.phone,
    address: data.address,
    taxId: data.taxId,
    
    type: data.type || (json as any).type,
    companyName: data.companyName || (json as any).companyName,
    contactName: data.contactName || (json as any).contactName,
    tags: data.tags || (json as any).tags || [],
    note: data.note || (json as any).note || (json as any).notes,
    image: data.image || (json as any).image,

    code: customerCode,
    zalo: (json as any).zalo || undefined,
    facebook: (json as any).facebook || undefined,
    birthday: (json as any).birthday ? new Date((json as any).birthday) : undefined,
    groupName: (json as any).groupName || "RETAIL",
  };

  try {
    const created = await prismadb.customer.create({
      data: prismaData,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("[CUSTOMER_POST_ERROR]", error);
    return NextResponse.json(
      { error: error?.message || "Lỗi lưu dữ liệu khách hàng" },
      { status: 500 }
    );
  }
}
