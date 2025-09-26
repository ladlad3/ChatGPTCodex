import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestRole, canEdit } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  assignee: z.string(),
  role: z.string().optional(),
  baseCapacityHPerMonth: z.number(),
  holidayHours: z.number().optional(),
  availabilityH: z.number().optional()
});

export async function GET() {
  const resources = await prisma.resource.findMany();
  return NextResponse.json(resources);
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
  const base = parsed.data.baseCapacityHPerMonth;
  const holiday = parsed.data.holidayHours ?? 0;
  const availability = parsed.data.availabilityH ?? base - holiday;
  const allocation = await prisma.monthlyPlan.aggregate({
    _sum: { adjustedH: true },
    where: { assignee: parsed.data.assignee }
  });
  const misc = await prisma.miscTask.aggregate({
    _sum: { adjustedH: true },
    where: { assignee: parsed.data.assignee }
  });
  const allocated = (allocation._sum.adjustedH ?? 0) + (misc._sum.adjustedH ?? 0);
  const utilization = availability > 0 ? allocated / availability : 0;
  const resource = await prisma.resource.upsert({
    where: { assignee: parsed.data.assignee },
    create: {
      assignee: parsed.data.assignee,
      role: parsed.data.role,
      baseCapacityHPerMonth: base,
      holidayHours: holiday,
      availabilityH: availability,
      allocatedH: allocated,
      utilization
    },
    update: {
      role: parsed.data.role,
      baseCapacityHPerMonth: base,
      holidayHours: holiday,
      availabilityH: availability,
      allocatedH: allocated,
      utilization
    }
  });
  await prisma.auditLog.create({
    data: {
      entity: "resource",
      entityId: resource.assignee,
      action: "upsert",
      user: role,
      diffJson: JSON.stringify({ ...parsed.data, allocated, utilization })
    }
  });
  return NextResponse.json(resource);
}
