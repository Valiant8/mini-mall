"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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
  user: { name: string; email: string; membershipLevel: number };
}

const STATUS_MAP: Record<string, string> = {
  pending: "待付款",
  paid: "已支付",
  shipped: "已发货",
  completed: "已完成",
  cancelled: "已取消",
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");

  const loadOrder = useCallback(async () => {
    const res = await fetch(`/api/orders/${id}`);
    if (res.status === 401) {
      router.push("/auth/login?callbackUrl=/orders/" + id);
      return;
    }
    if (!res.ok) {
      router.push("/orders");
      return;
    }
    const data = await res.json();
    setOrder(data.order);
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handlePay = async () => {
    setActing(true);
    setError("");
    const res = await fetch(`/api/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pay" }),
    });
    const data = await res.json();
    if (res.ok) {
      setOrder(data.order);
      if (data.membershipUpgraded) {
        alert(`恭喜！您已升级为心悦 ${data.membershipUpgraded} 级会员！`);
      }
    } else {
      setError(data.error || "操作失败");
    }
    setActing(false);
  };

  const handleCancel = async () => {
    if (!confirm("确定取消该订单吗？")) return;
    setActing(true);
    setError("");
    const res = await fetch(`/api/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    const data = await res.json();
    if (res.ok) {
      setOrder(data.order);
    } else {
      setError(data.error || "操作失败");
    }
    setActing(false);
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-8"><p className="text-center py-20 text-gray-500">加载中...</p></div>;
  }

  if (!order) return null;

  const canCancel = !["completed", "cancelled"].includes(order.status);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Link href="/orders" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
          ← 返回订单列表
        </Link>
        <h1 className="text-2xl font-bold mb-8">订单详情</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        <div className="bg-white rounded-xl border overflow-hidden">
          {/* 订单头 */}
          <div className="p-6 border-b flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">订单号</p>
              <p className="font-mono text-sm">{order.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">下单时间</p>
              <p className="text-sm">{new Date(order.createdAt).toLocaleString("zh-CN")}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">当前状态</p>
              <span className="text-lg font-semibold text-blue-600">
                {STATUS_MAP[order.status] || order.status}
              </span>
            </div>
          </div>

          {/* 商品列表 */}
          <div className="p-6">
            <table className="w-full">
              <thead>
                <tr className="text-sm text-gray-500 border-b">
                  <th className="text-left pb-3 font-normal">商品</th>
                  <th className="text-right pb-3 font-normal w-20">单价</th>
                  <th className="text-right pb-3 font-normal w-16">数量</th>
                  <th className="text-right pb-3 font-normal w-24">小计</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                          {item.product.imageUrl ? (
                            <img src={item.product.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-gray-400">📦</span>
                          )}
                        </div>
                        <Link href={`/products/${item.product.id}`} className="text-sm font-medium hover:text-blue-600">
                          {item.product.name}
                        </Link>
                      </div>
                    </td>
                    <td className="py-4 text-right text-sm">¥{item.price.toFixed(2)}</td>
                    <td className="py-4 text-right text-sm">×{item.quantity}</td>
                    <td className="py-4 text-right text-sm font-medium">
                      ¥{(item.price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 费用明细 */}
          <div className="p-6 bg-gray-50 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">商品合计</span>
              <span>¥{order.originalTotal.toFixed(2)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-600">会员折扣</span>
                <span className="text-green-600">-¥{order.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>实付金额</span>
              <span className="text-red-600">¥{order.total.toFixed(2)}</span>
            </div>
          </div>

          {/* 操作按钮 */}
          {order.status === "pending" && (
            <div className="p-6 border-t flex gap-4">
              <button
                onClick={handlePay}
                disabled={acting}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {acting ? "处理中..." : "去支付"}
              </button>
              {canCancel && (
                <button
                  onClick={handleCancel}
                  disabled={acting}
                  className="px-6 py-3 border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  取消订单
                </button>
              )}
            </div>
          )}

          {canCancel && order.status !== "pending" && (
            <div className="p-6 border-t">
              <button
                onClick={handleCancel}
                disabled={acting}
                className="px-6 py-3 border border-red-300 text-red-600 rounded-xl hover:bg-red-50 transition-colors text-sm"
              >
                取消订单
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
