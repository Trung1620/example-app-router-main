import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.artisan.deleteMany({
    where: {
      OR: [
        { name: { contains: "Trần thj hiền", mode: "insensitive" } },
        { name: { contains: "nguyễn văn chúc", mode: "insensitive" } },
        { name: { contains: "Trần thị hiền", mode: "insensitive" } }
      ]
    }
  });
  console.log(`Deleted ${result.count} artisans.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
