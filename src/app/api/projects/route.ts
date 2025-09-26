import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestRole, canEdit } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  projectId: z.string(),
  projectName: z.string(),
  client: z.string().optional(),
  status: z.enum(["PLANNED", "IN_PROGRESS", "ON_HOLD", "COMPLETED"]),
  pm: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  plannedEffortH: z.number(),
  coeff: z.number().optional(),
  adjustedEffortH: z.number().optional(),
  priority: z.number().optional(),
  tags: z.string().optional(),
  note: z.string().optional()
});

export async function GET() {
  const projects = await prisma.project.findMany();
  return NextResponse.json(projects);
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
  const coeff = parsed.data.coeff ?? 1;
  const adjusted = parsed.data.adjustedEffortH ?? parsed.data.plannedEffortH * coeff;
  const project = await prisma.project.upsert({
    where: { projectId: parsed.data.projectId },
    create: {
      projectId: parsed.data.projectId,
      projectName: parsed.data.projectName,
      client: parsed.data.client,
      status: parsed.data.status,
      pm: parsed.data.pm,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      plannedEffortH: parsed.data.plannedEffortH,
      coeff,
      adjustedEffortH: adjusted,
      priority: parsed.data.priority,
      tags: parsed.data.tags,
      note: parsed.data.note
    },
    update: {
      projectName: parsed.data.projectName,
      client: parsed.data.client,
      status: parsed.data.status,
      pm: parsed.data.pm,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      plannedEffortH: parsed.data.plannedEffortH,
      coeff,
      adjustedEffortH: adjusted,
      priority: parsed.data.priority,
      tags: parsed.data.tags,
      note: parsed.data.note
    }
  });
  await prisma.auditLog.create({
    data: {
      entity: "project",
      entityId: project.projectId,
      action: "upsert",
      user: role,
      diffJson: JSON.stringify(parsed.data)
    }
  });
  return NextResponse.json(project);
}

export async function DELETE(request: NextRequest) {
  const role = getRequestRole();
  if (!canEdit(role)) {
    return new NextResponse("権限がありません", { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return new NextResponse("projectId は必須です", { status: 400 });
  }
  await prisma.project.delete({ where: { projectId } });
  await prisma.auditLog.create({
    data: {
      entity: "project",
      entityId: projectId,
      action: "delete",
      user: role
    }
  });
  return NextResponse.json({ ok: true });
}
