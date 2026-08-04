"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface CartProduct {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  stock: number;
  category: { name: string; slug: string };
}

interface CartItem {
  id: string;
  quantity: number;
  product: CartProduct;
}

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 加载购物车
  const loadCart = useCallback(async () => {
    try {
      const res = await fetch("/api/cart");
      if (res.status === 401) {
        router.push("/auth/login?callbackUrl=/cart");
        return;
      }
      const data = await res.json();
      setItems(data.items);
    } catch {
      setError("加载购物车失败");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  // 修改数量
  const updateQuantity = async (itemId: string, newQty: number) => {
    if (newQty < 0) return;

    const res = await fetch(`/api/cart/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: newQty }),
    });

    const data = await res.json();

    if (res.ok && data.deleted) {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      return;
    }

    if (!res.ok) {
      setError(data.error || "更新失败");
      return;
    }

    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity: newQty } : i))
    );
    setError("");
  };

  // 删除项
  const removeItem = async (itemId: string) => {
    const res = await fetch(`/api/cart/${itemId}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    }
  };

  // 计算总价
  const totalPrice = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-center text-gray-500 py-20">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-8">购物车</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
            <button
              onClick={() => setError("")}
              className="ml-2 underline hover:no-underline"
            >
              关闭
            </button>
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border">
            <p className="text-5xl mb-4">🛒</p>
            <p className="text-gray-500 text-lg mb-4">购物车是空的</p>
            <Link
              href="/"
              className="text-blue-600 hover:underline font-medium"
            >
              去逛逛
            </Link>
          </div>
        ) : (
          <>
            {/* 购物车列表 */}
            <div className="bg-white rounded-xl border overflow-hidden">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 border-b last:border-b-0"
                >
                  {/* 商品图片 */}
                  <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {item.product.imageUrl ? (
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-400 text-2xl">📦</span>
                    )}
                  </div>

                  {/* 商品信息 */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/products/${item.product.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600 line-clamp-1"
                    >
                      {item.product.name}
                    </Link>
                    <p className="text-sm text-gray-500 mt-1">
                      单价 ¥{item.product.price.toFixed(2)}
                    </p>
                  </div>

                  {/* 数量控制 */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateQuantity(item.id, item.quantity - 1)
                      }
                      className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-600"
                    >
                      −
                    </button>
                    <span className="w-10 text-center font-medium text-sm">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(item.id, item.quantity + 1)
                      }
                      disabled={item.quantity >= item.product.stock}
                      className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
                    >
                      +
                    </button>
                  </div>

                  {/* 小计 */}
                  <div className="w-24 text-right">
                    <span className="font-semibold text-red-600">
                      ¥{(item.product.price * item.quantity).toFixed(2)}
                    </span>
                  </div>

                  {/* 删除 */}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors text-sm"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>

            {/* 底部合计 */}
            <div className="mt-6 bg-white rounded-xl border p-6 flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-500">
                  共 {items.reduce((s, i) => s + i.quantity, 0)} 件商品
                </span>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-lg text-gray-700">
                  合计：
                  <span className="text-2xl font-bold text-red-600 ml-1">
                    ¥{totalPrice.toFixed(2)}
                  </span>
                </span>
                <button
                  onClick={async () => {
                    const res = await fetch("/api/orders", { method: "POST" });
                    const data = await res.json();
                    if (res.ok) {
                      router.push(`/orders/${data.order.id}`);
                    } else {
                      setError(data.error || "下单失败");
                    }
                  }}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  提交订单
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
