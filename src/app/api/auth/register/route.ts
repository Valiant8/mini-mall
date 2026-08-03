import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, setSession } from "@/lib/auth";
import { registerSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";

// POST /api/auth/register
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "输入无效", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, email, password } = parsed.data;

  // 注册速率限制：同一 IP 每小时最多 3 次
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const ipLimit = checkRateLimit(`register:ip:${ip}`, 3, 60 * 60 * 1000);

  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "注册次数过多，请 1 小时后再试" },
      { status: 429 }
    );
  }

  // 检查邮箱唯一性
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "该邮箱已被注册" }, { status: 409 });
  }

  // 创建用户
  const hashed = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, password: hashed },
    select: { id: true, name: true, email: true, role: true },
  });

  // 注册后自动登录
  await setSession(user.id, user.role);

  return NextResponse.json({ user }, { status: 201 });
}
