import Container from "../components/Container";
import OrdersClient from "./OrderClient";
import getCurrentUser from "@/actions/getCurrentUser";
import NullData from "../components/NullData";
import getOrdersByUserId from "@/actions/getOrdersByUserId";

import { getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { type AppLocale } from "@/i18n";

export const dynamic = "force-dynamic";

type Params = Promise<{
  locale: AppLocale;
}>;

export default async function OrdersPage({ params }: { params: Params }) {
  const { locale } = await params;

  const currentUser = await getCurrentUser();
  const messages = await getMessages({ locale });

  if (!currentUser) {
    return (
      <NextIntlClientProvider locale={locale} messages={messages}>
        <NullData title="Oops! Access denied" />
      </NextIntlClientProvider>
    );
  }

  const orders = await getOrdersByUserId(currentUser.id);

  if (!orders || orders.length === 0) {
    return (
      <NextIntlClientProvider locale={locale} messages={messages}>
        <NullData title="No orders yet..." />
      </NextIntlClientProvider>
    );
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="pt-8">
        <Container>
          <OrdersClient orders={orders} />
        </Container>
      </div>
    </NextIntlClientProvider>
  );
}
