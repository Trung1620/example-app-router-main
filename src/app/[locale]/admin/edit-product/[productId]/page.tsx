import { notFound } from "next/navigation";
import { getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { locales, type AppLocale } from "@/i18n";

import getCurrentUser from "@/actions/getCurrentUser";
import prisma from "../../../../../../libs/prismadb";
import EditProductForm from "./EditProductForm";
import NullData from "../../../components/NullData";

export const dynamic = "force-dynamic";

type Params = Promise<{
  locale: AppLocale;
  productId: string;
}>;

export default async function EditProductPage({ params }: { params: Params }) {
  const { locale, productId } = await params;

  if (!locales.includes(locale)) notFound();

  const messages = await getMessages({ locale });
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return (
      <NextIntlClientProvider locale={locale} messages={messages}>
        <NullData title="Access denied" />
      </NextIntlClientProvider>
    );
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { images: true },
  });

  if (!product) {
    return (
      <NextIntlClientProvider locale={locale} messages={messages}>
        <NullData title="Product not found" />
      </NextIntlClientProvider>
    );
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="p-8">
        <EditProductForm product={product} />
      </div>
    </NextIntlClientProvider>
  );
}
