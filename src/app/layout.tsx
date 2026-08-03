import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mini Mall — 微型商城",
  description: "Next.js 16 全栈微型电商项目",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-gray-900">
        <Header />

        {/* 主内容 */}
        <main className="flex-1">{children}</main>

        {/* 底部 */}
        <footer className="border-t mt-auto">
          <div className="max-w-7xl mx-auto px-4 py-8 text-center text-sm text-gray-500">
            © 2026 Mini Mall. Built with Next.js 16.
          </div>
        </footer>
      </body>
    </html>
  );
}
