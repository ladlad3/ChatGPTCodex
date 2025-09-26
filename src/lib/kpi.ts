import { prisma } from "@/lib/db";
import { startOfMonth, endOfMonth } from "date-fns";

export async function fetchDashboardKpi(year: number, month: number) {
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(start);

  const [monthlyPlan, miscTasks, settings] = await Promise.all([
    prisma.monthlyPlan.findMany({
      where: { date: { gte: start, lte: end } }
    }),
    prisma.miscTask.findMany({
      where: { date: { gte: start, lte: end } }
    }),
    prisma.setting.findMany()
  ]);

  const maxUtilSetting = settings.find((s) => s.key === "max_utilization_pct");
  const maxUtil = maxUtilSetting ? Number(maxUtilSetting.value) : 0.85;

  const totalAdjusted = monthlyPlan.reduce((sum, item) => sum + item.adjustedH, 0) +
    miscTasks.reduce((sum, item) => sum + item.adjustedH, 0);

  const perAssignee = new Map<string, number>();
  for (const item of monthlyPlan) {
    perAssignee.set(item.assignee, (perAssignee.get(item.assignee) ?? 0) + item.adjustedH);
  }
  for (const item of miscTasks) {
    perAssignee.set(item.assignee, (perAssignee.get(item.assignee) ?? 0) + item.adjustedH);
  }

  const resources = await prisma.resource.findMany();
  const utilization = resources.map((resource) => {
    const allocated = perAssignee.get(resource.assignee) ?? 0;
    const util = resource.availabilityH > 0 ? allocated / resource.availabilityH : 0;
    return { ...resource, allocated, util };
  });

  const averageUtil =
    utilization.length > 0
      ? utilization.reduce((sum, item) => sum + item.util, 0) / utilization.length
      : 0;
  const maxUtilization = Math.max(0, ...utilization.map((item) => item.util));
  const strainedMembers = utilization.filter((item) => item.util > maxUtil).length;

  return {
    totalAdjusted,
    averageUtil,
    maxUtilization,
    strainedMembers,
    utilization: utilization.sort((a, b) => b.util - a.util).slice(0, 5)
  };
}
