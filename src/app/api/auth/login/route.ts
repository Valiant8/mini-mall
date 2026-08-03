import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";

// POST /api/auth/login
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "输入无效", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;

  // 基于邮箱的速率限制：同一邮箱 15 分钟内最多 5 次尝试
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const emailKey = `login:email:${email}`;
  const ipKey = `login:ip:${ip}`;

  const emailLimit = checkRateLimit(emailKey, 5, 15 * 60 * 1000);
  const ipLimit = checkRateLimit(ipKey, 20, 15 * 60 * 1000);

  if (!emailLimit.allowed || !ipLimit.allowed) {
    return NextResponse.json(
      { error: "尝试次数过多，请 15 分钟后再试" },
      { status: 429 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, password: true, name: true, role: true },
  });

  // 防止撞库：不暴露用户是否存在，统一返回相同错误
  if (!user || !(await verifyPassword(password, user.password))) {
    return NextResponse.json(
      { error: "邮箱或密码错误" },
      { status: 401 }
    );
  }

  await setSession(user.id, user.role);

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}
