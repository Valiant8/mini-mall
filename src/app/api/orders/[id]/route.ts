import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/orders/[id] — 订单详情
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, imageUrl: true, price: true },
          },
        },
      },
      user: { select: { name: true, email: true, membershipLevel: true } },
    },
  });

  if (!order || order.userId !== user.id) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  return NextResponse.json({ order });
}

// PUT /api/orders/[id] — 模拟支付（PENDING → PAID）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const action: string | undefined = body.action;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { user: { select: { id: true, totalSpent: true, membershipLevel: true } } },
  });

  if (!order || order.userId !== user.id) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  // 取消订单：事务中原子完成状态校验+更新+库存回滚
  if (action === "cancel") {
    const result = await prisma.$transaction(async (tx) => {
      // 原子条件更新：仅当状态不是 completed/cancelled 时才更新
      const updated = await tx.order.updateMany({
        where: {
          id,
          status: { notIn: ["completed", "cancelled"] },
        },
        data: { status: "cancelled" },
      });

      if (updated.count === 0) {
        return null; // 已被并发操作处理
      }

      // 查询订单项用于库存回滚
      const withItems = await tx.order.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, imageUrl: true } },
            },
          },
        },
      });

      if (!withItems) return null;

      // 回滚库存
      for (const item of withItems.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      return withItems;
    });

    if (!result) {
      return NextResponse.json(
        { error: "该订单无法取消" },
        { status: 400 }
      );
    }

    return NextResponse.json({ order: result });
  }

  // 模拟支付：事务内原子完成状态更新 + 累计消费 + 会员升级
  const result = await prisma.$transaction(async (tx) => {
    // 原子条件更新：仅当状态为 pending 时才更新为 paid
    const paid = await tx.order.updateMany({
      where: { id, status: "pending" },
      data: { status: "paid" },
    });

    if (paid.count === 0) {
      return null; // 已被并发操作处理或状态已变更
    }

    // 查询更新后的订单
    const updated = await tx.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, imageUrl: true } },
          },
        },
      },
    });

    if (!updated) return null;

    // 原子累加累计消费（避免读-改-写丢失更新）
    await tx.user.update({
      where: { id: user.id },
      data: { totalSpent: { increment: order.total } },
    });

    // 重新读取用户的累计消费，检查会员升级
    const userAfter = await tx.user.findUnique({
      where: { id: user.id },
      select: { totalSpent: true, membershipLevel: true },
    });

    if (!userAfter) return null;

    const tiers = await tx.membershipTier.findMany({
      orderBy: { level: "desc" },
    });

    let newLevel = userAfter.membershipLevel;
    for (const tier of tiers) {
      if (userAfter.totalSpent >= tier.minSpent && tier.level > newLevel) {
        newLevel = tier.level;
        break;
      }
    }

    if (newLevel !== userAfter.membershipLevel) {
      await tx.user.update({
        where: { id: user.id },
        data: { membershipLevel: newLevel },
      });
    }

    return {
      order: updated,
      membershipUpgraded: newLevel > (order.user.membershipLevel ?? 0) ? newLevel : null,
    };
  });

  if (!result) {
    return NextResponse.json(
      { error: "支付失败，订单状态已变更" },
      { status: 409 }
    );
  }

  return NextResponse.json(result);
}
