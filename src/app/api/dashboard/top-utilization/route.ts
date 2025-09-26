import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 10);
  const resources = await prisma.resource.findMany({
    orderBy: { utilization: "desc" },
    take: limit
  });
  return NextResponse.json(resources);
}
