import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/orders — 我的订单列表
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, imageUrl: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ orders });
}

// POST /api/orders — 从购物车创建订单
export async function POST(_request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  // 获取购物车内容
  const cartItems = await prisma.cartItem.findMany({
    where: { userId: user.id },
    include: { product: true },
  });

  if (cartItems.length === 0) {
    return NextResponse.json({ error: "购物车为空" }, { status: 400 });
  }

  // 校验库存
  const outOfStock: string[] = [];
  for (const item of cartItems) {
    if (item.quantity > item.product.stock) {
      outOfStock.push(
        `${item.product.name}（需要 ${item.quantity}，库存 ${item.product.stock}）`
      );
    }
  }

  if (outOfStock.length > 0) {
    return NextResponse.json(
      { error: `库存不足：${outOfStock.join("；")}` },
      { status: 409 }
    );
  }

  // 计算折扣前总价
  const originalTotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  // 查询会员折扣
  let discount = 0;
  if (user.membershipLevel > 0) {
    const tier = await prisma.membershipTier.findUnique({
      where: { level: user.membershipLevel },
      select: { discount: true },
    });
    if (tier) {
      discount = originalTotal * (1 - tier.discount);
    }
  }

  const total = originalTotal - discount;

  // 事务：创建订单 + 订单项 + 扣库存 + 清空购物车
  const order = await prisma.$transaction(async (tx) => {
    // 创建订单
    const newOrder = await tx.order.create({
      data: {
        userId: user.id,
        status: "pending",
        originalTotal,
        discount,
        total,
        items: {
          create: cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price, // 下单时的单价
          })),
        },
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, imageUrl: true } },
          },
        },
      },
    });

    // 扣减库存
    for (const item of cartItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    // 清空购物车
    await tx.cartItem.deleteMany({ where: { userId: user.id } });

    return newOrder;
  });

  return NextResponse.json({ order }, { status: 201 });
}
