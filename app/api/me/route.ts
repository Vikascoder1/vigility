import { NextRequest, NextResponse } from "next/server";
import { verifyJwt } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const payload = verifyJwt(token);
    if (!payload) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, age: true, gender: true },
    });

    return NextResponse.json({ user: user ?? null });
  } catch (error) {
    console.error("Me error", error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}


