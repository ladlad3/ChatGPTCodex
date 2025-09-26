import { prisma } from "@/lib/db";
import { Card } from "@/components/card";
import { DataTable } from "@/components/data-table";
import { getRequestRole, canEdit } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { startOfWeek } from "date-fns";

const planSchema = z.object({
  date: z.string(),
  project_id: z.string(),
  task_name: z.string(),
  assignee: z.string(),
  process_code: z.string(),
  planned_h: z.string(),
  coeff: z.string(),
  note: z.string().optional()
});

async function createPlan(formData: FormData) {
  const role = getRequestRole();
  if (!canEdit(role)) {
    throw new Error("権限がありません");
  }
  const parsed = planSchema.parse(Object.fromEntries(formData.entries()));
  const planned = Number(parsed.planned_h);
  const coeff = Number(parsed.coeff || "1");
  const adjusted = planned * coeff;
  const project = await prisma.project.findUnique({ where: { projectId: parsed.project_id } });
  if (!project) {
    throw new Error("プロジェクトが存在しません");
  }
  const planDate = new Date(parsed.date);
  const weekStart = startOfWeek(planDate, { weekStartsOn: 1 });
  await prisma.monthlyPlan.create({
    data: {
      date: planDate,
      weekStart,
      projectId: project.id,
      taskName: parsed.task_name,
      assignee: parsed.assignee,
      processCode: parsed.process_code,
      plannedH: planned,
      coeff,
      adjustedH: adjusted,
      note: parsed.note ?? null
    }
  });
  await prisma.auditLog.create({
    data: {
      entity: "monthly_plan",
      entityId: `${parsed.project_id}-${parsed.date}-${parsed.assignee}`,
      action: "create",
      user: role,
      diffJson: JSON.stringify(parsed)
    }
  });
  revalidatePath("/monthly-plan");
}

export default async function MonthlyPlanPage({ searchParams }: { searchParams: { project?: string; assignee?: string } }) {
  const role = getRequestRole();
  const projectRecord = searchParams.project
    ? await prisma.project.findUnique({ where: { projectId: searchParams.project } })
    : null;
  const projectIdFilter = searchParams.project
    ? projectRecord?.id ?? -1
    : undefined;

  const [projects, processes, plans, settings, holidays] = await Promise.all([
    prisma.project.findMany({ orderBy: { projectName: "asc" } }),
    prisma.processMaster.findMany({ orderBy: { processName: "asc" } }),
    prisma.monthlyPlan.findMany({
      where: {
        projectId: projectIdFilter,
        assignee: searchParams.assignee
      },
      include: { project: true },
      orderBy: { date: "asc" }
    }),
    prisma.setting.findMany(),
    prisma.holiday.findMany({ orderBy: { date: "asc" } })
  ]);

  const maxUtil = Number(settings.find((s) => s.key === "max_utilization_pct")?.value ?? "0.85");
  const holidaySet = new Set(holidays.map((holiday) => holiday.date.toISOString().slice(0, 10)));

  return (
    <div className="space-y-6">
      <Card
        title="月次スケジュール登録"
        description="プロジェクトの予定を日単位で登録します。休日は設定シートを参照してハイライトされます。"
      >
        {canEdit(role) ? (
          <form
            className="grid gap-4 md:grid-cols-3"
            action={async (formData) => {
              "use server";
              await createPlan(formData);
              redirect("/monthly-plan");
            }}
          >
            <label className="flex flex-col gap-1 text-sm">
              日付
              <input type="date" name="date" required className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              プロジェクト
              <select name="project_id" className="rounded border px-3 py-2" required>
                <option value="">選択してください</option>
                {projects.map((project) => (
                  <option key={project.projectId} value={project.projectId}>
                    {project.projectName}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              工程
              <select name="process_code" className="rounded border px-3 py-2" required>
                <option value="">選択してください</option>
                {processes.map((process) => (
                  <option key={process.processCode} value={process.processCode}>
                    {process.processName}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              タスク名
              <input name="task_name" required className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              担当者
              <input name="assignee" required className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              計画工数 (h)
              <input type="number" step="0.1" name="planned_h" required className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              係数
              <input type="number" step="0.1" name="coeff" defaultValue="1" className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm md:col-span-3">
              メモ
              <textarea name="note" className="rounded border px-3 py-2" rows={2} />
            </label>
            <div className="md:col-span-3 flex justify-end">
              <button type="submit" className="rounded bg-brand px-4 py-2 text-white">
                登録
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-slate-600">閲覧権限では登録できません。</p>
        )}
      </Card>

      <Card title="登録済みスケジュール" description="休日・逼迫状態を色で表示します">
        <DataTable
          columns={[
            {
              key: "date",
              header: "日付",
              accessor: (item) => {
                const iso = item.date.toISOString().slice(0, 10);
                const isHoliday = holidaySet.has(iso);
                const isWeekend = [0, 6].includes(item.date.getDay());
                const className = isHoliday || isWeekend ? "font-semibold text-red-600" : "";
                return <span className={className}>{item.date.toLocaleDateString("ja-JP")}</span>;
              }
            },
            {
              key: "project",
              header: "プロジェクト",
              accessor: (item) => item.project.projectName
            },
            {
              key: "task",
              header: "タスク名",
              accessor: (item) => item.taskName
            },
            {
              key: "assignee",
              header: "担当",
              accessor: (item) => item.assignee
            },
            {
              key: "process",
              header: "工程",
              accessor: (item) => item.processCode
            },
            {
              key: "hours",
              header: "調整後h",
              accessor: (item) => {
                const overLimit = item.adjustedH > 8;
                return <span className={overLimit ? "font-semibold text-orange-600" : ""}>{`${item.adjustedH}h`}</span>;
              }
            }
          ]}
          data={plans}
        />
        <p className="text-xs text-slate-500">
          稼働率ハイライトは 04 シートと連動します。閾値: {Math.round(maxUtil * 100)}%
        </p>
      </Card>
    </div>
  );
}
