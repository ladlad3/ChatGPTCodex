import { prisma } from "@/lib/db";
import { Card } from "@/components/card";
import { DataTable } from "@/components/data-table";
import { getRequestRole, canEdit } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const processSchema = z.object({
  process_code: z.string(),
  process_name: z.string(),
  default_coeff: z.string(),
  description: z.string().optional()
});

async function upsertProcess(formData: FormData) {
  const role = getRequestRole();
  if (!canEdit(role)) {
    throw new Error("権限がありません");
  }
  const parsed = processSchema.parse(Object.fromEntries(formData.entries()));
  await prisma.processMaster.upsert({
    where: { processCode: parsed.process_code },
    create: {
      processCode: parsed.process_code,
      processName: parsed.process_name,
      defaultCoeff: Number(parsed.default_coeff),
      description: parsed.description
    },
    update: {
      processName: parsed.process_name,
      defaultCoeff: Number(parsed.default_coeff),
      description: parsed.description
    }
  });
  await prisma.auditLog.create({
    data: {
      entity: "process_master",
      entityId: parsed.process_code,
      action: "upsert",
      user: role,
      diffJson: JSON.stringify(parsed)
    }
  });
  revalidatePath("/processes");
}

export default async function ProcessesPage() {
  const role = getRequestRole();
  const processes = await prisma.processMaster.findMany({ orderBy: { processCode: "asc" } });
  return (
    <div className="space-y-6">
      <Card title="工程マスタ登録" description="工程コード・名称・係数を管理します。">
        {canEdit(role) ? (
          <form
            className="grid gap-4 md:grid-cols-2"
            action={async (formData) => {
              "use server";
              await upsertProcess(formData);
              redirect("/processes");
            }}
          >
            <label className="flex flex-col gap-1 text-sm">
              工程コード
              <input name="process_code" required className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              工程名
              <input name="process_name" required className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              既定係数
              <input type="number" step="0.1" name="default_coeff" required className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              説明
              <textarea name="description" className="rounded border px-3 py-2" rows={2} />
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

      <Card title="工程一覧" description="03/06 シートのドロップダウン候補">
        <DataTable
          columns={[
            { key: "code", header: "コード", accessor: (item) => item.processCode },
            { key: "name", header: "名称", accessor: (item) => item.processName },
            { key: "coeff", header: "既定係数", accessor: (item) => item.defaultCoeff },
            { key: "desc", header: "説明", accessor: (item) => item.description ?? "" }
          ]}
          data={processes}
        />
      </Card>
    </div>
  );
}
