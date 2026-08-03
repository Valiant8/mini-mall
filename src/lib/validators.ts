import { z } from "zod";
import { MAX_SEARCH_LENGTH } from "./constants";

// ============================================================
// 商品搜索
// ============================================================

/** 商品搜索参数校验 */
export const productSearchSchema = z.object({
  search: z.string().max(MAX_SEARCH_LENGTH).optional().default(""),
  category: z.string().max(50).optional().default(""),
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
});

// ============================================================
// 认证
// ============================================================

/** 注册表单校验 */
export const registerSchema = z.object({
  name: z.string().min(1, "请输入用户名").max(50),
  email: z.string().email("邮箱格式不正确").max(100),
  password: z.string().min(6, "密码至少6位").max(100),
});

/** 登录表单校验 */
export const loginSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(1, "请输入密码"),
});
