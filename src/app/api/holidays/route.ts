import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestRole, canEdit } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ date: z.string(), name: z.string() });

export async function GET() {
  const holidays = await prisma.holiday.findMany();
  return NextResponse.json(holidays);
}

export async function POST(request: NextRequest) {
  const role = getRequestRole();
  if (!canEdit(role)) {
    return new NextResponse("権限がありません", { status: 403 });
  }
  const json = await request.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }
  const holiday = await prisma.holiday.upsert({
    where: { date: new Date(parsed.data.date) },
    create: { date: new Date(parsed.data.date), name: parsed.data.name },
    update: { name: parsed.data.name }
  });
  await prisma.auditLog.create({
    data: {
      entity: "holiday",
      entityId: parsed.data.date,
      action: "upsert",
      user: role,
      diffJson: JSON.stringify(parsed.data)
    }
  });
  return NextResponse.json(holiday);
}
