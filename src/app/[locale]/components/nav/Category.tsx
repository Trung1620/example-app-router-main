"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { IconType } from "react-icons";
import { useCallback } from "react";
import qs from "query-string";
import clsx from 'clsx'; // Nếu bạn dùng clsx hoặc classnames cũng được

interface CategoryProps {
  label: string;
  icon: IconType;
  selected?: boolean;
  locale: string;
}

const Category: React.FC<CategoryProps> = ({ label, icon: Icon, selected, locale }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleClick = useCallback(() => {
    const current = qs.parse(searchParams.toString());

    const updatedQuery = {
      ...current,
      category: label === "All" ? undefined : label
    };

    const url = qs.stringifyUrl({
      url: `/${locale}`,
      query: updatedQuery
    }, { skipNull: true });

    router.push(url);
  }, [label, searchParams, locale, router]);

  return (
    <div
      onClick={handleClick}
      className={clsx(
        "flex flex-col items-center justify-center gap-2 p-3 cursor-pointer border-b-2 transition hover:text-slate-800",
        selected ? "border-b-slate-800 text-slate-800" : "border-transparent text-slate-500"
      )}
    >
      <Icon size={26} />
      <div className="text-sm font-medium whitespace-nowrap">{label}</div>
    </div>
  );
};

export default Category;
