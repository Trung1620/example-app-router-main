// src/app/api/uploads/cloudinary-sign/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST() {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = process.env.CLOUDINARY_UPLOAD_FOLDER || "trangbamboo/quotes";

  const paramsToSign: Record<string, string | number> = { folder, timestamp };
  const toSign =
    Object.keys(paramsToSign)
      .sort()
      .map((k) => `${k}=${paramsToSign[k]}`)
      .join("&") + process.env.CLOUDINARY_API_SECRET;

  const signature = crypto.createHash("sha1").update(toSign).digest("hex");

  return NextResponse.json({
    timestamp,
    signature,
    folder,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  });
}
