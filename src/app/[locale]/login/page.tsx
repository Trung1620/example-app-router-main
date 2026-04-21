import getCurrentUser from "@/actions/getCurrentUser";
import Container from "../components/Container";
import FormWrap from "../components/FormWrap";
import LoginForm from "./LoginForm";

import { getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { type AppLocale } from "@/i18n";

export const dynamic = "force-dynamic";

type Params = Promise<{
  locale: AppLocale;
}>;

export default async function LoginPage({ params }: { params: Params }) {
  const { locale } = await params;

  const currentUser = await getCurrentUser();
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Container>
        <FormWrap>
          <LoginForm currentUser={currentUser} />
        </FormWrap>
      </Container>
    </NextIntlClientProvider>
  );
}
