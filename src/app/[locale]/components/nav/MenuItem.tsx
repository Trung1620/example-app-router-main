"use client";

import { ReactNode } from "react";

interface MenuItemProps {
  onClick: () => void;
  children: ReactNode;
}

const MenuItem: React.FC<MenuItemProps> = ({ onClick, children }) => {
  return (
    <div
      onClick={onClick}
      className="px-4 py-3 hover:bg-slate-100 transition font-medium text-slate-700"
    >
      {children}
    </div>
  );
};

export default MenuItem;
