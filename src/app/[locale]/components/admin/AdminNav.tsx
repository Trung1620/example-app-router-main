"use client";

import Link from "next/link";
import AdminNavItem from "./AdminNavItem";
import {
  MdDashboard,
  MdDns,
  MdFormatListBulleted,
  MdLibraryAdd,
} from "react-icons/md";
import { usePathname } from "next/navigation";
import Container from "../Container";

const AdminNav = () => {
  const pathname = usePathname();

  return (
    <div className="w-full shadow-sm top-20 border-b-[1px] pt-4">
      <Container>
        <div className="flex flex-row items-center justify-start gap-4 md:gap-8 overflow-x-auto pb-2 scrollbar-hide">
          <Link href={`/${pathname.split('/')[1]}/admin`}>
            <AdminNavItem
              label="Dashboard"
              icon={MdDashboard}
              selected={pathname.endsWith("/admin")}
            />
          </Link>
          <Link href={`/${pathname.split('/')[1]}/admin/quotes`}>
            <AdminNavItem
              label="Báo giá"
              icon={MdFormatListBulleted}
              selected={pathname.includes("/admin/quotes")}
            />
          </Link>
          <Link href={`/${pathname.split('/')[1]}/admin/stock/balance`}>
            <AdminNavItem
              label="Kho hàng"
              icon={MdDns}
              selected={pathname.includes("/admin/stock")}
            />
          </Link>
          <Link href={`/${pathname.split('/')[1]}/admin/customers`}>
            <AdminNavItem
              label="Khách hàng"
              icon={MdLibraryAdd}
              selected={pathname.includes("/admin/customers")}
            />
          </Link>
          <Link href={`/${pathname.split('/')[1]}/admin/manage-products`}>
            <AdminNavItem
              label="Sản phẩm"
              icon={MdDns}
              selected={pathname.includes("/admin/manage-products")}
            />
          </Link>
        </div>
      </Container>
    </div>
  );
};

export default AdminNav;
