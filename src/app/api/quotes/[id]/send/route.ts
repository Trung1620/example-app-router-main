import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { getApiAuth } from "@/app/api/_auth";
import { getOrgIdForApiOrThrow } from "@/app/api/_org";
import { requireQuotePermission } from "@/libs/quotePermission";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function mapErrorStatus(message: string) {
  if (
    message === "Missing bearer token" ||
    message === "Invalid token" ||
    message === "Unauthorized"
  ) {
    return 401;
  }

  if (
    message === "Not a member of this org" ||
    message.startsWith("Permission denied")
  ) {
    return 403;
  }

  return 500;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const auth = await getApiAuth(req);
    if (!auth.userId) {
      return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
    }

    const { orgId } = await getOrgIdForApiOrThrow(req, auth.userId);

    await requireQuotePermission({
      orgId,
      userId: auth.userId,
      allowRoles: ["OWNER", "ADMIN"],
      allowPermissions: ["QUOTE_CREATE"],
    });

    const { id } = await params;

    const quote = await prismadb.quote.findFirst({
      where: {
        id,
        orgId,
      },
      select: {
        id: true,
        number: true,
        status: true,
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const updated = await prismadb.quote.update({
      where: { id },
      data: {
        status: "SENT",
      },
      select: {
        id: true,
        number: true,
        status: true,
      },
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "https://trangbamboo.com";

    return NextResponse.json({
      ok: true,
      quote: updated,
      shareUrl: `${baseUrl}/q/${id}`,
      pdfUrl: `${baseUrl}/q/${id}/print?format=pdf`,
    });
  } catch (error: any) {
    const message = error?.message || "Failed to send quote";
    return NextResponse.json(
      { error: message },
      { status: mapErrorStatus(message) }
    );
  }
}