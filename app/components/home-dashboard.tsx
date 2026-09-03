"use client";

import { useState } from "react";
import type { LedgerEntry } from "./revenue-ledger";

type StoredLedger = {
  version: 1;
  entries: LedgerEntry[];
};

type HomeDashboardProps = {
  onResearch: () => void;
  onCalculator: () => void;
  onInventory: () => void;
  onLedger: () => void;
};

const STORAGE_KEY = "sedori-management-ledger-v1";

const getJapanMonth = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .slice(0, 7);

const calculateProfit = (entry: LedgerEntry) =>
  entry.salePrice -
  entry.purchasePrice -
  entry.sellingFee -
  entry.shippingCost -
  entry.otherExpenses;

const readSummary = () => {
  const emptySummary = { profit: 0, sales: 0, stockCount: 0 };

  if (typeof window === "undefined") return emptySummary;

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return emptySummary;

    const parsed = JSON.parse(saved) as StoredLedger;
    if (parsed.version !== 1 || !Array.isArray(parsed.entries)) {
      return emptySummary;
    }

    const currentMonth = getJapanMonth();
    const soldThisMonth = parsed.entries.filter(
      (entry) => entry.status === "sold" && entry.saleDate.startsWith(currentMonth)
    );

    return {
      profit: soldThisMonth.reduce(
        (total, entry) => total + calculateProfit(entry),
        0
      ),
      sales: soldThisMonth.reduce((total, entry) => total + entry.salePrice, 0),
      stockCount: parsed.entries.filter((entry) => entry.status === "stock").length,
    };
  } catch {
    return emptySummary;
  }
};

const formatYen = (value: number) => `¥${value.toLocaleString("ja-JP")}`;

export default function HomeDashboard({
  onResearch,
  onCalculator,
  onInventory,
  onLedger,
}: HomeDashboardProps) {
  const [summary] = useState(readSummary);

  const menuItems = [
    {
      label: "リサーチ",
      description: "楽天・eBay・Amazon",
      icon: "🔍",
      color: "from-blue-500 to-cyan-400",
      onClick: onResearch,
    },
    {
      label: "利益計算",
      description: "利益率とROIを確認",
      icon: "💰",
      color: "from-violet-500 to-fuchsia-500",
      onClick: onCalculator,
    },
    {
      label: "在庫管理",
      description: `${summary.stockCount}件の商品を管理`,
      icon: "📦",
      color: "from-emerald-500 to-green-400",
      onClick: onInventory,
    },
    {
      label: "収支表",
      description: "売上と純利益を集計",
      icon: "📊",
      color: "from-orange-500 to-amber-400",
      onClick: onLedger,
    },
  ];

  return (
    <div className="space-y-6">
      <header className="pt-2">
        <p className="text-sm font-bold text-violet-600">せどり管理アプリ</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
          今日も利益商品を探そう
        </h1>
      </header>

      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-pink-500 p-6 text-white shadow-lg shadow-violet-200 sm:p-8">
        <p className="text-sm font-bold text-white/80">今月の純利益</p>
        <p className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
          {summary.profit >= 0 ? "+" : ""}
          {formatYen(summary.profit)}
        </p>
        <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
          <span className="text-sm font-bold text-white/80">今月の売上</span>
          <span className="text-lg font-black">{formatYen(summary.sales)}</span>
        </div>
      </section>

      <section aria-label="メインメニュー" className="grid grid-cols-2 gap-3 sm:gap-4">
        {menuItems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className="group min-h-40 rounded-3xl bg-white p-4 text-left shadow-sm ring-1 ring-gray-100 transition active:scale-[0.98] sm:p-5"
          >
            <span
              aria-hidden="true"
              className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl text-white shadow-sm ${item.color}`}
            >
              {item.icon}
            </span>
            <span className="mt-4 block text-lg font-black text-gray-900">
              {item.label}
            </span>
            <span className="mt-1 block text-xs font-bold leading-5 text-gray-500 sm:text-sm">
              {item.description}
            </span>
          </button>
        ))}
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <div className="flex items-center justify-between gap-3">
          {[
            ["🔍", "検索"],
            ["🛒", "仕入れ"],
            ["📦", "在庫"],
            ["✅", "販売"],
            ["📊", "収支"],
          ].map(([icon, label], index, items) => (
            <div key={label} className="contents">
              <div className="min-w-0 text-center">
                <span className="text-xl" aria-hidden="true">{icon}</span>
                <p className="mt-1 text-[10px] font-bold text-gray-500 sm:text-xs">{label}</p>
              </div>
              {index < items.length - 1 && (
                <span className="text-sm font-black text-violet-300" aria-hidden="true">→</span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
