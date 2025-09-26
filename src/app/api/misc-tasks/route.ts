import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestRole, canEdit } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  date: z.string(),
  taskId: z.string(),
  taskName: z.string(),
  assignee: z.string(),
  category: z.string(),
  plannedH: z.number(),
  coeff: z.number(),
  note: z.string().optional()
});

export async function GET() {
  const tasks = await prisma.miscTask.findMany();
  return NextResponse.json(tasks);
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
  const adjusted = parsed.data.plannedH * parsed.data.coeff;
  const task = await prisma.miscTask.upsert({
    where: { taskId: parsed.data.taskId },
    create: {
      date: new Date(parsed.data.date),
      taskId: parsed.data.taskId,
      taskName: parsed.data.taskName,
      assignee: parsed.data.assignee,
      category: parsed.data.category,
      plannedH: parsed.data.plannedH,
      coeff: parsed.data.coeff,
      adjustedH: adjusted,
      note: parsed.data.note
    },
    update: {
      date: new Date(parsed.data.date),
      taskName: parsed.data.taskName,
      assignee: parsed.data.assignee,
      category: parsed.data.category,
      plannedH: parsed.data.plannedH,
      coeff: parsed.data.coeff,
      adjustedH: adjusted,
      note: parsed.data.note
    }
  });
  await prisma.auditLog.create({
    data: {
      entity: "misc_task",
      entityId: task.taskId,
      action: "upsert",
      user: role,
      diffJson: JSON.stringify(parsed.data)
    }
  });
  return NextResponse.json(task);
}
