import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const entityMap = {
  projects: async () => {
    const projects = await prisma.project.findMany();
    return projects.map(({
      projectId,
      projectName,
      client,
      status,
      pm,
      startDate,
      endDate,
      plannedEffortH,
      coeff,
      adjustedEffortH,
      priority,
      tags,
      note
    }) => ({
      project_id: projectId,
      project_name: projectName,
      client,
      status,
      pm,
      start_date: startDate?.toISOString().slice(0, 10) ?? "",
      end_date: endDate?.toISOString().slice(0, 10) ?? "",
      planned_effort_h: plannedEffortH,
      coeff,
      adjusted_effort_h: adjustedEffortH,
      priority,
      tags,
      note
    }));
  },
  "monthly-plan": async () => {
    const plans = await prisma.monthlyPlan.findMany({ include: { project: true } });
    return plans.map((plan) => ({
      date: plan.date.toISOString().slice(0, 10),
      project_id: plan.project.projectId,
      task_name: plan.taskName,
      assignee: plan.assignee,
      process_code: plan.processCode,
      planned_h: plan.plannedH,
      coeff: plan.coeff,
      adjusted_h: plan.adjustedH,
      note: plan.note ?? ""
    }));
  },
  resources: async () => {
    const resources = await prisma.resource.findMany();
    return resources.map((resource) => ({
      assignee: resource.assignee,
      role: resource.role ?? "",
      base_capacity_h_per_month: resource.baseCapacityHPerMonth,
      holiday_hours: resource.holidayHours,
      availability_h: resource.availabilityH,
      allocated_h: resource.allocatedH,
      utilization: resource.utilization
    }));
  },
  "process-master": async () => {
    const processes = await prisma.processMaster.findMany();
    return processes.map((process) => ({
      process_code: process.processCode,
      process_name: process.processName,
      default_coeff: process.defaultCoeff,
      description: process.description ?? ""
    }));
  },
  "misc-tasks": async () => {
    const tasks = await prisma.miscTask.findMany();
    return tasks.map((task) => ({
      date: task.date.toISOString().slice(0, 10),
      task_id: task.taskId,
      task_name: task.taskName,
      assignee: task.assignee,
      category: task.category,
      planned_h: task.plannedH,
      coeff: task.coeff,
      adjusted_h: task.adjustedH,
      note: task.note ?? ""
    }));
  }
} satisfies Record<string, () => Promise<any[]>>;

function toCsv(rows: any[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    if (value == null) return "";
    const str = String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escape(row[header])).join(","));
  }
  return lines.join("\r\n");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const entity = searchParams.get("entity") ?? "projects";
  const loader = entityMap[entity as keyof typeof entityMap];
  if (!loader) {
    return new NextResponse("未対応のエンティティです", { status: 400 });
  }
  const rows = await loader();
  const csv = toCsv(rows);
  return new NextResponse("\ufeff" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${entity}.csv`
    }
  });
}
