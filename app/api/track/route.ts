import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyJwt } from "@/lib/auth";

const trackSchema = z.object({
  featureName: z
    .string()
    .min(1)
    .max(100),
});

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    const payload = token ? verifyJwt(token) : null;

    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const parsed = trackSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { featureName } = parsed.data;

    await prisma.featureClick.create({
      data: {
        featureName,
        userId: payload.userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Track error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


