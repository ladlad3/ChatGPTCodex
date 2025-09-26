import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestRole, canEdit } from "@/lib/auth";
import { parse } from "csv-parse/sync";

const handlers: Record<string, (row: Record<string, string>) => Promise<void>> = {
  projects: async (row) => {
    const planned = Number(row.planned_effort_h ?? "0");
    const coeff = Number(row.coeff ?? "1");
    await prisma.project.upsert({
      where: { projectId: row.project_id },
      create: {
        projectId: row.project_id,
        projectName: row.project_name,
        client: row.client,
        status: (row.status as any) ?? "PLANNED",
        pm: row.pm,
        startDate: row.start_date ? new Date(row.start_date) : null,
        endDate: row.end_date ? new Date(row.end_date) : null,
        plannedEffortH: planned,
        coeff,
        adjustedEffortH: planned * coeff,
        priority: row.priority ? Number(row.priority) : null,
        tags: row.tags,
        note: row.note
      },
      update: {
        projectName: row.project_name,
        client: row.client,
        status: (row.status as any) ?? "PLANNED",
        pm: row.pm,
        startDate: row.start_date ? new Date(row.start_date) : null,
        endDate: row.end_date ? new Date(row.end_date) : null,
        plannedEffortH: planned,
        coeff,
        adjustedEffortH: planned * coeff,
        priority: row.priority ? Number(row.priority) : null,
        tags: row.tags,
        note: row.note
      }
    });
  }
};

export async function POST(request: NextRequest) {
  const role = getRequestRole();
  if (!canEdit(role)) {
    return new NextResponse("権限がありません", { status: 403 });
  }
  const formData = await request.formData();
  const entity = formData.get("entity")?.toString() ?? "projects";
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return new NextResponse("ファイルが必要です", { status: 400 });
  }
  const csv = await file.text();
  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true
  }) as Record<string, string>[];
  const handler = handlers[entity];
  if (!handler) {
    return new NextResponse("未対応のエンティティです", { status: 400 });
  }
  const errors: { row: number; error: string }[] = [];
  for (const [index, record] of records.entries()) {
    try {
      await handler(record);
    } catch (error) {
      errors.push({ row: index + 2, error: (error as Error).message });
    }
  }
  return NextResponse.json({ imported: records.length - errors.length, errors });
}
