"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: { id: string; name: string; imageUrl: string | null };
}

interface Order {
  id: string;
  status: string;
  originalTotal: number;
  discount: number;
  total: number;
  createdAt: string;
  items: OrderItem[];
}

// 订单状态中文映射
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:   { label: "待付款", color: "bg-yellow-100 text-yellow-800" },
  paid:      { label: "已支付", color: "bg-blue-100 text-blue-800" },
  shipped:   { label: "已发货", color: "bg-purple-100 text-purple-800" },
  completed: { label: "已完成", color: "bg-green-100 text-green-800" },
  cancelled: { label: "已取消", color: "bg-gray-100 text-gray-500" },
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      if (res.status === 401) {
        router.push("/auth/login?callbackUrl=/orders");
        return;
      }
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      setOrders(data.orders);
    } catch {
      setError("加载订单列表失败");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

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
        <h1 className="text-2xl font-bold mb-8">我的订单</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
            <button onClick={() => { setError(""); loadOrders(); }} className="ml-2 underline hover:no-underline">重试</button>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border">
            <p className="text-5xl mb-4">📋</p>
            <p className="text-gray-500 text-lg mb-4">暂无订单</p>
            <Link href="/" className="text-blue-600 hover:underline font-medium">
              去逛逛
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map((order) => {
              const status = STATUS_MAP[order.status] || { label: order.status, color: "bg-gray-100" };
              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block bg-white rounded-xl border p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-500">
                      订单号：{order.id.slice(0, 8)}...
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    {order.items.slice(0, 4).map((item) => (
                      <div
                        key={item.id}
                        className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
                      >
                        {item.product.imageUrl ? (
                          <img src={item.product.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-gray-400 text-lg">📦</span>
                        )}
                      </div>
                    ))}
                    {order.items.length > 4 && (
                      <span className="text-sm text-gray-400">+{order.items.length - 4}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString("zh-CN")}
                    </span>
                    <div className="text-right">
                      {order.discount > 0 && (
                        <span className="text-gray-400 line-through mr-2 text-xs">
                          ¥{order.originalTotal.toFixed(2)}
                        </span>
                      )}
                      <span className="font-bold text-red-600">
                        ¥{order.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
