import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, signJwt } from "@/lib/auth";

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
  age: z.number().int().min(13).max(120),
  gender: z.enum(["Male", "Female", "Other"]),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = registerSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.format() }, { status: 400 });
    }

    const { username, password, age, gender } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { username, passwordHash, age, gender },
      select: { id: true, username: true, age: true, gender: true },
    });

    const token = signJwt({ userId: user.id, username: user.username });

    const res = NextResponse.json({ user });
    res.cookies.set("auth_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return res;
  } catch (error) {
    console.error("Register error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


