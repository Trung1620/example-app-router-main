"use client";

import { useEffect, useState } from "react";
import { useForm, FieldValues, SubmitHandler } from "react-hook-form";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "react-hot-toast";
import { AiOutlineGoogle } from "react-icons/ai";
import Link from "next/link";

import Heading from "../components/Heading";
import Input from "../components/inputs/Input";
import Button from "../components/Button";

import { SafeUser } from "@/types";
import { useLocale, useTranslations } from "next-intl";

interface LoginFormProps {
  currentUser: SafeUser | null;
}

const LoginForm: React.FC<LoginFormProps> = ({ currentUser }) => {
  const t = useTranslations("Login");
  const locale = useLocale();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false); // fix hydration issue

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (currentUser) {
      router.push(`/${locale}/cart`);
      router.refresh();
    }
  }, [currentUser, locale, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    setIsLoading(true);
    signIn("credentials", {
      ...data,
      redirect: false,
    }).then((callback) => {
      setIsLoading(false);

      if (callback?.ok) {
        toast.success(t("loginSuccess"));
        router.push(`/${locale}/cart`);
        router.refresh();
      }

      if (callback?.error) {
        toast.error(callback.error);
        router.push(`/${locale}/auth/error?error=${encodeURIComponent(callback.error)}`);
      }
    });
  };

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    signIn("google", { redirect: false }).then((callback) => {
      setIsLoading(false);

      if (callback?.ok) {
        toast.success(t("loginSuccess"));
        router.push(`/${locale}/cart`);
        router.refresh();
      }

      if (callback?.error) {
        toast.error(callback.error || t("googleError"));
        router.push(`/${locale}/auth/error?error=${encodeURIComponent(callback.error || "GoogleSignInFailed")}`);
      }
    });
  };

  // ⚠️ Ngăn không cho render sớm gây lỗi hydration
  if (!mounted) return null;

  // Nếu đã đăng nhập, hiển thị đang chuyển hướng
  if (currentUser) {
    return <p className="text-center">{t("redirecting")}</p>;
  }

  return (
    <>
      <Heading title={t("heading")} />
      <Button
        outline
        label={t("google")}
        icon={AiOutlineGoogle}
        onClick={handleGoogleSignIn}
        disabled={isLoading}
      />
      <hr className="bg-slate-300 w-full h-px" />
      <Input
        id="email"
        label={t("email")}
        disabled={isLoading}
        register={register}
        errors={errors}
        required
      />
      <Input
        id="password"
        label={t("password")}
        disabled={isLoading}
        register={register}
        errors={errors}
        required
        type="password"
      />
      <Button
        label={isLoading ? t("loading") : t("login")}
        onClick={handleSubmit(onSubmit)}
        disabled={isLoading}
      />
      <p className="text-sm">
        {t("noAccount")}{" "}
        <Link className="underline" href={`/${locale}/register`}>
          {t("signup")}
        </Link>
      </p>
    </>
  );
};

export default LoginForm;
