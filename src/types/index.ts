import { Role } from "@prisma/client";

export type SafeUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: Role;
  createdAt: string;
  updatedAt: string;
  emailVerified: string | null;
  orders?: any[]; // ✅ thêm orders (any[]) để duy trì tương thích với code cũ
};
