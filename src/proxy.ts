import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ============================================================
// 轻量 session 解析（Edge Runtime 兼容，不依赖 Prisma）
// ============================================================

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET 环境变量未设置");
  }
  return secret;
}

function sign(data: string): string {
  return createHmac("sha256", getSecret()).update(data).digest("hex");
}

interface SessionPayload {
  userId: string;
  role: string;
  exp: number;
}

function parseSessionToken(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  if (sign(encoded) !== signature) return null;
  try {
    const payload: SessionPayload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    );
    if (Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// ============================================================
// 路由保护
// ============================================================

// 需要登录才能访问的路由
const PROTECTED_ROUTES = ["/cart", "/orders", "/admin"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 检查是否匹配受保护路由
  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // 校验 session
  const token = request.cookies.get("session")?.value;
  const session = token ? parseSessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 后台路由额外校验管理员角色
  if (pathname.startsWith("/admin") && session.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
