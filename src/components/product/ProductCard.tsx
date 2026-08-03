import Link from "next/link";

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  stock: number;
  category: { name: string; slug: string };
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="group block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
    >
      {/* 商品图片 */}
      <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <span className="text-gray-400 text-4xl">📦</span>
        )}
      </div>

      {/* 商品信息 */}
      <div className="p-4">
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
          {product.category.name}
        </span>
        <h3 className="mt-2 font-medium text-gray-900 line-clamp-1">
          {product.name}
        </h3>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-lg font-bold text-red-600">
            ¥{product.price.toFixed(2)}
          </span>
          <span className="text-xs text-gray-500">
            {product.stock > 0 ? `库存 ${product.stock}` : "暂时缺货"}
          </span>
        </div>
      </div>
    </Link>
  );
}