import prismadb from "@/libs/prismadb";

async function main() {
  const total = await prismadb.product.count();

  const withOrg = await prismadb.product.count({
    where: { orgId: { not: null } } as any,
  });

  const orgIdIsNull = await prismadb.product.count({
    where: { orgId: { equals: null } } as any,
  });

  const orgIdMissing = await prismadb.product.count({
    where: { orgId: { isSet: false } } as any,
  });

  console.log({ total, withOrg, orgIdIsNull, orgIdMissing });

  const sample = await prismadb.product.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: { id: true, nameVi: true, nameEn: true, orgId: true },
  } as any);

  console.log("sample:", sample);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
