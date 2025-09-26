import { prisma } from "@/lib/db";
import { Card } from "@/components/card";
import { DataTable } from "@/components/data-table";
import { getRequestRole, canEdit, isAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const settingSchema = z.object({
  key: z.string(),
  value: z.string(),
  description: z.string().optional()
});

async function upsertSetting(formData: FormData) {
  const role = getRequestRole();
  if (!isAdmin(role)) {
    throw new Error("管理者のみ更新可能です");
  }
  const parsed = settingSchema.parse(Object.fromEntries(formData.entries()));
  await prisma.setting.upsert({
    where: { key: parsed.key },
    create: parsed,
    update: parsed
  });
  await prisma.auditLog.create({
    data: {
      entity: "setting",
      entityId: parsed.key,
      action: "upsert",
      user: role,
      diffJson: JSON.stringify(parsed)
    }
  });
  revalidatePath("/settings");
}

const holidaySchema = z.object({ date: z.string(), name: z.string() });

async function addHoliday(formData: FormData) {
  const role = getRequestRole();
  if (!canEdit(role)) {
    throw new Error("権限がありません");
  }
  const parsed = holidaySchema.parse(Object.fromEntries(formData.entries()));
  await prisma.holiday.upsert({
    where: { date: new Date(parsed.date) },
    create: { date: new Date(parsed.date), name: parsed.name },
    update: { name: parsed.name }
  });
  await prisma.auditLog.create({
    data: {
      entity: "holiday",
      entityId: parsed.date,
      action: "upsert",
      user: role,
      diffJson: JSON.stringify(parsed)
    }
  });
  revalidatePath("/settings");
}

const noteSchema = z.object({ date: z.string(), author: z.string(), note: z.string() });

async function addNote(formData: FormData) {
  const role = getRequestRole();
  if (!canEdit(role)) {
    throw new Error("権限がありません");
  }
  const parsed = noteSchema.parse(Object.fromEntries(formData.entries()));
  await prisma.note.create({
    data: {
      date: new Date(parsed.date),
      author: parsed.author,
      note: parsed.note
    }
  });
  await prisma.auditLog.create({
    data: {
      entity: "note",
      entityId: parsed.author,
      action: "create",
      user: role,
      diffJson: JSON.stringify(parsed)
    }
  });
  revalidatePath("/settings");
}

export default async function SettingsPage() {
  const role = getRequestRole();
  const [settings, holidays, notes, audits] = await Promise.all([
    prisma.setting.findMany({ orderBy: { key: "asc" } }),
    prisma.holiday.findMany({ orderBy: { date: "asc" } }),
    prisma.note.findMany({ orderBy: { date: "desc" } }),
    prisma.auditLog.findMany({ orderBy: { timestamp: "desc" }, take: 10 })
  ]);
  return (
    <div className="space-y-6">
      <Card title="アプリ設定" description="閾値や現在月などを管理します">
        {isAdmin(role) ? (
          <form
            className="grid gap-4 md:grid-cols-3"
            action={async (formData) => {
              "use server";
              await upsertSetting(formData);
              redirect("/settings");
            }}
          >
            <label className="flex flex-col gap-1 text-sm">
              設定キー
              <input name="key" required className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              設定値
              <input name="value" required className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm md:col-span-3">
              説明
              <textarea name="description" className="rounded border px-3 py-2" rows={2} />
            </label>
            <div className="md:col-span-3 flex justify-end">
              <button type="submit" className="rounded bg-brand px-4 py-2 text-white">
                保存
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-slate-600">設定の変更は管理者のみです。</p>
        )}
        <DataTable
          columns={[
            { key: "key", header: "キー", accessor: (item) => item.key },
            { key: "value", header: "値", accessor: (item) => item.value },
            { key: "desc", header: "説明", accessor: (item) => item.description ?? "" }
          ]}
          data={settings}
        />
      </Card>

      <Card title="休日設定" description="SMB共有の休日マスタ">
        {canEdit(role) ? (
          <form
            className="grid gap-4 md:grid-cols-3"
            action={async (formData) => {
              "use server";
              await addHoliday(formData);
              redirect("/settings");
            }}
          >
            <label className="flex flex-col gap-1 text-sm">
              日付
              <input type="date" name="date" required className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              名称
              <input name="name" required className="rounded border px-3 py-2" />
            </label>
            <div className="md:col-span-1 flex items-end">
              <button type="submit" className="rounded bg-brand px-4 py-2 text-white">
                追加
              </button>
            </div>
          </form>
        ) : null}
        <DataTable
          columns={[
            { key: "date", header: "日付", accessor: (item) => item.date.toLocaleDateString("ja-JP") },
            { key: "name", header: "名称", accessor: (item) => item.name }
          ]}
          data={holidays}
        />
      </Card>

      <Card title="運用メモ" description="各種メモと変更履歴">
        {canEdit(role) ? (
          <form
            className="grid gap-4 md:grid-cols-3"
            action={async (formData) => {
              "use server";
              await addNote(formData);
              redirect("/settings");
            }}
          >
            <label className="flex flex-col gap-1 text-sm">
              日付
              <input type="date" name="date" required className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              記入者
              <input name="author" required className="rounded border px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm md:col-span-3">
              メモ
              <textarea name="note" required className="rounded border px-3 py-2" rows={3} />
            </label>
            <div className="md:col-span-3 flex justify-end">
              <button type="submit" className="rounded bg-brand px-4 py-2 text-white">
                追加
              </button>
            </div>
          </form>
        ) : null}
        <DataTable
          columns={[
            { key: "date", header: "日付", accessor: (item) => item.date.toLocaleDateString("ja-JP") },
            { key: "author", header: "記入者", accessor: (item) => item.author },
            { key: "note", header: "内容", accessor: (item) => item.note }
          ]}
          data={notes}
        />
      </Card>

      <Card title="直近の監査ログ" description="主要テーブルの変更履歴">
        <DataTable
          columns={[
            { key: "timestamp", header: "日時", accessor: (item) => item.timestamp.toLocaleString("ja-JP") },
            { key: "user", header: "ユーザー", accessor: (item) => item.user },
            { key: "action", header: "操作", accessor: (item) => `${item.entity}:${item.action}` },
            { key: "diff", header: "差分", accessor: (item) => item.diffJson ?? "-" }
          ]}
          data={audits}
        />
      </Card>
    </div>
  );
}
