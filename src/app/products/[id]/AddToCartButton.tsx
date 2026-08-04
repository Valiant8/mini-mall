"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  productId: string;
  disabled: boolean;
}

export function AddToCartButton({ productId, disabled }: Props) {
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 组件卸载时清理 timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClick = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });

      if (res.status === 401) {
        router.push("/auth/login?callbackUrl=" + encodeURIComponent(window.location.pathname));
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "加入购物车失败");
        return;
      }

      setAdded(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setAdded(false), 2000);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={disabled || loading}
        className={`mt-4 w-full py-3 rounded-xl font-semibold text-lg transition-all ${
          disabled
            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
            : added
              ? "bg-green-600 text-white"
              : "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]"
        }`}
      >
        {loading ? "添加中..." : disabled ? "暂时缺货" : added ? "✓ 已加入购物车" : "加入购物车"}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}
