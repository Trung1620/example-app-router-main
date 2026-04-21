import Container from "../../components/Container";
import ManageProductsClient from "./ManageProductsClient";
import getProducts from "@/actions/getProducts";
import getCurrentUser from "@/actions/getCurrentUser";
import NullData from "../../components/NullData";
import { getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { type AppLocale } from "@/i18n";

type Props = {
  params: Promise<{
    locale: AppLocale;
  }>;
};

const ManageProducts = async ({ params }: Props) => {
  const { locale } = await params; // ✅ dùng await vì Next.js 15 truyền params dạng Promise

  const currentUser = await getCurrentUser();
  const messages = await getMessages({ locale });

  if (!currentUser || currentUser.role !== "ADMIN") {
    return (
      <NextIntlClientProvider locale={locale} messages={messages}>
        <NullData title="Oops! Access denied" />
      </NextIntlClientProvider>
    );
  }

  const products = await getProducts({ category: null, locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="pt-8">
        <Container>
          <ManageProductsClient products={products} />
        </Container>
      </div>
    </NextIntlClientProvider>
  );
};

export default ManageProducts;
