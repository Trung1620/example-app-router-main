import prismadb from "@/libs/prismadb";
import { Prisma } from "@prisma/client";

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export async function nextQuoteNumber(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const prefix = `QUOTE-${y}${m}`;

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      // Tăng seq nếu đã tồn tại (atomic)
      const counter = await prismadb.counter.update({
        where: { id: prefix },
        data: { seq: { increment: 1 }, updated: new Date() },
      });
      const seq = String(counter.seq).padStart(4, "0");
      return `QB-${y}${m}-${seq}`;
    } catch (e: any) {
      // P2025: not found -> tạo mới (seq = 1)
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
        try {
          await prismadb.counter.create({ data: { id: prefix, seq: 1, updated: new Date() } });
          return `QB-${y}${m}-0001`;
        } catch (ce: any) {
          // P2002: unique conflict do race -> retry update ở vòng sau
          if (ce instanceof Prisma.PrismaClientKnownRequestError && ce.code === "P2002") {
            // fall-through để retry
          } else {
            throw ce;
          }
        }
      }
      // P2034 / các lỗi race khác -> backoff rồi thử lại
      await sleep(30 * attempt);
    }
  }
  throw new Error("Could not generate quote number due to contention.");
}
