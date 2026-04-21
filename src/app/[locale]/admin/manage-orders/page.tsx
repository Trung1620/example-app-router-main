import Container from "../../components/Container";
import ManageOrdersClient from "./ManageOrdersClient";
import getCurrentUser from "@/actions/getCurrentUser";
import NullData from "../../components/NullData";
import getOrders from "@/actions/getOrders";
import { getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { type AppLocale } from "@/i18n";

type Props = {
  params: Promise<{
    locale: AppLocale;
  }>;
};

const ManageOrders = async ({ params }: Props) => {
  const { locale } = await params; // ✅ await bắt buộc

  const orders = await getOrders();
  const currentUser = await getCurrentUser();
  const messages = await getMessages({ locale });

  if (!currentUser || currentUser.role !== "ADMIN") {
    return (
      <NextIntlClientProvider locale={locale} messages={messages}>
        <NullData title="AdminAccessDenied" />
      </NextIntlClientProvider>
    );
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="pt-8">
        <Container>
          <ManageOrdersClient orders={orders} />
        </Container>
      </div>
    </NextIntlClientProvider>
  );
};

export default ManageOrders;
