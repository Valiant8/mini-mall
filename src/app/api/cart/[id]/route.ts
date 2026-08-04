import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  quantity: z.coerce.number().int().min(0).max(999),
});

// PUT /api/cart/[id] — 修改数量
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "参数无效", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { quantity } = parsed.data;

  // 校验购物车项归属
  const item = await prisma.cartItem.findUnique({
    where: { id },
    include: { product: { select: { stock: true, name: true } } },
  });

  if (!item || item.userId !== user.id) {
    return NextResponse.json({ error: "购物车项不存在" }, { status: 404 });
  }

  // 数量为 0 视为删除
  if (quantity === 0) {
    await prisma.cartItem.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  }

  // 库存校验
  if (quantity > item.product.stock) {
    return NextResponse.json(
      { error: `库存不足，${item.product.name} 仅剩 ${item.product.stock} 件` },
      { status: 409 }
    );
  }

  const updated = await prisma.cartItem.update({
    where: { id },
    data: { quantity },
  });

  return NextResponse.json({ item: updated });
}

// DELETE /api/cart/[id] — 删除购物车项
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;

  const item = await prisma.cartItem.findUnique({ where: { id } });

  if (!item || item.userId !== user.id) {
    return NextResponse.json({ error: "购物车项不存在" }, { status: 404 });
  }

  await prisma.cartItem.delete({ where: { id } });

  return NextResponse.json({ deleted: true });
}
