import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { SearchBar } from "@/components/product/SearchBar";
import { CategoryTabs } from "@/components/product/CategoryTabs";
import { ProductCard } from "@/components/product/ProductCard";
import { Pagination } from "@/components/product/Pagination";
import { productSearchSchema } from "@/lib/validators";
import { PAGE_SIZE } from "@/lib/constants";
import { Suspense } from "react";

interface Props {
  searchParams: Promise<{
    search?: string;
    category?: string;
    page?: string;
  }>;
}

export default async function HomePage({ searchParams }: Props) {
  const rawParams = await searchParams;
  const { search, category: categorySlug, page } = productSearchSchema.parse(rawParams);

  // 构建查询条件（使用 Prisma 类型确保编译期安全）
  const where: Prisma.ProductWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
    ];
  }
  if (categorySlug) {
    where.category = { slug: categorySlug };
  }

  // 并行查询：商品列表 + 总条数 + 分类列表
  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部区域 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Mini Mall</h1>

          {/* 搜索栏（Client Component，需要 Suspense） */}
          <Suspense fallback={<div className="h-10 bg-gray-100 rounded-lg animate-pulse" />}>
            <SearchBar />
          </Suspense>

          {/* 分类标签 */}
          <div className="mt-6">
            <CategoryTabs categories={categories} activeSlug={categorySlug} />
          </div>
        </div>
      </div>

      {/* 商品列表 */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {products.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-lg">没有找到相关商品</p>
            {search && <p className="mt-2 text-sm">搜索关键词：&ldquo;{search}&rdquo;</p>}
          </div>
        ) : (
          <>
            {/* 结果统计 */}
            <p className="text-sm text-gray-500 mb-4">
              共 {total} 件商品
              {search && <>，搜索 &ldquo;{search}&rdquo;</>}
              {categorySlug && <>，分类筛选</>}
            </p>

            {/* 商品网格 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* 分页 */}
            <Pagination
              page={page}
              totalPages={totalPages}
              searchParams={new URLSearchParams(
                Object.entries({ search, category: categorySlug }).filter(
                  ([, v]) => v
                ) as [string, string][]
              )}
            />
          </>
        )}
      </div>
    </div>
  );
}
