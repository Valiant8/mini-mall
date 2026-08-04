"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function Header() {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined = loading

  // 客户端挂载后获取用户信息
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.refresh();
  };

  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600">
          Mini Mall
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/" className="hover:text-blue-600 transition-colors">
            首页
          </Link>
          <Link href="/cart" className="hover:text-blue-600 transition-colors">
            购物车
          </Link>

          {user && (
            <Link href="/orders" className="hover:text-blue-600 transition-colors">
              我的订单
            </Link>
          )}

          {user === undefined ? (
            // 加载中
            <span className="text-gray-400">...</span>
          ) : user ? (
            // 已登录
            <div className="flex items-center gap-4">
              <span className="text-gray-700">
                {user.name}
                {user.role === "admin" && (
                  <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                    管理
                  </span>
                )}
              </span>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-red-600 transition-colors"
              >
                退出
              </button>
            </div>
          ) : (
            // 未登录
            <Link href="/auth/login" className="hover:text-blue-600 transition-colors">
              登录
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
