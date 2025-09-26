import { NextRequest, NextResponse } from "next/server";
import { fetchDashboardKpi } from "@/lib/kpi";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());
  const month = Number(searchParams.get("month") ?? new Date().getMonth() + 1);
  const kpi = await fetchDashboardKpi(year, month);
  return NextResponse.json(kpi);
}
