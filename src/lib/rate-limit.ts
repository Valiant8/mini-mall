/**
 * 简易内存速率限制器
 * 基于邮箱/IP 计数，服务重启后清零
 */

interface RateEntry {
  count: number;
  resetAt: number; // Unix timestamp (ms)
}

const store = new Map<string, RateEntry>();

/** 清理过期条目，每 5 分钟执行一次 */
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

/**
 * 检查并递增计数
 * @param key 标识（如邮箱或 IP）
 * @param maxAttempts 最大尝试次数
 * @param windowMs 时间窗口（毫秒）
 * @returns { allowed: boolean, remaining: number }
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  cleanup();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // 首次访问或窗口已过期
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  entry.count++;
  if (entry.count > maxAttempts) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: maxAttempts - entry.count };
}
