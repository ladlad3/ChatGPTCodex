import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestRole, isAdmin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  key: z.string(),
  value: z.string(),
  description: z.string().optional()
});

export async function GET() {
  const settings = await prisma.setting.findMany();
  return NextResponse.json(settings);
}

export async function POST(request: NextRequest) {
  const role = getRequestRole();
  if (!isAdmin(role)) {
    return new NextResponse("管理者権限が必要です", { status: 403 });
  }
  const json = await request.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }
  const setting = await prisma.setting.upsert({
    where: { key: parsed.data.key },
    create: parsed.data,
    update: parsed.data
  });
  await prisma.auditLog.create({
    data: {
      entity: "setting",
      entityId: parsed.data.key,
      action: "upsert",
      user: role,
      diffJson: JSON.stringify(parsed.data)
    }
  });
  return NextResponse.json(setting);
}
