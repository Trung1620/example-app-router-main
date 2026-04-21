import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const artisans = await prismadb.artisan.findMany({
      where: { orgId },
      include: {
        attendances: {
          where: {
            date: {
              gte: startOfMonth,
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    const today = new Date().toDateString();

    const result = artisans.map(a => {
       const monthAttendances = a.attendances.filter(att => att.status === 'PRESENT');
       const todayAtt = monthAttendances.find(att => att.date.toDateString() === today);
       
       return {
         ...a,
         isWorking: !!todayAtt,
         totalDaysWorked: monthAttendances.length,
       };
    });

    return NextResponse.json({ artisans: result });
  } catch (error: any) {
    console.error("[ARTISANS_GET]", error);
    const msg = error?.message || "";
    const status = msg.includes("Unauthorized") ? 401 : msg.includes("org") ? 400 : 500;
    return NextResponse.json({ error: msg || "Internal Error" }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);
    const body = await req.json();
    const { name, phone, address, age, role, baseSalary, initialDebt, skills, code, dailyTarget, dailyWage, image } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const nAge = age ? parseInt(age) : null;
    const nSalary = baseSalary ? parseFloat(baseSalary) : 0;
    const nDebt = initialDebt ? parseFloat(initialDebt) : 0;
    const nDailyWage = dailyWage ? parseFloat(dailyWage) : 0;
    const nDailyTarget = dailyTarget ? parseInt(dailyTarget) : null;

    const artisan = await prismadb.artisan.create({
      data: {
        orgId,
        name,
        phone,
        address,
        code: code || undefined,
        age: isNaN(nAge as number) ? null : nAge,
        role,
        image,
        skills: skills || undefined,
        baseSalary: isNaN(nSalary) ? 0 : nSalary,
        dailyWage: isNaN(nDailyWage) ? 0 : nDailyWage,
        dailyTarget: nDailyTarget && !isNaN(nDailyTarget) ? nDailyTarget : undefined,
        debt: isNaN(nDebt) ? 0 : nDebt,
      },
    });

    return NextResponse.json(artisan);
  } catch (error: any) {
    console.error("[ARTISANS_POST]", error);
    const msg = error?.message || "";
    const status = msg.includes("Unauthorized") ? 401 : msg.includes("org") ? 400 : 500;
    return NextResponse.json({ error: msg || "Internal Error" }, { status });
  }
}

