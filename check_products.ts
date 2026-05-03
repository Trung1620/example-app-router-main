import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      nameVi: true,
      sku: true,
      barcode: true,
      images: true,
    }
  });

  const missingImages = products.filter(p => !p.images || p.images.length === 0);
  console.log(`Total products: ${products.length}`);
  console.log(`Products without images: ${missingImages.length}`);
  console.log('Sample missing images products:', missingImages.slice(0, 5));
}

main().catch(console.error).finally(() => prisma.$disconnect());
