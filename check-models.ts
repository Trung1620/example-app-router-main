
import prismadb from "./libs/prismadb";

async function main() {
  console.log("Prisma Models:", Object.keys(prismadb).filter(k => !k.startsWith("_") && typeof (prismadb as any)[k] === "object"));
}

main().catch(console.error);
