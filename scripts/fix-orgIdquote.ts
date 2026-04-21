// scripts/fix-orgId.ts
import prismadb from "@/libs/prismadb";

const ORG_ID = "6969e32cb823742ce1784664"; // ObjectId string hợp lệ

const whereMissingOrg = {
  OR: [
    { orgId: null },
    { orgId: { isSet: false } as any }, // Mongo: field chưa tồn tại
  ],
};

async function main() {
  console.log("== Fix orgId ==");
  console.log("ORG_ID:", ORG_ID);

  const quote = await prismadb.quote.updateMany({
    where: whereMissingOrg as any,
    data: { orgId: ORG_ID },
  });

  const delivery = await prismadb.delivery.updateMany({
    where: whereMissingOrg as any,
    data: { orgId: ORG_ID },
  });

  console.log("Updated quote:", quote);
  console.log("Updated delivery:", delivery);
  console.log("== Done ==");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prismadb.$disconnect();
  });
