import getCurrentUser from "@/actions/getCurrentUser";
import Container from "../components/Container";
import FormWrap from "../components/FormWrap";
import RegisterForm from "./RegisterForm";

import { getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { type AppLocale } from "@/i18n";

export const dynamic = "force-dynamic"; // đảm bảo luôn SSR nếu cần

type Params = Promise<{
  locale: AppLocale;
}>;

export default async function RegisterPage({ params }: { params: Params }) {
  const { locale } = await params;
  const currentUser = await getCurrentUser();
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Container>
        <FormWrap>
          <RegisterForm currentUser={currentUser} />
        </FormWrap>
      </Container>
    </NextIntlClientProvider>
  );
}
