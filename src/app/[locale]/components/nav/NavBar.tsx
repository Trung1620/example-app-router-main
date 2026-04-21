"use client";

import { SafeUser } from "@/types";
import { useLocale } from "next-intl";


import Container from "../Container";
import Logo from "./Logo";
import SearchBar from "./SearchBar";
import CartCount from "./CartCount";
import UserMenu from "./UserMenu";
import Categories from "./Categories";
import LanguageSwitcher from "./LanguageSwitcher";

interface NavBarProps {
  currentUser: SafeUser | null;
}

const NavBar: React.FC<NavBarProps> = ({ currentUser }) => {
  const locale = useLocale();
  

  return (
    <>
      {/* Top Navbar */}
      <div className="sticky top-0 z-40 w-full bg-white shadow-md border-b">
        <Container>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 py-3 px-2 md:px-4">
            {/* Left: Logo */}
            <div className="flex items-center gap-4">
              <Logo />
              <div className="block md:hidden w-full">
                <SearchBar />
              </div>
            </div>

            {/* Center: Search (hidden on mobile) */}
            <div className="hidden md:flex flex-grow justify-center">
              <SearchBar />
            </div>

            {/* Right: Cart / User / Language */}
            <div className="flex items-center gap-4 justify-end">
              <CartCount locale={locale} />
              <UserMenu currentUser={currentUser} />
              <LanguageSwitcher />
            </div>
          </div>
        </Container>
      </div>

      {/* Categories */}
      <div className="bg-white border-b">
        <Container>
          <div className="flex overflow-x-auto gap-5 px-2 py-3 scroll-snap-x snap-x snap-mandatory whitespace-nowrap">
            <Categories />
          </div>
        </Container>
      </div>
    </>
  );
};

export default NavBar;
