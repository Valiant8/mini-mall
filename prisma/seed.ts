import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // 清理已有数据（按依赖顺序）
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.membershipTier.deleteMany();
  await prisma.user.deleteMany();

  // ============ 管理员 ============
  const adminPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.create({
    data: {
      email: "admin@minimall.com",
      name: "Admin",
      password: adminPassword,
      role: "admin",
    },
  });

  // ============ 心悦会员等级配置 ============
  await prisma.membershipTier.createMany({
    data: [
      { level: 1, name: "心悦1级", minSpent: 9000, discount: 0.95 },
      { level: 2, name: "心悦2级", minSpent: 12000, discount: 0.85 },
      { level: 3, name: "心悦3级", minSpent: 14000, discount: 0.65 },
    ],
  });

  // ============ 分类 ============
  const electronics = await prisma.category.create({
    data: { name: "电子产品", slug: "electronics" },
  });
  const clothing = await prisma.category.create({
    data: { name: "服装", slug: "clothing" },
  });
  const books = await prisma.category.create({
    data: { name: "图书", slug: "books" },
  });

  // ============ 商品 ============
  await prisma.product.createMany({
    data: [
      {
        name: "机械键盘",
        description: "Cherry MX 青轴，RGB 背光",
        price: 399,
        stock: 50,
        imageUrl: "/uploads/keyboard.jpg",
        categoryId: electronics.id,
      },
      {
        name: "无线鼠标",
        description: "人体工学设计，蓝牙 5.0",
        price: 149,
        stock: 100,
        imageUrl: "/uploads/mouse.jpg",
        categoryId: electronics.id,
      },
      {
        name: "纯棉 T 恤",
        description: "宽松版型，亲肤透气",
        price: 89,
        stock: 200,
        imageUrl: "/uploads/tshirt.jpg",
        categoryId: clothing.id,
      },
      {
        name: "牛仔裤",
        description: "直筒修身，弹力面料",
        price: 259,
        stock: 80,
        imageUrl: "/uploads/jeans.jpg",
        categoryId: clothing.id,
      },
      {
        name: "深入理解计算机系统",
        description: "CSAPP 中文版",
        price: 139,
        stock: 30,
        imageUrl: "/uploads/csapp.jpg",
        categoryId: books.id,
      },
      {
        name: "JavaScript 高级程序设计",
        description: "第4版，前端红宝书",
        price: 99,
        stock: 60,
        imageUrl: "/uploads/js-book.jpg",
        categoryId: books.id,
      },
    ],
  });

  console.log("✅ Seed data created successfully");
  console.log("   Admin: admin@minimall.com / admin123");
  console.log("   分类: 3 | 商品: 6 | 会员等级: 3");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });