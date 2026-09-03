"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  getSalesChannel,
  platformLabels,
  type TradePlatform,
} from "../lib/trade-route";

export type LedgerSource = TradePlatform;
export type SalesChannel = TradePlatform;

export type LedgerDraft = {
  draftId: string;
  productName: string;
  source: LedgerSource;
  salesChannel?: SalesChannel;
  category?: string;
  purchasePrice: number;
  expectedSalePrice?: number;
  sellingFee?: number;
  shippingCost?: number;
  otherExpenses?: number;
  imageUrl?: string;
  itemUrl?: string;
};

export type LedgerStatus = "stock" | "sold";
export type InventoryStatus = "purchased" | "listed";

export type LedgerEntry = {
  id: string;
  productName: string;
  source: LedgerSource;
  salesChannel?: SalesChannel;
  category: string;
  status: LedgerStatus;
  purchaseDate: string;
  saleDate: string;
  purchasePrice: number;
  salePrice: number;
  sellingFee: number;
  shippingCost: number;
  otherExpenses: number;
  inventoryStatus?: InventoryStatus;
  imageUrl?: string;
  itemUrl?: string;
  createdAt: string;
};

type LedgerForm = Omit<
  LedgerEntry,
  | "id"
  | "createdAt"
  | "purchasePrice"
  | "salePrice"
  | "sellingFee"
  | "shippingCost"
  | "otherExpenses"
> & {
  purchasePrice: string;
  salePrice: string;
  sellingFee: string;
  shippingCost: string;
  otherExpenses: string;
};

type StoredLedger = {
  version: 1;
  entries: LedgerEntry[];
};

type RevenueLedgerProps = {
  draft: LedgerDraft | null;
  onDraftConsumed: () => void;
};

const STORAGE_KEY = "sedori-management-ledger-v1";

type RouteSelectorProps = {
  source: LedgerSource;
  salesChannel: SalesChannel;
  onSourceChange: (source: LedgerSource) => void;
  onSalesChannelChange: (salesChannel: SalesChannel) => void;
  onSwap: () => void;
};

function RouteSelector({
  source,
  salesChannel,
  onSourceChange,
  onSalesChannelChange,
  onSwap,
}: RouteSelectorProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_minmax(0,1fr)] items-end gap-2">
      <label className="min-w-0 text-xs font-bold text-gray-600 sm:text-sm">
        仕入れ先
        <select
          value={source}
          onChange={(event) => onSourceChange(event.target.value as LedgerSource)}
          className="mt-2 w-full rounded-xl border border-violet-200 bg-white px-2 py-3 font-bold text-gray-900 sm:px-4"
        >
          {Object.entries(platformLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={onSwap}
        aria-label="仕入れ先と販売先を入れ替える"
        className="mb-0 flex h-12 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-2xl text-white shadow-sm transition active:rotate-180"
      >
        🔄
      </button>

      <label className="min-w-0 text-xs font-bold text-gray-600 sm:text-sm">
        販売先
        <select
          value={salesChannel}
          onChange={(event) =>
            onSalesChannelChange(event.target.value as SalesChannel)
          }
          className="mt-2 w-full rounded-xl border border-fuchsia-200 bg-white px-2 py-3 font-bold text-gray-900 sm:px-4"
        >
          {Object.entries(platformLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

const categoryOptions = [
  "ゲーム",
  "家電",
  "ホビー",
  "ファッション",
  "時計",
  "本・メディア",
  "その他",
];

const formatYen = (value: number) => `${value.toLocaleString("ja-JP")}円`;

const getJapanDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const createEmptyForm = (): LedgerForm => {
  const today = getJapanDate();

  return {
    productName: "",
    source: "rakuten",
    salesChannel: "mercari",
    category: "その他",
    status: "sold",
    purchaseDate: today,
    saleDate: today,
    purchasePrice: "",
    salePrice: "",
    sellingFee: "",
    shippingCost: "750",
    otherExpenses: "0",
  };
};

const calculateProfit = (entry: LedgerEntry) =>
  entry.salePrice -
  entry.purchasePrice -
  entry.sellingFee -
  entry.shippingCost -
  entry.otherExpenses;

const getEntryMonth = (entry: LedgerEntry) =>
  (entry.status === "sold" ? entry.saleDate : entry.purchaseDate).slice(0, 7);

const getRecentMonths = (endingMonth: string) => {
  const [year, month] = endingMonth.split("-").map(Number);

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(year, month - 1 - (5 - index), 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}`;

    return {
      value,
      label: `${date.getMonth() + 1}月`,
    };
  });
};

const readStoredLedger = () => {
  if (typeof window === "undefined") {
    return { entries: [] as LedgerEntry[], error: "" };
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return { entries: [] as LedgerEntry[], error: "" };
    }

    const parsed = JSON.parse(saved) as StoredLedger;

    if (parsed.version === 1 && Array.isArray(parsed.entries)) {
      return { entries: parsed.entries, error: "" };
    }
  } catch {
    return {
      entries: [] as LedgerEntry[],
      error: "保存データを読み込めなかったため、新しい収支表を表示しています",
    };
  }

  return { entries: [] as LedgerEntry[], error: "" };
};

const createDraftForm = (draft: LedgerDraft): LedgerForm => {
  const today = getJapanDate();

  return {
    productName: draft.productName,
    source: draft.source,
    salesChannel: draft.salesChannel || "mercari",
    category: draft.category || "その他",
    status: "stock",
    purchaseDate: today,
    saleDate: today,
    purchasePrice: String(draft.purchasePrice || ""),
    salePrice: String(draft.expectedSalePrice || ""),
    sellingFee: String(draft.sellingFee || ""),
    shippingCost: String(draft.shippingCost ?? 750),
    otherExpenses: String(draft.otherExpenses || 0),
  };
};

export default function RevenueLedger({
  draft,
  onDraftConsumed,
}: RevenueLedgerProps) {
  const [initialLedger] = useState(readStoredLedger);
  const [entries, setEntries] = useState<LedgerEntry[]>(initialLedger.entries);
  const [form, setForm] = useState<LedgerForm>(() =>
    draft ? createDraftForm(draft) : createEmptyForm()
  );
  const [selectedMonth, setSelectedMonth] = useState(() =>
    getJapanDate().slice(0, 7)
  );
  const [routeFilterEnabled, setRouteFilterEnabled] = useState(false);
  const [routeSource, setRouteSource] = useState<LedgerSource>("ebay");
  const [routeSalesChannel, setRouteSalesChannel] =
    useState<SalesChannel>("mercari");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(Boolean(draft));
  const [feedback, setFeedback] = useState(
    draft
      ? "計算結果を引き継ぎました。内容を確認して登録してください"
      : initialLedger.error
  );

  useEffect(() => {
    const stored: StoredLedger = {
      version: 1,
      entries,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, [entries]);

  const routeEntries = useMemo(
    () =>
      routeFilterEnabled
        ? entries.filter(
            (entry) =>
              entry.source === routeSource &&
              getSalesChannel(entry) === routeSalesChannel
          )
        : entries,
    [entries, routeFilterEnabled, routeSalesChannel, routeSource]
  );

  const soldEntriesForMonth = useMemo(
    () =>
      routeEntries.filter(
        (entry) =>
          entry.status === "sold" && entry.saleDate.startsWith(selectedMonth)
      ),
    [routeEntries, selectedMonth]
  );

  const monthlySummary = useMemo(
    () =>
      soldEntriesForMonth.reduce(
        (summary, entry) => ({
          sales: summary.sales + entry.salePrice,
          purchases: summary.purchases + entry.purchasePrice,
          expenses:
            summary.expenses +
            entry.sellingFee +
            entry.shippingCost +
            entry.otherExpenses,
          profit: summary.profit + calculateProfit(entry),
        }),
        { sales: 0, purchases: 0, expenses: 0, profit: 0 }
      ),
    [soldEntriesForMonth]
  );

  const visibleEntries = useMemo(
    () =>
      routeEntries
        .filter((entry) => getEntryMonth(entry) === selectedMonth)
        .toSorted((a, b) => {
          const dateA = a.status === "sold" ? a.saleDate : a.purchaseDate;
          const dateB = b.status === "sold" ? b.saleDate : b.purchaseDate;
          return dateB.localeCompare(dateA);
        }),
    [routeEntries, selectedMonth]
  );

  const chartData = useMemo(() => {
    const months = getRecentMonths(selectedMonth);

    return months.map((month) => ({
      ...month,
      profit: routeEntries
        .filter(
          (entry) =>
            entry.status === "sold" && entry.saleDate.startsWith(month.value)
        )
        .reduce((total, entry) => total + calculateProfit(entry), 0),
    }));
  }, [routeEntries, selectedMonth]);

  const categoryData = useMemo(() => {
    const totals = new Map<string, number>();

    soldEntriesForMonth.forEach((entry) => {
      totals.set(
        entry.category,
        (totals.get(entry.category) || 0) + calculateProfit(entry)
      );
    });

    return Array.from(totals, ([category, profit]) => ({ category, profit }))
      .toSorted((a, b) => b.profit - a.profit)
      .slice(0, 5);
  }, [soldEntriesForMonth]);

  const maxChartProfit = Math.max(
    1,
    ...chartData.map((item) => Math.abs(item.profit))
  );
  const stockCount = routeEntries.filter((entry) => entry.status === "stock").length;

  const updateForm = <Key extends keyof LedgerForm>(
    key: Key,
    value: LedgerForm[Key]
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const swapFilterRoute = () => {
    setRouteSource(routeSalesChannel);
    setRouteSalesChannel(routeSource);
    setRouteFilterEnabled(true);
  };

  const swapFormRoute = () => {
    setForm((current) => ({
      ...current,
      source: current.salesChannel || "mercari",
      salesChannel: current.source,
    }));
  };

  const resetForm = () => {
    setForm(createEmptyForm());
    setEditingId(null);
    setShowForm(false);

    if (draft) {
      onDraftConsumed();
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const productName = form.productName.trim();
    const purchasePrice = Number(form.purchasePrice || 0);
    const salePrice = Number(form.salePrice || 0);

    if (!productName) {
      setFeedback("商品名を入力してください");
      return;
    }

    if (purchasePrice < 0 || (form.status === "sold" && salePrice <= 0)) {
      setFeedback("販売済みの商品は、仕入れ額と販売額を確認してください");
      return;
    }

    const existingEntry = entries.find((item) => item.id === editingId);
    const entry: LedgerEntry = {
      id:
        editingId ||
        globalThis.crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      productName,
      source: form.source,
      salesChannel: form.salesChannel || "mercari",
      category: form.category,
      status: form.status,
      purchaseDate: form.purchaseDate,
      saleDate: form.saleDate,
      purchasePrice,
      salePrice,
      sellingFee: Number(form.sellingFee || 0),
      shippingCost: Number(form.shippingCost || 0),
      otherExpenses: Number(form.otherExpenses || 0),
      inventoryStatus:
        form.status === "stock"
          ? existingEntry?.inventoryStatus || "purchased"
          : undefined,
      imageUrl: existingEntry?.imageUrl || draft?.imageUrl,
      itemUrl: existingEntry?.itemUrl || draft?.itemUrl,
      createdAt: existingEntry?.createdAt || new Date().toISOString(),
    };

    setEntries((current) =>
      editingId
        ? current.map((item) => (item.id === editingId ? entry : item))
        : [entry, ...current]
    );
    setSelectedMonth(getEntryMonth(entry));
    setFeedback(editingId ? "取引を更新しました" : "取引を登録しました");
    resetForm();
  };

  const startEditing = (entry: LedgerEntry) => {
    setEditingId(entry.id);
    setForm({
      productName: entry.productName,
      source: entry.source,
      salesChannel: getSalesChannel(entry),
      category: entry.category,
      status: entry.status,
      purchaseDate: entry.purchaseDate,
      saleDate: entry.saleDate,
      purchasePrice: String(entry.purchasePrice),
      salePrice: String(entry.salePrice || ""),
      sellingFee: String(entry.sellingFee || ""),
      shippingCost: String(entry.shippingCost || ""),
      otherExpenses: String(entry.otherExpenses || ""),
    });
    setShowForm(true);
    setFeedback("登録内容を編集中です");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteEntry = (entry: LedgerEntry) => {
    if (!window.confirm(`「${entry.productName}」を収支表から削除しますか？`)) {
      return;
    }

    setEntries((current) => current.filter((item) => item.id !== entry.id));
    setFeedback("取引を削除しました");
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-pink-500 p-5 text-white shadow-lg sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-white/80">今月の実績</p>
            <h2 className="mt-1 text-2xl font-black">📊 せどり収支表</h2>
          </div>
          <label className="text-sm font-bold">
            表示する月
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="mt-2 block w-full rounded-xl border border-white/30 bg-white px-4 py-3 font-bold text-violet-900 sm:w-auto"
            />
          </label>
        </div>

        <div className="mt-6 rounded-2xl bg-white/15 p-5 text-center backdrop-blur">
          <p className="text-sm font-bold text-white/80">純利益</p>
          <p
            className={`mt-1 text-4xl font-black sm:text-5xl ${
              monthlySummary.profit < 0 ? "text-yellow-200" : "text-white"
            }`}
          >
            {monthlySummary.profit >= 0 ? "+" : ""}
            {formatYen(monthlySummary.profit)}
          </p>
          <p className="mt-2 text-sm font-bold text-white/80">
            販売 {soldEntriesForMonth.length}件・在庫 {stockCount}件
          </p>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-black">🔄 販売ルート切り替え</h2>
            <p className="mt-1 text-xs text-gray-500">
              選んだルートだけの利益と取引を表示できます
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRouteFilterEnabled(false)}
            className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${
              routeFilterEnabled
                ? "bg-gray-100 text-gray-600"
                : "bg-violet-600 text-white"
            }`}
          >
            すべて
          </button>
        </div>

        <RouteSelector
          source={routeSource}
          salesChannel={routeSalesChannel}
          onSourceChange={(source) => {
            setRouteSource(source);
            setRouteFilterEnabled(true);
          }}
          onSalesChannelChange={(salesChannel) => {
            setRouteSalesChannel(salesChannel);
            setRouteFilterEnabled(true);
          }}
          onSwap={swapFilterRoute}
        />

        <p className="mt-3 rounded-xl bg-violet-50 px-3 py-2 text-center text-sm font-black text-violet-700">
          {routeFilterEnabled
            ? `${platformLabels[routeSource]} → ${platformLabels[routeSalesChannel]} を表示中`
            : "すべての販売ルートを表示中"}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
          <p className="text-xs font-bold text-blue-700">💎 売上</p>
          <p className="mt-2 text-xl font-black text-blue-900">
            {formatYen(monthlySummary.sales)}
          </p>
        </div>
        <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 shadow-sm">
          <p className="text-xs font-bold text-orange-700">📦 仕入れ</p>
          <p className="mt-2 text-xl font-black text-orange-900">
            {formatYen(monthlySummary.purchases)}
          </p>
        </div>
        <div className="rounded-2xl border border-pink-100 bg-pink-50 p-4 shadow-sm">
          <p className="text-xs font-bold text-pink-700">🧾 経費</p>
          <p className="mt-2 text-xl font-black text-pink-900">
            {formatYen(monthlySummary.expenses)}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs font-bold text-emerald-700">✨ 純利益</p>
          <p className="mt-2 text-xl font-black text-emerald-900">
            {formatYen(monthlySummary.profit)}
          </p>
        </div>
      </section>

      {feedback && (
        <p
          role="status"
          className="rounded-xl border border-violet-100 bg-violet-50 p-4 text-sm font-bold text-violet-800"
        >
          {feedback}
        </p>
      )}

      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">取引を登録</h2>
            <p className="mt-1 text-sm text-gray-500">
              計算結果から引き継ぐか、ここから直接入力できます
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (showForm) {
                resetForm();
              } else {
                if (routeFilterEnabled) {
                  setForm({
                    ...createEmptyForm(),
                    source: routeSource,
                    salesChannel: routeSalesChannel,
                  });
                }
                setShowForm(true);
                setFeedback("");
              }
            }}
            className="shrink-0 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white"
          >
            {showForm ? "閉じる" : "＋ 登録"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
              {(
                [
                  ["stock", "📦 在庫として登録"],
                  ["sold", "✅ 販売済み"],
                ] as const
              ).map(([status, label]) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => updateForm("status", status)}
                  className={`rounded-lg px-2 py-3 text-sm font-bold ${
                    form.status === status
                      ? "bg-white text-violet-700 shadow-sm"
                      : "text-gray-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div>
              <label htmlFor="ledger-product-name" className="mb-2 block font-bold">
                商品名
              </label>
              <input
                id="ledger-product-name"
                value={form.productName}
                onChange={(event) => updateForm("productName", event.target.value)}
                placeholder="例：Nintendo Switch 有機EL"
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
                required
              />
            </div>

            <div className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-fuchsia-50 p-4">
              <p className="mb-3 font-black text-violet-900">販売ルート</p>
              <RouteSelector
                source={form.source}
                salesChannel={form.salesChannel || "mercari"}
                onSourceChange={(source) => updateForm("source", source)}
                onSalesChannelChange={(salesChannel) =>
                  updateForm("salesChannel", salesChannel)
                }
                onSwap={swapFormRoute}
              />
            </div>

            <div>
              <label htmlFor="ledger-category" className="mb-2 block font-bold">
                ジャンル
              </label>
              <select
                id="ledger-category"
                value={form.category}
                onChange={(event) => updateForm("category", event.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
              >
                {categoryOptions.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ledger-purchase-date" className="mb-2 block font-bold">
                  仕入れ日
                </label>
                <input
                  id="ledger-purchase-date"
                  type="date"
                  value={form.purchaseDate}
                  onChange={(event) => updateForm("purchaseDate", event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  required
                />
              </div>
              {form.status === "sold" && (
                <div>
                  <label htmlFor="ledger-sale-date" className="mb-2 block font-bold">
                    販売日
                  </label>
                  <input
                    id="ledger-sale-date"
                    type="date"
                    value={form.saleDate}
                    onChange={(event) => updateForm("saleDate", event.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3"
                    required
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="ledger-purchase-price" className="mb-2 block text-sm font-bold">
                  仕入れ額
                </label>
                <input
                  id="ledger-purchase-price"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={form.purchasePrice}
                  onChange={(event) => updateForm("purchasePrice", event.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                />
              </div>
              <div>
                <label htmlFor="ledger-sale-price" className="mb-2 block text-sm font-bold">
                  {form.status === "sold" ? "販売額" : "想定販売額"}
                </label>
                <input
                  id="ledger-sale-price"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={form.salePrice}
                  onChange={(event) => updateForm("salePrice", event.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="ledger-fee" className="mb-2 block text-xs font-bold sm:text-sm">
                  販売手数料
                </label>
                <input
                  id="ledger-fee"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={form.sellingFee}
                  onChange={(event) => updateForm("sellingFee", event.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-gray-300 px-3 py-3"
                />
              </div>
              <div>
                <label htmlFor="ledger-shipping" className="mb-2 block text-xs font-bold sm:text-sm">
                  送料
                </label>
                <input
                  id="ledger-shipping"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={form.shippingCost}
                  onChange={(event) => updateForm("shippingCost", event.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-gray-300 px-3 py-3"
                />
              </div>
              <div>
                <label htmlFor="ledger-other-expenses" className="mb-2 block text-xs font-bold sm:text-sm">
                  その他経費
                </label>
                <input
                  id="ledger-other-expenses"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={form.otherExpenses}
                  onChange={(event) => updateForm("otherExpenses", event.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-gray-300 px-3 py-3"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 py-4 text-lg font-black text-white shadow-sm"
            >
              {editingId ? "変更を保存" : "収支表に登録する"}
            </button>
          </form>
        )}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-black">📈 月別の純利益</h2>
          <div className="mt-6 flex h-48 items-end gap-2">
            {chartData.map((item) => {
              const height = Math.max(6, (Math.abs(item.profit) / maxChartProfit) * 100);

              return (
                <div key={item.value} className="flex min-w-0 flex-1 flex-col items-center justify-end">
                  <span className="mb-2 text-[10px] font-bold text-gray-600 sm:text-xs">
                    {item.profit === 0
                      ? "0"
                      : `${item.profit > 0 ? "+" : ""}${Math.round(
                          item.profit / 1000
                        )}千`}
                  </span>
                  <div
                    className={`w-full max-w-10 rounded-t-lg ${
                      item.profit < 0
                        ? "bg-gradient-to-t from-red-500 to-orange-300"
                        : "bg-gradient-to-t from-violet-600 to-pink-400"
                    }`}
                    style={{ height: `${height}%` }}
                    title={`${item.value}: ${formatYen(item.profit)}`}
                  />
                  <span className="mt-2 text-xs font-bold text-gray-500">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-black">🎯 ジャンル別利益</h2>
          {categoryData.length > 0 ? (
            <div className="mt-5 space-y-3">
              {categoryData.map((item, index) => (
                <div
                  key={item.category}
                  className="flex items-center justify-between rounded-xl bg-gradient-to-r from-fuchsia-50 to-orange-50 p-4"
                >
                  <span className="font-bold">
                    {index + 1}. {item.category}
                  </span>
                  <span
                    className={`font-black ${
                      item.profit < 0 ? "text-red-600" : "text-emerald-600"
                    }`}
                  >
                    {formatYen(item.profit)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-xl bg-gray-50 p-6 text-center text-sm font-bold text-gray-500">
              販売済みの商品を登録すると、ジャンル別の利益が表示されます
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">取引一覧</h2>
            <p className="mt-1 text-sm text-gray-500">
              {selectedMonth.replace("-", "年")}月・{visibleEntries.length}件
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
            この端末に自動保存
          </span>
        </div>

        {visibleEntries.length > 0 ? (
          <div className="mt-5 space-y-3">
            {visibleEntries.map((entry) => {
              const profit = calculateProfit(entry);

              return (
                <article
                  key={entry.id}
                  className="rounded-2xl border border-gray-100 p-4 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2 text-xs font-bold">
                        <span
                          className={`rounded-full px-2 py-1 ${
                            entry.status === "sold"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {entry.status === "sold" ? "販売済み" : "在庫"}
                        </span>
                        <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                          {platformLabels[entry.source]} → {platformLabels[getSalesChannel(entry)]}
                        </span>
                        <span className="rounded-full bg-fuchsia-50 px-2 py-1 text-fuchsia-700">
                          {entry.category}
                        </span>
                      </div>
                      <h3 className="mt-3 font-black">{entry.productName}</h3>
                      <p className="mt-1 text-xs text-gray-500">
                        仕入れ {entry.purchaseDate}
                        {entry.status === "sold" ? ` ／ 販売 ${entry.saleDate}` : ""}
                      </p>
                    </div>
                    {entry.status === "sold" && (
                      <p
                        className={`shrink-0 text-lg font-black ${
                          profit < 0 ? "text-red-600" : "text-emerald-600"
                        }`}
                      >
                        {profit >= 0 ? "+" : ""}
                        {formatYen(profit)}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-orange-50 p-2">
                      <p className="text-gray-500">仕入れ</p>
                      <p className="mt-1 font-bold">{formatYen(entry.purchasePrice)}</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-2">
                      <p className="text-gray-500">
                        {entry.status === "sold" ? "売上" : "想定売価"}
                      </p>
                      <p className="mt-1 font-bold">{formatYen(entry.salePrice)}</p>
                    </div>
                    <div className="rounded-lg bg-pink-50 p-2">
                      <p className="text-gray-500">経費</p>
                      <p className="mt-1 font-bold">
                        {formatYen(
                          entry.sellingFee + entry.shippingCost + entry.otherExpenses
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEditing(entry)}
                      className="flex-1 rounded-lg bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700"
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteEntry(entry)}
                      className="rounded-lg bg-red-50 px-4 py-2 text-sm font-bold text-red-600"
                    >
                      削除
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl bg-gray-50 p-8 text-center">
            <p className="text-4xl">📝</p>
            <p className="mt-3 font-bold text-gray-600">この月の取引はまだありません</p>
            <p className="mt-1 text-sm text-gray-500">
              「＋ 登録」から最初の商品を追加してみよう
            </p>
          </div>
        )}
      </section>

      <p className="rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-800">
        現在は、このスマホ・ブラウザ内にデータを保存します。別の端末との同期とバックアップは、今後クラウド保存を追加すると対応できます。
      </p>
    </div>
  );
}
