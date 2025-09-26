import { prisma } from "../src/lib/db";

async function main() {
  await prisma.setting.upsert({
    where: { key: "max_utilization_pct" },
    update: { value: "0.85", description: "稼働率アラートの閾値" },
    create: { key: "max_utilization_pct", value: "0.85", description: "稼働率アラートの閾値" }
  });
  await prisma.setting.upsert({
    where: { key: "default_coeff" },
    update: { value: "1.0" },
    create: { key: "default_coeff", value: "1.0", description: "係数の既定値" }
  });
  await prisma.setting.upsert({
    where: { key: "current_year" },
    update: { value: String(new Date().getFullYear()) },
    create: { key: "current_year", value: String(new Date().getFullYear()), description: "ダッシュボードの対象年" }
  });
  await prisma.setting.upsert({
    where: { key: "current_month" },
    update: { value: String(new Date().getMonth() + 1) },
    create: { key: "current_month", value: String(new Date().getMonth() + 1), description: "ダッシュボードの対象月" }
  });
  await prisma.processMaster.upsert({
    where: { processCode: "PLAN" },
    create: {
      processCode: "PLAN",
      processName: "計画",
      defaultCoeff: 1,
      description: "計画作成"
    },
    update: {
      processName: "計画",
      defaultCoeff: 1,
      description: "計画作成"
    }
  });
  await prisma.processMaster.upsert({
    where: { processCode: "DEV" },
    create: {
      processCode: "DEV",
      processName: "開発",
      defaultCoeff: 1.1,
      description: "開発作業"
    },
    update: {
      processName: "開発",
      defaultCoeff: 1.1,
      description: "開発作業"
    }
  });
  await prisma.holiday.upsert({
    where: { date: new Date(`${new Date().getFullYear()}-01-01`) },
    create: { date: new Date(`${new Date().getFullYear()}-01-01`), name: "元日" },
    update: { name: "元日" }
  });
  await prisma.note.create({
    data: {
      date: new Date(),
      author: "system",
      note: "初期データ投入完了"
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
