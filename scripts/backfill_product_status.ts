// scripts/backfill_product_status.ts
import prismadb from "@/libs/prismadb";
import { ProductStatus } from "@prisma/client";

async function main() {
  const orgCode = "trangbamboo";

  const org = await prismadb.org.findFirst({
    where: { code: orgCode },
  });
  if (!org) throw new Error("Org not found");

  const r = await prismadb.product.updateMany({
    where: {
      orgId: org.id,
    },
    data: {
      status: ProductStatus.ACTIVE,
    },
  });

  console.log("Updated products:", r.count);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
