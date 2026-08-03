import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { createHmac } from "crypto";

// ============================================================
// 密码工具
// ============================================================

/** 用 bcryptjs 哈希密码，saltRounds=10 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/** 验证密码是否匹配 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============================================================
// Session 工具（签名 Cookie）
// ============================================================

const COOKIE_NAME = "session";

/** 从环境变量读取密钥，未设置时抛出错误（不写回退值防止泄漏） */
function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET 环境变量未设置，请在 .env 中添加 AUTH_SECRET");
  }
  return secret;
}

interface SessionPayload {
  userId: string;
  role: string;
  exp: number; // Unix timestamp (秒)
}

/** 用 HMAC-SHA256 签名一段数据 */
function sign(data: string): string {
  return createHmac("sha256", getSecret()).update(data).digest("hex");
}

/** 创建 session 字符串 */
function createSessionToken(userId: string, role: string): string {
  const payload: SessionPayload = {
    userId,
    role,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7天过期
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

/** 解析并验证 session token */
function parseSessionToken(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encoded, signature] = parts;
  // 防篡改：重新签名比对
  if (sign(encoded) !== signature) return null;

  try {
    const payload: SessionPayload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    );
    // 检查过期
    if (Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/** 把用户信息写入 httpOnly Cookie */
export async function setSession(
  userId: string,
  role: string
): Promise<void> {
  const token = createSessionToken(userId, role);
  const isProd = process.env.NODE_ENV === "production";
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7天
  });
}

/** 从 Cookie 读取当前 session 信息（不解密 token 时不查 DB） */
export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  return parseSessionToken(token);
}

/** 获取当前登录用户的完整信息 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      membershipLevel: true,
      totalSpent: true,
      createdAt: true,
    },
  });

  return user;
}

/** 清除 Cookie（退出登录） */
export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}
