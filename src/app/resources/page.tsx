import { prisma } from "@/lib/db";
import { Card } from "@/components/card";
import { DataTable } from "@/components/data-table";
import { getRequestRole, canEdit } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const resourceSchema = z.object({
  assignee: z.string(),
  role: z.string().optional(),
  base_capacity_h_per_month: z.string(),
  holiday_hours: z.string().optional(),
  availability_h: z.string().optional()
});

async function upsertResource(formData: FormData) {
  const role = getRequestRole();
  if (!canEdit(role)) {
    throw new Error("権限がありません");
  }
  const parsed = resourceSchema.parse(Object.fromEntries(formData.entries()));
  const base = Number(parsed.base_capacity_h_per_month);
  const holiday = Number(parsed.holiday_hours ?? "0");
  const availability = parsed.availability_h ? Number(parsed.availability_h) : base - holiday;

  const allocation = await prisma.monthlyPlan.aggregate({
    _sum: { adjustedH: true },
    where: { assignee: parsed.assignee }
  });
  const misc = await prisma.miscTask.aggregate({
    _sum: { adjustedH: true },
    where: { assignee: parsed.assignee }
  });
  const allocated = (allocation._sum.adjustedH ?? 0) + (misc._sum.adjustedH ?? 0);
  const utilization = availability > 0 ? allocated / availability : 0;

  await prisma.resource.upsert({
    where: { assignee: parsed.assignee },
    create: {
      assignee: parsed.assignee,
      role: parsed.role,
      baseCapacityHPerMonth: base,
      holidayHours: holiday,
      availabilityH: availability,
      allocatedH: allocated,
      utilization
    },
    update: {
      role: parsed.role,
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
      entityId: parsed.assignee,
      action: "upsert",
      user: role,
      diffJson: JSON.stringify({ allocated, utilization })
    }
  });
  revalidatePath("/resources");
}

export default async function ResourcesPage() {
  const role = getRequestRole();
  const [resources, settings] = await Promise.all([
    prisma.resource.findMany({ orderBy: { utilization: "desc" } }),
    prisma.setting.findMany()
  ]);
  const maxUtil = Number(settings.find((s) => s.key === "max_utilization_pct")?.value ?? "0.85");
  return (
    <div className="space-y-6">
      <Card title="担当者リソース" description="計画と実績を合わせた稼働率を表示します。">
        <DataTable
          columns={[
            { key: "assignee", header: "担当", accessor: (item) => item.assignee },
            { key: "role", header: "ロール", accessor: (item) => item.role ?? "" },
            { key: "availability", header: "可用工数", accessor: (item) => `${item.availabilityH}h` },
            {
              key: "allocated",
              header: "割当工数",
              accessor: (item) => `${item.allocatedH}h`
            },
            {
              key: "utilization",
              header: "稼働率",
              accessor: (item) => (
                <span className={item.utilization > maxUtil ? "font-semibold text-red-600" : ""}>
                  {(item.utilization * 100).toFixed(1)}%
                </span>
              )
            }
          ]}
          data={resources}
        />
        <p className="text-xs text-slate-500">MAX_UTIL 閾値: {Math.round(maxUtil * 100)}%</p>
      </Card>

      <Card title="リソース登録・更新" description="Excel 04 シートの入力フォーム">
        {canEdit(role) ? (
          <form
            className="grid gap-4 md:grid-cols-2"
            action={async (formData) => {
              "use server";
              await upsertResource(formData);
              redirect("/resources");
            }}
          >
            <label className="flex flex-col gap-1 text-sm">
              担当者
              <input name="assignee" required className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              ロール
              <input name="role" className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              月次基準工数
              <input type="number" step="0.1" name="base_capacity_h_per_month" required className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              休日工数
              <input type="number" step="0.1" name="holiday_hours" className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              可用工数 (任意)
              <input type="number" step="0.1" name="availability_h" className="rounded border px-3 py-2" />
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
    </div>
  );
}
