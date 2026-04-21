"use client";

import { useTranslations } from "next-intl";
import Container from "@/app/[locale]/components/Container";
import Heading from "@/app/[locale]/components/Heading";

const FAQPage = () => {
  const t = useTranslations("FAQ");

  const faqs = t.raw("questions") as { question: string; answer: string }[];

  return (
    <Container>
      <div className="max-w-3xl mx-auto py-12">
        <Heading title={t("title")} center />

        <div className="space-y-6 text-slate-700">
          {faqs.map((faq, index) => (
            <div key={index}>
              <h3 className="font-semibold">{faq.question}</h3>
              <p>{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
};

export default FAQPage;
