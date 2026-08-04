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

// POST /api/orders — 从购物车创建订单（全部在事务内完成，消除 TOCTOU）
export async function POST(_request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  // 查询会员折扣（事务外只读，幂等操作无竞争风险）
  let discountRate = 1;
  if (user.membershipLevel > 0) {
    const tier = await prisma.membershipTier.findUnique({
      where: { level: user.membershipLevel },
      select: { discount: true },
    });
    if (tier) discountRate = tier.discount;
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      // 1. 在事务内读取购物车（确保一致性读）
      const cartItems = await tx.cartItem.findMany({
        where: { userId: user.id },
        include: { product: true },
      });

      if (cartItems.length === 0) {
        throw new Error("购物车为空");
      }

      // 2. 原子扣减库存并校验（库存不足时 updateMany.count === 0）
      const outOfStock: string[] = [];
      for (const item of cartItems) {
        const result = await tx.product.updateMany({
          where: {
            id: item.productId,
            stock: { gte: item.quantity },
          },
          data: { stock: { decrement: item.quantity } },
        });

        if (result.count === 0) {
          outOfStock.push(
            `${item.product.name}（需要 ${item.quantity}，库存不足）`
          );
        }
      }

      if (outOfStock.length > 0) {
        throw new Error(`库存不足：${outOfStock.join("；")}`);
      }

      // 3. 计算金额
      const originalTotal = cartItems.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );
      const discount = originalTotal * (1 - discountRate);
      const total = originalTotal - discount;

      // 4. 创建订单 + 订单项
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
              price: item.product.price,
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

      // 5. 清空购物车
      await tx.cartItem.deleteMany({ where: { userId: user.id } });

      return newOrder;
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "下单失败";
    const isUserError = message.startsWith("购物车为空") || message.startsWith("库存不足");
    return NextResponse.json(
      { error: message },
      { status: isUserError ? 400 : 409 }
    );
  }
}
