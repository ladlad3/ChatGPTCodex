import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestRole, canEdit } from "@/lib/auth";
import { z } from "zod";
import { startOfWeek } from "date-fns";

const schema = z.object({
  date: z.string(),
  projectId: z.string(),
  taskName: z.string(),
  assignee: z.string(),
  processCode: z.string(),
  plannedH: z.number(),
  coeff: z.number(),
  note: z.string().optional()
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const project = searchParams.get("projectId");
  const assignee = searchParams.get("assignee");
  let projectFilter: number | undefined;
  if (project) {
    const projectRecord = await prisma.project.findUnique({ where: { projectId: project } });
    projectFilter = projectRecord ? projectRecord.id : -1;
  }

  const data = await prisma.monthlyPlan.findMany({
    where: {
      projectId: projectFilter,
      assignee: assignee ?? undefined
    },
    include: { project: true }
  });
  return NextResponse.json(data);
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
  const project = await prisma.project.findUnique({ where: { projectId: parsed.data.projectId } });
  if (!project) {
    return new NextResponse("プロジェクトが存在しません", { status: 400 });
  }
  const adjusted = parsed.data.plannedH * parsed.data.coeff;
  const planDate = new Date(parsed.data.date);
  const weekStart = startOfWeek(planDate, { weekStartsOn: 1 });
  const plan = await prisma.monthlyPlan.create({
    data: {
      date: planDate,
      weekStart,
      projectId: project.id,
      taskName: parsed.data.taskName,
      assignee: parsed.data.assignee,
      processCode: parsed.data.processCode,
      plannedH: parsed.data.plannedH,
      coeff: parsed.data.coeff,
      adjustedH: adjusted,
      note: parsed.data.note
    }
  });
  await prisma.auditLog.create({
    data: {
      entity: "monthly_plan",
      entityId: String(plan.id),
      action: "create",
      user: role,
      diffJson: JSON.stringify(parsed.data)
    }
  });
  return NextResponse.json(plan);
}
