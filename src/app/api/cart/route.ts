import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

// 加入购物车校验 schema
const addToCartSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(999),
});

// GET /api/cart — 获取当前用户购物车
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const items = await prisma.cartItem.findMany({
    where: { userId: user.id },
    include: {
      product: {
        include: { category: true },
      },
    },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({ items });
}

// POST /api/cart — 加入购物车
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = addToCartSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "参数无效", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { productId, quantity } = parsed.data;

  // 校验商品存在
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, stock: true, name: true },
  });

  if (!product) {
    return NextResponse.json({ error: "商品不存在" }, { status: 404 });
  }

  // 检查已有购物车项
  const existing = await prisma.cartItem.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
  });

  const totalQty = (existing?.quantity || 0) + quantity;

  // 库存校验
  if (totalQty > product.stock) {
    return NextResponse.json(
      {
        error: `库存不足，${product.name} 仅剩 ${product.stock} 件`,
        available: product.stock,
        inCart: existing?.quantity || 0,
      },
      { status: 409 }
    );
  }

  // 更新或创建
  const item = await prisma.cartItem.upsert({
    where: { userId_productId: { userId: user.id, productId } },
    update: { quantity: totalQty },
    create: { userId: user.id, productId, quantity },
  });

  return NextResponse.json({ item }, { status: 200 });
}
