"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { AiFillCaretDown } from "react-icons/ai";
import { useTranslations } from "next-intl";

import Avatar from "../Avatar";
import BackDrop from "./BackDrop";
import MenuItem from "./MenuItem";
import { SafeUser } from "@/types";

interface UserMenuProps {
  currentUser?: SafeUser | null;
}

const UserMenu: React.FC<UserMenuProps> = ({ currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "vi";
  const router = useRouter();
  const t = useTranslations("UserMenu");

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleNavigate = (path: string) => {
    toggleOpen();
    router.push(`/${locale}${path}`);
  };

  if (!mounted) return null;

  return (
    <>
      <div className="relative z-30">
        <div
          onClick={toggleOpen}
          className="p-2 border border-slate-400 flex items-center gap-1 rounded-full cursor-pointer hover:shadow-md transition text-slate-700"
        >
          <Avatar src={currentUser?.image} />
          <AiFillCaretDown />
        </div>

        {isOpen && (
          <div className="absolute right-0 top-12 w-[180px] bg-white shadow-md rounded-md overflow-hidden text-sm flex flex-col cursor-pointer">
            {currentUser ? (
              <>
                <MenuItem onClick={() => handleNavigate("/orders")}>
                  {t("yourOrders")}
                </MenuItem>

                {/* Chỉ admin mới thấy mục admin */}
                {currentUser.role === "ADMIN" && (
                  <MenuItem onClick={() => handleNavigate("/admin")}>
                    {t("admin")}
                  </MenuItem>
                )}

                <hr />
                <MenuItem
                  onClick={() => {
                    toggleOpen();
                    signOut({ callbackUrl: `/${locale}/login` }); // ✅ redirect về login
                  }}
                >
                  {t("logout")}
                </MenuItem>
              </>
            ) : (
              <>
                <MenuItem onClick={() => handleNavigate("/login")}>
                  {t("login")}
                </MenuItem>
                <MenuItem onClick={() => handleNavigate("/register")}>
                  {t("register")}
                </MenuItem>
              </>
            )}
          </div>
        )}
      </div>

      {isOpen && <BackDrop onClick={toggleOpen} />}
    </>
  );
};

export default UserMenu;
