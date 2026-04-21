// src/libs/prismadb.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prismadb =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"], // bật warn để thấy connection issues
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prismadb;

export default prismadb;
