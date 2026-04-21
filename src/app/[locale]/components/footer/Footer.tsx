"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import Container from "../Container";
import FooterList from "./FooterList";


import { FaPinterest } from "react-icons/fa";
import {
  AiFillTwitterCircle,
  AiFillInstagram,
  AiFillYoutube,
} from "react-icons/ai";

const Footer = () => {
  const locale = useLocale();
  const t = useTranslations("Footer");

  return (
    <footer className="bg-emerald-700 text-slate-200 text-sm mt-16">
      <Container>
        <div className="flex flex-col md:flex-row justify-between pt-16 pb-8">
          {/* Cột 1: Shop Online */}
          <FooterList>
            <h3 className="text-base font-bold mb-2">{t("shopOnline")}</h3>
            <Link href="https://www.facebook.com/trangbamboo.vn/" target="_blank">Facebook</Link>
            <Link href="https://www.shopee.vn/trangphong1993" target="_blank">Shopee</Link>
            <Link href="https://www.lazada.vn/shop/vintage-zone-trang" target="_blank">Lazada</Link>
            <Link href="#">Tiki</Link>
            <Link href="#">Tiktokshop</Link>
            <Link
              href="https://drive.google.com/file/d/1SURGoPl7lZXNzs4ZdPUDidlAge3FVz_o/view?usp=drive_link"
              target="_blank"
            >
              {t("catalogue")}
            </Link>
          </FooterList>

          {/* Cột 2: Chính sách */}
          <FooterList>
            <h3 className="text-base font-bold mb-2">{t("info")}</h3>
            <Link href={`/${locale}/contact`} className="hover:underline">
              {t("contact")}
            </Link>
            <Link href={`/${locale}/shipping-policy`} className="hover:underline">
              {t("shipping-policy")}
            </Link>
            <Link href={`/${locale}/warranty-policy`} className="hover:underline">
              {t("warranty")}
            </Link>
            <Link href={`/${locale}/faq`} className="hover:underline">
              {t("faq")}
            </Link>
          </FooterList>

          {/* Cột 3: About */}
          <div className="w-full md:w-1/3 mb-6 md:mb-0">
            <h3 className="text-base font-bold mb-2">{t("about")}</h3>
            <p className="mb-2 font-sans">{t("description")}</p>
            <p className="font-bold font-sans">
              {t("phone")}: 0977877318 (FB/Zalo)
            </p>
            <p>&copy; {new Date().getFullYear()} KhanhNguyen. {t("rights")}</p>
          </div>

          {/* Cột 4: Mạng xã hội */}
          <FooterList>
            <h3 className="text-base font-bold mb-2">{t("follow")}</h3>
            <div className="flex gap-2">
              <Link href="https://www.pinterest.com/trangbamboocom/" target="_blank">
                <FaPinterest size={24} />
              </Link>
              <Link href="#">
                <AiFillTwitterCircle size={24} />
              </Link>
              <Link href="https://www.instagram.com/nguyenthutrang1993/" target="_blank">
                <AiFillInstagram size={24} />
              </Link>
              <Link href="#">
                <AiFillYoutube size={24} />
              </Link>
            </div>
          </FooterList>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
