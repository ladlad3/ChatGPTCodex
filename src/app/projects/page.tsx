import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/card";
import { DataTable } from "@/components/data-table";
import { DeleteButton } from "@/components/delete-button";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirect } from "next/navigation";
import { getRequestRole, canEdit } from "@/lib/auth";

const projectSchema = z.object({
  project_id: z.string().min(1),
  project_name: z.string().min(1),
  client: z.string().optional(),
  status: z.enum(["PLANNED", "IN_PROGRESS", "ON_HOLD", "COMPLETED"]),
  pm: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  planned_effort_h: z.string(),
  coeff: z.string().optional(),
  priority: z.string().optional(),
  tags: z.string().optional(),
  note: z.string().optional()
});

async function createProject(formData: FormData) {
  const role = getRequestRole();
  if (!canEdit(role)) {
    throw new Error("権限がありません");
  }
  const parsed = projectSchema.parse(Object.fromEntries(formData.entries()));
  const planned = Number(parsed.planned_effort_h);
  const coeff = parsed.coeff ? Number(parsed.coeff) : 1;
  const adjusted = planned * coeff;
  if (parsed.start_date && parsed.end_date && parsed.start_date > parsed.end_date) {
    throw new Error("開始日は終了日より前である必要があります");
  }
  await prisma.project.create({
    data: {
      projectId: parsed.project_id,
      projectName: parsed.project_name,
      client: parsed.client,
      status: parsed.status,
      pm: parsed.pm,
      startDate: parsed.start_date ? new Date(parsed.start_date) : null,
      endDate: parsed.end_date ? new Date(parsed.end_date) : null,
      plannedEffortH: planned,
      coeff,
      adjustedEffortH: adjusted,
      priority: parsed.priority ? Number(parsed.priority) : null,
      tags: parsed.tags,
      note: parsed.note ?? null
    }
  });
  await prisma.auditLog.create({
    data: {
      entity: "project",
      entityId: parsed.project_id,
      action: "create",
      user: role,
      diffJson: JSON.stringify(parsed)
    }
  });
  revalidatePath("/projects");
}

async function deleteProject(projectId: string) {
  const role = getRequestRole();
  if (!canEdit(role)) {
    throw new Error("権限がありません");
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
  revalidatePath("/projects");
}

async function deleteProjectAction(projectId: string) {
  "use server";
  await deleteProject(projectId);
}

export default async function ProjectsPage() {
  const role = getRequestRole();
  const projects = await prisma.project.findMany({ orderBy: { priority: "desc" } });
  return (
    <div className="space-y-6">
      <Card title="プロジェクト追加" description="Excel シート 02 の入力項目を再現">
        {canEdit(role) ? (
          <form
            className="grid gap-4 md:grid-cols-2"
            action={async (formData) => {
              "use server";
              await createProject(formData);
              redirect("/projects");
            }}
          >
            <label className="flex flex-col gap-1 text-sm">
              プロジェクトID
              <input name="project_id" required className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              プロジェクト名
              <input name="project_name" required className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              顧客
              <input name="client" className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              ステータス
              <select name="status" className="rounded border px-3 py-2">
                <option value="PLANNED">計画</option>
                <option value="IN_PROGRESS">進行</option>
                <option value="ON_HOLD">保留</option>
                <option value="COMPLETED">完了</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              PM
              <input name="pm" className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              開始日
              <input type="date" name="start_date" className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              終了日
              <input type="date" name="end_date" className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              計画工数 (h)
              <input type="number" step="0.1" name="planned_effort_h" required className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              係数
              <input type="number" step="0.1" name="coeff" className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              優先度
              <input type="number" name="priority" className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              タグ
              <input name="tags" className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              メモ
              <textarea name="note" className="rounded border px-3 py-2" rows={3} />
            </label>
            <div className="md:col-span-2 flex justify-end gap-2">
              <button type="submit" className="rounded bg-brand px-4 py-2 text-white">
                登録
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-slate-600">閲覧権限では登録できません。</p>
        )}
      </Card>

      <Card title="プロジェクト一覧" description="ステータスで絞り込み・リンクから月次へ遷移">
        <DataTable
          columns={[
            { key: "id", header: "ID", accessor: (item) => item.projectId },
            { key: "name", header: "名称", accessor: (item) => item.projectName },
            { key: "status", header: "ステータス", accessor: (item) => item.status },
            { key: "period", header: "期間", accessor: (item) => `${item.startDate?.toLocaleDateString() ?? ""}〜${item.endDate?.toLocaleDateString() ?? ""}` },
            { key: "effort", header: "調整後工数", accessor: (item) => `${item.adjustedEffortH}h` },
            {
              key: "link",
              header: "スケジュール",
              accessor: (item) => (
                <Link href={`/monthly-plan?project=${item.projectId}`} className="text-brand">
                  月次を見る
                </Link>
              )
            },
            {
              key: "actions",
              header: "操作",
              accessor: (item) =>
                canEdit(role) ? (
                  <DeleteButton onConfirm={deleteProjectAction.bind(null, item.projectId)} />
                ) : null
            }
          ]}
          data={projects}
        />
      </Card>
    </div>
  );
}
