import { fetchDashboardKpi } from "@/lib/kpi";
import { Card } from "@/components/card";
import { UtilizationBarChart } from "@/components/charts";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { MonthlyTrendChart } from "@/components/charts";

async function DashboardContent() {
  const settings = await prisma.setting.findMany();
  const currentYear = Number(settings.find((s) => s.key === "current_year")?.value) || new Date().getFullYear();
  const currentMonth = Number(settings.find((s) => s.key === "current_month")?.value) || new Date().getMonth() + 1;
  const kpi = await fetchDashboardKpi(currentYear, currentMonth);

  const monthlySummary = await prisma.monthlyPlan.groupBy({
    by: ["weekStart"],
    _sum: { adjustedH: true, plannedH: true },
    orderBy: { weekStart: "asc" }
  });

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card title="総工数 (月)">
          <p className="text-2xl font-semibold">{kpi.totalAdjusted.toFixed(1)} h</p>
        </Card>
        <Card title="平均稼働率">
          <p className="text-2xl font-semibold">{(kpi.averageUtil * 100).toFixed(1)}%</p>
        </Card>
        <Card title="最大稼働率">
          <p className="text-2xl font-semibold">{(kpi.maxUtilization * 100).toFixed(1)}%</p>
        </Card>
        <Card title="逼迫メンバー数" description="MAX_UTIL 超過">
          <p className="text-2xl font-semibold">{kpi.strainedMembers} 名</p>
        </Card>
      </div>

      <Card title="担当者稼働率 上位" description="直近月の稼働率トップ5">
        <div className="h-80">
          <UtilizationBarChart
            labels={kpi.utilization.map((item) => item.assignee)}
            values={kpi.utilization.map((item) => item.util)}
          />
        </div>
      </Card>

      <Card title="週次 推移" description="計画工数と調整後工数の推移">
        <div className="h-80">
          <MonthlyTrendChart
            labels={monthlySummary.map((item) => item.weekStart.toLocaleDateString("ja-JP"))}
            planned={monthlySummary.map((item) => item._sum.plannedH ?? 0)}
            actual={monthlySummary.map((item) => item._sum.adjustedH ?? 0)}
          />
        </div>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<p>ダッシュボードを読み込み中...</p>}>
      {/* @ts-expect-error Async Server Component */}
      <DashboardContent />
    </Suspense>
  );
}
