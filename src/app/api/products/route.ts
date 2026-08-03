import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { productSearchSchema } from "@/lib/validators";
import { PAGE_SIZE } from "@/lib/constants";

// GET /api/products?search=xxx&category=slug&page=1
// 注：此 API Route 为公开商品接口，与首页 Server Component 并行保留，各有用途
export async function GET(request: NextRequest) {
  const raw = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = productSearchSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "参数无效", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { search, category, page } = parsed.data;

  // 构建查询条件（使用 Prisma 类型确保编译期安全）
  const where: Prisma.ProductWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
    ];
  }
  if (category) {
    where.category = { slug: category };
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({
    products,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
  });
}
