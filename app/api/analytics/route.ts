import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DEFAULT_FILTERS } from "@/lib/filters";

const analyticsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  ageRange: z.enum(["<18", "18-40", ">40", "all"]).optional(), // accepted but not used in aggregation
  gender: z.enum(["Male", "Female", "Other", "all"]).optional(), // accepted but not used in aggregation
  featureName: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = analyticsSchema.parse({
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      ageRange: searchParams.get("ageRange") ?? undefined,
      gender: searchParams.get("gender") ?? undefined,
      featureName: searchParams.get("featureName") ?? undefined,
    });

    const startDateStr = parsed.startDate ?? DEFAULT_FILTERS.startDate;
    const endDateStr = parsed.endDate ?? DEFAULT_FILTERS.endDate;

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

    const whereBase = {
      timestamp: {
        gte: startDate,
        lte: new Date(endDate.getTime() + 24 * 60 * 60 * 1000),
      },
    };

    const FEATURE_ORDER = ["date_picker", "filter_age", "chart_bar", "filter_gender"] as const;

    // Bar chart: total clicks per feature
    const barResults = await prisma.featureClick.groupBy({
      by: ["featureName"],
      where: whereBase,
      _count: { _all: true },
      orderBy: {
        featureName: "asc",
      },
    });

    const bars = FEATURE_ORDER.map((name) => {
      const match = barResults.find((b) => b.featureName === name);
      return {
        featureName: name,
        totalClicks: match?._count._all ?? 0,
      };
    });

    const selectedFeature =
      parsed.featureName && FEATURE_ORDER.includes(parsed.featureName as any)
        ? parsed.featureName
        : FEATURE_ORDER[0];

    let line: { date: string; count: number }[] = [];

    if (selectedFeature) {
      const lineWhere = {
        ...whereBase,
        featureName: selectedFeature,
      };

      const clicks = await prisma.featureClick.findMany({
        where: lineWhere,
        orderBy: { timestamp: "asc" },
      });

      const bucket = new Map<string, number>();
      for (const c of clicks) {
        const key = c.timestamp.toISOString().slice(0, 10);
        bucket.set(key, (bucket.get(key) ?? 0) + 1);
      }

      line = Array.from(bucket.entries())
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([date, count]) => ({ date, count }));
    }

    return NextResponse.json({
      bars,
      line,
      selectedFeature,
    });
  } catch (error) {
    console.error("Analytics error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


