import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "スケジュール管理ダッシュボード",
  description: "Excel 版を置き換える Next.js 製スケジュール管理アプリ"
};

const navItems = [
  { href: "/", label: "01 メインダッシュボード" },
  { href: "/projects", label: "02 プロジェクト一覧" },
  { href: "/monthly-plan", label: "03 月次スケジュール" },
  { href: "/resources", label: "04 担当者リソース" },
  { href: "/processes", label: "05 工程マスタ" },
  { href: "/misc-tasks", label: "06 その他作業" },
  { href: "/settings", label: "07 設定・メモ" }
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <div className="min-h-screen flex">
          <aside className="hidden md:flex w-64 flex-col gap-2 border-r border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-semibold">スケジュール管理</h1>
            <nav className="flex flex-col gap-2 text-sm font-medium">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-2 transition-colors hover:bg-brand hover:text-white"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="flex-1 p-4 md:p-8 space-y-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
