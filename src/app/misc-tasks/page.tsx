import { prisma } from "@/lib/db";
import { Card } from "@/components/card";
import { DataTable } from "@/components/data-table";
import { getRequestRole, canEdit } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const taskSchema = z.object({
  date: z.string(),
  task_id: z.string(),
  task_name: z.string(),
  assignee: z.string(),
  category: z.string(),
  planned_h: z.string(),
  coeff: z.string(),
  note: z.string().optional()
});

async function upsertMiscTask(formData: FormData) {
  const role = getRequestRole();
  if (!canEdit(role)) {
    throw new Error("権限がありません");
  }
  const parsed = taskSchema.parse(Object.fromEntries(formData.entries()));
  const planned = Number(parsed.planned_h);
  const coeff = Number(parsed.coeff || "1");
  const adjusted = planned * coeff;
  await prisma.miscTask.upsert({
    where: { taskId: parsed.task_id },
    create: {
      date: new Date(parsed.date),
      taskId: parsed.task_id,
      taskName: parsed.task_name,
      assignee: parsed.assignee,
      category: parsed.category,
      plannedH: planned,
      coeff,
      adjustedH: adjusted,
      note: parsed.note ?? null
    },
    update: {
      date: new Date(parsed.date),
      taskName: parsed.task_name,
      assignee: parsed.assignee,
      category: parsed.category,
      plannedH: planned,
      coeff,
      adjustedH: adjusted,
      note: parsed.note ?? null
    }
  });
  await prisma.auditLog.create({
    data: {
      entity: "misc_task",
      entityId: parsed.task_id,
      action: "upsert",
      user: role,
      diffJson: JSON.stringify(parsed)
    }
  });
  revalidatePath("/misc-tasks");
}

export default async function MiscTasksPage() {
  const role = getRequestRole();
  const tasks = await prisma.miscTask.findMany({ orderBy: { date: "desc" } });
  return (
    <div className="space-y-6">
      <Card title="その他作業登録" description="打合せ/レビュー/教育などを記録します。">
        {canEdit(role) ? (
          <form
            className="grid gap-4 md:grid-cols-2"
            action={async (formData) => {
              "use server";
              await upsertMiscTask(formData);
              redirect("/misc-tasks");
            }}
          >
            <label className="flex flex-col gap-1 text-sm">
              日付
              <input type="date" name="date" required className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              タスクID
              <input name="task_id" required className="rounded border px-3 py-2" />
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
              カテゴリ
              <select name="category" className="rounded border px-3 py-2">
                <option value="打合せ">打合せ</option>
                <option value="レビュー">レビュー</option>
                <option value="教育">教育</option>
                <option value="庶務">庶務</option>
                <option value="障害対応">障害対応</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              計画工数 (h)
              <input type="number" step="0.1" name="planned_h" required className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              係数
              <input type="number" step="0.1" name="coeff" defaultValue="1" className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              メモ
              <textarea name="note" className="rounded border px-3 py-2" rows={2} />
            </label>
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className="rounded bg-brand px-4 py-2 text-white">
                保存
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-slate-600">閲覧権限では編集できません。</p>
        )}
      </Card>

      <Card title="登録済みその他作業" description="稼働率計算に加算されます">
        <DataTable
          columns={[
            { key: "date", header: "日付", accessor: (item) => item.date.toLocaleDateString("ja-JP") },
            { key: "id", header: "ID", accessor: (item) => item.taskId },
            { key: "name", header: "名称", accessor: (item) => item.taskName },
            { key: "assignee", header: "担当", accessor: (item) => item.assignee },
            { key: "category", header: "カテゴリ", accessor: (item) => item.category },
            { key: "hours", header: "調整後h", accessor: (item) => `${item.adjustedH}h` }
          ]}
          data={tasks}
        />
      </Card>
    </div>
  );
}
