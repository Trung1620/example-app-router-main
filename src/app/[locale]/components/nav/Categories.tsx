"use client";

import { categories } from "@/utils/Categories";
import Container from "../Container";
import Category from "./Category";
import { usePathname, useSearchParams } from "next/navigation";

const Categories = () => {
  const params = useSearchParams();
  const category = params?.get("category");
  const pathname = usePathname();

  const locale = pathname?.split("/")[1] || "vi";
  const isMainPage = pathname === `/${locale}`;

  if (!isMainPage) return null;

  return (
    <div className="bg-white w-full">
      <Container>
        <div className="pt-2 flex flex-row items-center justify-start gap-3 overflow-x-auto">
          {categories.map((item) => (
            <Category
              key={item.label}
              label={item.label}
              icon={item.icon}
              selected={category === item.label || (!category && item.label === "All")}
              locale={locale}
            />
          ))}
        </div>
      </Container>
    </div>
  );
};

export default Categories;
