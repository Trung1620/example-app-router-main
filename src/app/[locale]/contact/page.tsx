"use client";

import { useTranslations } from "next-intl";
import Heading from "../components/Heading";
import Container from "../components/Container";
import Input from "@/app/[locale]/components/inputs/Input";
import TextArea from "@/app/[locale]/components/inputs/TextArea";
import Button from "@/app/[locale]/components/Button";
import { useForm, FieldValues, SubmitHandler } from "react-hook-form";
import toast from "react-hot-toast";

const ContactPage = () => {
  const t = useTranslations("Contact");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FieldValues>({
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
  });

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    toast.success(t("submitted"));
    console.log("Contact data:", data);
    reset();
  };

  return (
    <Container>
      <div className="py-12">
        <Heading title={t("heading")} center />

        <div className="mt-10 flex flex-col md:flex-row gap-8">
          {/* Left column: info + form */}
          <div className="md:w-1/2 space-y-6">
            <div className="text-slate-700 space-y-1 text-sm">
              <p><strong>{t("company")}</strong>: TrangBamboo Co., Ltd</p>
              <p><strong>{t("address")}</strong>: Trường Yên, Chương Mỹ, Hà Nội</p>
              <p><strong>{t("email")}</strong>: trangbamboovn@gmail.com</p>
              <p><strong>{t("phone")}</strong>: +84 977 877 318</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input id="name" label={t("name")} register={register} errors={errors} required />
              <Input id="email" label={t("email")} type="email" register={register} errors={errors} required />
              <TextArea id="message" label={t("message")} register={register} errors={errors} required />
              <Button label={t("send")} type="submit" />
            </form>
          </div>

          {/* Right column: map */}
          <div className="md:w-1/2">
            <h3 className="text-lg font-semibold mb-2">{t("map")}</h3>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d8864.096208081339!2d105.65289841966725!3d20.916609509156114!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31344f418e062173%3A0xf70863b0e6e25da8!2zWMaw4bufbmcgdHJhbmdiYW1ib28!5e0!3m2!1svi!2s!4v1744564320849!5m2!1svi!2s"
              width="100%"
              height="100%"
              className="rounded-md border min-h-[400px]"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </Container>
  );
};

export default ContactPage;
