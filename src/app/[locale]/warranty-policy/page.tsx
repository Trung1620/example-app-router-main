"use client";

import { useTranslations } from "next-intl";
import Heading from "../components/Heading";

const WarrantyPolicyPage = () => {
  const t = useTranslations("Warranty");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Heading title={t("title")} center />

      <div className="mt-6 space-y-6 text-slate-700 text-sm leading-relaxed">
        <p>{t("intro")}</p>
        <ul className="list-disc ml-6 mt-2 space-y-1">
          <li>{t("warranty1")}</li>
          <li>{t("warranty2")}</li>
          <li>{t("warranty3")}</li>
          <li>{t("warranty4")}</li>
          <li>{t("warranty5")}</li>
        </ul>
      </div>
    </div>
  );
};

export default WarrantyPolicyPage;
