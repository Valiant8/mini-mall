"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  productId: string;
  disabled: boolean;
}

export function AddToCartButton({ productId, disabled }: Props) {
  const [added, setAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 组件卸载时清理 timer，防止内存泄漏
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleClick = () => {
    // TODO: 实际加入购物车逻辑（下一阶段实现），productId 届时用于 API 调用
    void productId;
    setAdded(true);
    timerRef.current = setTimeout(() => setAdded(false), 2000);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`mt-4 w-full py-3 rounded-xl font-semibold text-lg transition-all ${
        disabled
          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
          : added
            ? "bg-green-600 text-white"
            : "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]"
      }`}
    >
      {disabled ? "暂时缺货" : added ? "✓ 已加入购物车" : "加入购物车"}
    </button>
  );
}
