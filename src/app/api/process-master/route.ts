import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestRole, canEdit } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  processCode: z.string(),
  processName: z.string(),
  defaultCoeff: z.number(),
  description: z.string().optional()
});

export async function GET() {
  const processes = await prisma.processMaster.findMany();
  return NextResponse.json(processes);
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
  const process = await prisma.processMaster.upsert({
    where: { processCode: parsed.data.processCode },
    create: parsed.data,
    update: parsed.data
  });
  await prisma.auditLog.create({
    data: {
      entity: "process_master",
      entityId: parsed.data.processCode,
      action: "upsert",
      user: role,
      diffJson: JSON.stringify(parsed.data)
    }
  });
  return NextResponse.json(process);
}
