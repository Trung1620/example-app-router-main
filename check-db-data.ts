import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  const products = await prisma.product.findMany({
    select: {
      nameVi: true,
      images: true,
      orgId: true
    }
  });

  console.log(JSON.stringify(products, null, 2));
}

checkData().catch(console.error).finally(() => prisma.$disconnect());
