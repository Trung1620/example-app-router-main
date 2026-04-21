"use client";

import { useRouter, usePathname } from "next/navigation";
import queryString from "query-string";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";

const SearchBar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("Nav");

  const locale = pathname.split("/")[1] || "vi";

  const { register, handleSubmit, reset } = useForm<FieldValues>({
    defaultValues: {
      searchTerm: ""
    }
  });

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    if (!data.searchTerm) return router.push(`/${locale}`);

    const url = queryString.stringifyUrl(
      {
        url: `/${locale}`,
        query: {
          searchTerm: data.searchTerm
        }
      },
      { skipNull: true }
    );

    router.push(url);
    reset();
  };

  return (
    <div className="flex items-center">
      <input
        {...register("searchTerm")}
        autoComplete="off"
        type="text"
        placeholder={t("searchPlaceholder")}
        className="p-2 border border-gray-300 rounded-l-md focus:outline-none focus:border-slate-500 w-full"
      />
      <button
        onClick={handleSubmit(onSubmit)}
        className="bg-emerald-800 hover:opacity-80 text-white p-2 rounded-r-md whitespace-nowrap h-[42px]"
      >
        {t("search")}
      </button>
    </div>
  );
};

export default SearchBar;
