import prismadb from "@/libs/prismadb";

async function main() {
  const orgCode = "trangbamboo";

  const org = await prismadb.org.findFirst({ where: { code: orgCode } });
  if (!org) throw new Error(`Org not found: ${orgCode}`);

  const r = await prismadb.product.updateMany({
    where: {
      OR: [
        { orgId: { equals: null } },      // field tồn tại nhưng null
        { orgId: { isSet: false } },      // field không tồn tại (Mongo)
      ],
    } as any,
    data: { orgId: org.id } as any,
  });

  console.log("Backfilled orgId for products:", r.count);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
