import { redirect } from "next/navigation";

export default function SignInRedirect() {
  const locale = "vi"; // fallback
  if (typeof window !== "undefined") {
    const detectedLocale = window.location.pathname.split("/")[1];
    redirect(`/${detectedLocale || locale}/login`);
  }

  redirect(`/${locale}/login`);
}
