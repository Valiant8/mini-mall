import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "./AddToCartButton";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!product) {
    notFound();
  }

  const inStock = product.stock > 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* 面包屑导航 */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link href="/" className="hover:text-blue-600 transition-colors">
            首页
          </Link>
          <span>/</span>
          <Link
            href={`/?category=${product.category.slug}`}
            className="hover:text-blue-600 transition-colors"
          >
            {product.category.name}
          </Link>
          <span>/</span>
          <span className="text-gray-900">{product.name}</span>
        </nav>

        <div className="bg-white rounded-xl border p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 左侧：商品图片 */}
            <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-gray-400 text-7xl">📦</span>
              )}
            </div>

            {/* 右侧：商品信息 */}
            <div className="flex flex-col gap-4">
              <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full w-fit">
                {product.category.name}
              </span>

              <h1 className="text-2xl font-bold text-gray-900">
                {product.name}
              </h1>

              <p className="text-gray-600 leading-relaxed">
                {product.description || "暂无描述"}
              </p>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-red-600">
                  ¥{product.price.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <span
                  className={`px-3 py-1 rounded-full ${
                    inStock
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {inStock ? `库存 ${product.stock} 件` : "暂时缺货"}
                </span>
              </div>

              {/* 加入购物车按钮（Client Component） */}
              <AddToCartButton productId={product.id} disabled={!inStock} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}