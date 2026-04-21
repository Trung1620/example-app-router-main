import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const quoteCount = await prisma.quote.count();
  const statuses = await prisma.quote.groupBy({
    by: ['status'],
    _count: true
  });
  const recentQuotes = await prisma.quote.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { number: true, status: true, createdAt: true, grandTotal: true }
  });

  console.log('TOTAL QUOTES:', quoteCount);
  console.log('STATUS DISTRIBUTION:', JSON.stringify(statuses, null, 2));
  console.log('RECENT QUOTES:', JSON.stringify(recentQuotes, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
