"use client";

import { useTranslations } from "next-intl";
import Container from "@/app/[locale]/components/Container";
import Heading from "@/app/[locale]/components/Heading";

const ShippingPolicyPage = () => {
  const t = useTranslations("ShippingPolicy");

  return (
    <Container>
      <div className="max-w-3xl mx-auto py-12">
        <Heading title={t("title")} center />

        <p className="text-slate-700 mb-4">{t("intro")}</p>
        <ul className="list-disc pl-6 text-slate-700 space-y-2">
          <li>{t("domestic")}</li>
          <li>{t("bulk")}</li>
        </ul>
      </div>
    </Container>
  );
};

export default ShippingPolicyPage;
