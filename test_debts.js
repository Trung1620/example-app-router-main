const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const debts = await prisma.debt.findMany();
  console.log("TOTAL DEBTS IN DB:", debts.length);
  console.log(debts);
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
