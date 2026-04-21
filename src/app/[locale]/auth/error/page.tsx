// src/app/[locale]/error/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const locale = searchParams.get("locale") || "en"; // Default là 'en'

  return (
    <div>
      <h1>Authentication Error</h1>
      <p>Error: {error || "Unknown error"}</p>
      <Link href={`/${locale}/login`}>Back to Login</Link>
    </div>
  );
}