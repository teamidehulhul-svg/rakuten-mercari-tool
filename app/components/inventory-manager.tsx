"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import type { LedgerSource } from "./revenue-ledger";

type InventoryStatus = "purchased" | "listed";
type LedgerStatus = "stock" | "sold";

type InventoryEntry = {
  id: string;
  productName: string;
  source: LedgerSource;
  category: string;
  status: LedgerStatus;
  inventoryStatus?: InventoryStatus;
  purchaseDate: string;
  saleDate: string;
  purchasePrice: number;
  salePrice: number;
  sellingFee: number;
  shippingCost: number;
  otherExpenses: number;
  imageUrl?: string;
  itemUrl?: string;
  createdAt: string;
};

type StoredLedger = {
  version: 1;
  entries: InventoryEntry[];
};

type InventoryFilter = "all" | InventoryStatus | "sold";

type SaleForm = {
  saleDate: string;
  salePrice: string;
  sellingFee: string;
  shippingCost: string;
  otherExpenses: string;
};

type InventoryManagerProps = {
  onAddPurchase: () => void;
  onOpenLedger: () => void;
};

const STORAGE_KEY = "sedori-management-ledger-v1";

const sourceLabels: Record<LedgerSource, string> = {
  rakuten: "楽天仕入れ",
  ebay: "eBay仕入れ",
  amazon: "Amazon仕入れ",
  other: "その他仕入れ",
};

const sourceStyles: Record<LedgerSource, string> = {
  rakuten: "border-red-200 bg-red-50 text-red-600",
  ebay: "border-blue-200 bg-blue-50 text-blue-600",
  amazon: "border-orange-200 bg-orange-50 text-orange-700",
  other: "border-gray-200 bg-gray-50 text-gray-600",
};

const getJapanDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const formatYen = (value: number) => `¥${value.toLocaleString("ja-JP")}`;

const calculateProfit = (entry: InventoryEntry) =>
  entry.salePrice -
  entry.purchasePrice -
  entry.sellingFee -
  entry.shippingCost -
  entry.otherExpenses;

const getInventoryStatus = (entry: InventoryEntry): InventoryFilter =>
  entry.status === "sold" ? "sold" : entry.inventoryStatus || "purchased";

const getInventoryDays = (purchaseDate: string) => {
  const purchased = new Date(`${purchaseDate}T00:00:00+09:00`).getTime();
  const today = new Date(`${getJapanDate()}T00:00:00+09:00`).getTime();

  if (!Number.isFinite(purchased)) return 0;

  return Math.max(0, Math.floor((today - purchased) / 86_400_000));
};

const canUseOptimizedImage = (url: string) => {
  try {
    const hostname = new URL(url).hostname;

    return [
      "m.media-amazon.com",
      "i.ebayimg.com",
      "thumbnail.image.rakuten.co.jp",
      "tshop.r10s.jp",
      "image.rakuten.co.jp",
    ].includes(hostname);
  } catch {
    return false;
  }
};

const readEntries = () => {
  if (typeof window === "undefined") {
    return { entries: [] as InventoryEntry[], error: "" };
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (!saved) return { entries: [] as InventoryEntry[], error: "" };

    const parsed = JSON.parse(saved) as StoredLedger;

    if (parsed.version === 1 && Array.isArray(parsed.entries)) {
      return { entries: parsed.entries, error: "" };
    }
  } catch {
    return {
      entries: [] as InventoryEntry[],
      error: "在庫データを読み込めませんでした",
    };
  }

  return { entries: [] as InventoryEntry[], error: "" };
};

export default function InventoryManager({
  onAddPurchase,
  onOpenLedger,
}: InventoryManagerProps) {
  const [initialData] = useState(readEntries);
  const [entries, setEntries] = useState(initialData.entries);
  const [filter, setFilter] = useState<InventoryFilter>("all");
  const [query, setQuery] = useState("");
  const [saleEntryId, setSaleEntryId] = useState<string | null>(null);
  const [saleForm, setSaleForm] = useState<SaleForm | null>(null);
  const [feedback, setFeedback] = useState(initialData.error);

  const counts = useMemo(
    () => ({
      all: entries.length,
      purchased: entries.filter(
        (entry) => getInventoryStatus(entry) === "purchased"
      ).length,
      listed: entries.filter(
        (entry) => getInventoryStatus(entry) === "listed"
      ).length,
      sold: entries.filter((entry) => entry.status === "sold").length,
    }),
    [entries]
  );

  const stockEntries = useMemo(
    () => entries.filter((entry) => entry.status === "stock"),
    [entries]
  );

  const summary = useMemo(
    () => ({
      value: stockEntries.reduce(
        (total, entry) => total + entry.purchasePrice,
        0
      ),
      expectedProfit: stockEntries.reduce(
        (total, entry) => total + calculateProfit(entry),
        0
      ),
    }),
    [stockEntries]
  );

  const visibleEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ja-JP");

    return entries
      .filter((entry) => filter === "all" || getInventoryStatus(entry) === filter)
      .filter(
        (entry) =>
          !normalizedQuery ||
          entry.productName.toLocaleLowerCase("ja-JP").includes(normalizedQuery)
      )
      .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [entries, filter, query]);

  const persistEntries = (nextEntries: InventoryEntry[]) => {
    const stored: StoredLedger = { version: 1, entries: nextEntries };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    setEntries(nextEntries);
  };

  const updateInventoryStatus = (
    entry: InventoryEntry,
    inventoryStatus: InventoryStatus
  ) => {
    const nextEntries = entries.map((item) =>
      item.id === entry.id ? { ...item, inventoryStatus } : item
    );

    persistEntries(nextEntries);
    setFeedback(
      inventoryStatus === "listed"
        ? `「${entry.productName}」を出品中にしました`
        : `「${entry.productName}」を仕入れ済みに戻しました`
    );
  };

  const openSaleForm = (entry: InventoryEntry) => {
    setSaleEntryId(entry.id);
    setSaleForm({
      saleDate: getJapanDate(),
      salePrice: String(entry.salePrice || ""),
      sellingFee: String(
        entry.sellingFee || Math.floor((entry.salePrice || 0) * 0.1) || ""
      ),
      shippingCost: String(entry.shippingCost || ""),
      otherExpenses: String(entry.otherExpenses || 0),
    });
    setFeedback("");
  };

  const closeSaleForm = () => {
    setSaleEntryId(null);
    setSaleForm(null);
  };

  const handleSaleSubmit = (
    event: FormEvent<HTMLFormElement>,
    entry: InventoryEntry
  ) => {
    event.preventDefault();

    if (!saleForm) return;

    const salePrice = Number(saleForm.salePrice || 0);

    if (salePrice <= 0) {
      setFeedback("販売価格を入力してください");
      return;
    }

    const soldEntry: InventoryEntry = {
      ...entry,
      status: "sold",
      inventoryStatus: undefined,
      saleDate: saleForm.saleDate,
      salePrice,
      sellingFee: Number(saleForm.sellingFee || 0),
      shippingCost: Number(saleForm.shippingCost || 0),
      otherExpenses: Number(saleForm.otherExpenses || 0),
    };
    const nextEntries = entries.map((item) =>
      item.id === entry.id ? soldEntry : item
    );

    persistEntries(nextEntries);
    closeSaleForm();
    setFeedback(
      `販売登録完了！ 純利益 ${formatYen(calculateProfit(soldEntry))}を収支表に反映しました`
    );
  };

  return (
    <div className="space-y-5 pb-24">
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 text-white shadow-sm sm:p-5">
          <p className="text-xs font-bold text-white/80 sm:text-sm">💴 在庫総額</p>
          <p className="mt-2 text-xl font-black sm:text-3xl">
            {formatYen(summary.value)}
          </p>
          <p className="mt-1 text-[10px] font-bold text-white/70 sm:text-xs">
            未販売 {stockEntries.length}件
          </p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 p-4 text-white shadow-sm sm:p-5">
          <p className="text-xs font-bold text-white/80 sm:text-sm">📈 見込み利益</p>
          <p className="mt-2 text-xl font-black sm:text-3xl">
            {summary.expectedProfit >= 0 ? "+" : ""}
            {formatYen(summary.expectedProfit)}
          </p>
          <p className="mt-1 text-[10px] font-bold text-white/70 sm:text-xs">
            想定売価から計算
          </p>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-3 shadow-sm sm:p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              ["all", "すべて", counts.all],
              ["purchased", "仕入れ済み", counts.purchased],
              ["listed", "出品中", counts.listed],
              ["sold", "売却済み", counts.sold],
            ] as const
          ).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-xl px-2 py-3 text-sm font-bold ${
                filter === value
                  ? "bg-violet-600 text-white shadow-sm"
                  : "bg-gray-50 text-gray-600"
              }`}
            >
              {label} <span className="ml-1">{count}</span>
            </button>
          ))}
        </div>

        <label className="mt-3 flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3">
          <span aria-hidden="true">🔍</span>
          <span className="sr-only">商品名で検索</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="商品名で検索"
            className="min-w-0 flex-1 outline-none"
          />
        </label>
      </section>

      {feedback && (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-800 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{feedback}</span>
          {feedback.includes("収支表に反映") && (
            <button
              type="button"
              onClick={onOpenLedger}
              className="rounded-lg bg-white px-4 py-2 text-violet-700 shadow-sm"
            >
              収支表を見る
            </button>
          )}
        </div>
      )}

      {visibleEntries.length > 0 ? (
        <section className="space-y-4">
          {visibleEntries.map((entry) => {
            const inventoryStatus = getInventoryStatus(entry);
            const profit = calculateProfit(entry);
            const inventoryDays = getInventoryDays(entry.purchaseDate);
            const saleFormOpen = saleEntryId === entry.id && saleForm;

            return (
              <article
                key={entry.id}
                className="overflow-hidden rounded-2xl bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex gap-4">
                  <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-50 to-blue-50 sm:h-32 sm:w-32">
                    {entry.imageUrl && canUseOptimizedImage(entry.imageUrl) ? (
                      <Image
                        src={entry.imageUrl}
                        alt={entry.productName}
                        fill
                        sizes="(max-width: 640px) 96px, 128px"
                        className="object-contain p-2"
                      />
                    ) : (
                      <span className="text-4xl" aria-hidden="true">
                        📦
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between">
                      <h2 className="line-clamp-2 font-black leading-snug">
                        {entry.productName}
                      </h2>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                          inventoryStatus === "sold"
                            ? "bg-gray-100 text-gray-600"
                            : inventoryStatus === "listed"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {inventoryStatus === "sold"
                          ? "売却済み"
                          : inventoryStatus === "listed"
                            ? "出品中"
                            : "仕入れ済み"}
                      </span>
                    </div>
                    <span
                      className={`mt-2 inline-block rounded-lg border px-2 py-1 text-xs font-bold ${sourceStyles[entry.source]}`}
                    >
                      {sourceLabels[entry.source]}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-gray-100 text-sm">
                  <div className="bg-white p-3">
                    <p className="text-xs text-gray-500">仕入れ</p>
                    <p className="mt-1 font-black">{formatYen(entry.purchasePrice)}</p>
                  </div>
                  <div className="bg-white p-3">
                    <p className="text-xs text-gray-500">
                      {entry.status === "sold" ? "販売価格" : "予定売価"}
                    </p>
                    <p className="mt-1 font-black">{formatYen(entry.salePrice)}</p>
                  </div>
                  <div className="bg-white p-3">
                    <p className="text-xs text-gray-500">
                      {entry.status === "sold" ? "純利益" : "見込み利益"}
                    </p>
                    <p
                      className={`mt-1 font-black ${
                        profit < 0 ? "text-red-600" : "text-emerald-600"
                      }`}
                    >
                      {profit >= 0 ? "+" : ""}
                      {formatYen(profit)}
                    </p>
                  </div>
                  <div className="bg-white p-3">
                    <p className="text-xs text-gray-500">在庫</p>
                    <p className="mt-1 font-black">{inventoryDays}日</p>
                  </div>
                </div>

                {entry.status === "stock" && !saleFormOpen && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateInventoryStatus(
                          entry,
                          inventoryStatus === "listed" ? "purchased" : "listed"
                        )
                      }
                      className="rounded-xl bg-orange-50 px-3 py-3 text-sm font-bold text-orange-700"
                    >
                      {inventoryStatus === "listed"
                        ? "仕入れ済みに戻す"
                        : "出品中にする"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openSaleForm(entry)}
                      className="rounded-xl bg-violet-600 px-3 py-3 text-sm font-bold text-white"
                    >
                      販売登録へ
                    </button>
                  </div>
                )}

                {saleFormOpen && (
                  <form
                    onSubmit={(event) => handleSaleSubmit(event, entry)}
                    className="mt-4 space-y-4 rounded-2xl border border-violet-100 bg-violet-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-black text-violet-900">✅ 販売内容を登録</h3>
                      <button
                        type="button"
                        onClick={closeSaleForm}
                        className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-gray-600"
                      >
                        閉じる
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor={`sale-date-${entry.id}`} className="mb-1 block text-xs font-bold">
                          販売日
                        </label>
                        <input
                          id={`sale-date-${entry.id}`}
                          type="date"
                          value={saleForm.saleDate}
                          onChange={(event) =>
                            setSaleForm((current) =>
                              current ? { ...current, saleDate: event.target.value } : current
                            )
                          }
                          className="w-full rounded-xl border border-violet-200 bg-white px-3 py-3"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor={`sale-price-${entry.id}`} className="mb-1 block text-xs font-bold">
                          販売価格
                        </label>
                        <input
                          id={`sale-price-${entry.id}`}
                          type="number"
                          min="1"
                          inputMode="numeric"
                          value={saleForm.salePrice}
                          onChange={(event) => {
                            const nextPrice = event.target.value;
                            setSaleForm((current) =>
                              current
                                ? {
                                    ...current,
                                    salePrice: nextPrice,
                                    sellingFee: String(
                                      Math.floor(Number(nextPrice || 0) * 0.1)
                                    ),
                                  }
                                : current
                            );
                          }}
                          className="w-full rounded-xl border border-violet-200 bg-white px-3 py-3"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          ["sellingFee", "手数料"],
                          ["shippingCost", "送料"],
                          ["otherExpenses", "その他"],
                        ] as const
                      ).map(([key, label]) => (
                        <div key={key}>
                          <label htmlFor={`${key}-${entry.id}`} className="mb-1 block text-xs font-bold">
                            {label}
                          </label>
                          <input
                            id={`${key}-${entry.id}`}
                            type="number"
                            min="0"
                            inputMode="numeric"
                            value={saleForm[key]}
                            onChange={(event) =>
                              setSaleForm((current) =>
                                current
                                  ? { ...current, [key]: event.target.value }
                                  : current
                              )
                            }
                            className="w-full rounded-xl border border-violet-200 bg-white px-2 py-3"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl bg-white p-4 text-center">
                      <p className="text-xs font-bold text-gray-500">登録後の純利益</p>
                      <p className="mt-1 text-2xl font-black text-emerald-600">
                        {Number(saleForm.salePrice || 0) -
                          entry.purchasePrice -
                          Number(saleForm.sellingFee || 0) -
                          Number(saleForm.shippingCost || 0) -
                          Number(saleForm.otherExpenses || 0) >=
                        0
                          ? "+"
                          : ""}
                        {formatYen(
                          Number(saleForm.salePrice || 0) -
                            entry.purchasePrice -
                            Number(saleForm.sellingFee || 0) -
                            Number(saleForm.shippingCost || 0) -
                            Number(saleForm.otherExpenses || 0)
                        )}
                      </p>
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-4 font-black text-white"
                    >
                      販売済みにして収支表へ反映
                    </button>
                  </form>
                )}

                {entry.itemUrl && (
                  <a
                    href={entry.itemUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 block text-center text-xs font-bold text-blue-600"
                  >
                    仕入れ元の商品ページを開く ↗
                  </a>
                )}
              </article>
            );
          })}
        </section>
      ) : (
        <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-5xl">📦</p>
          <h2 className="mt-4 text-lg font-black">在庫はまだありません</h2>
          <p className="mt-2 text-sm text-gray-500">
            利益計算や商品検索から仕入れ登録すると、ここに自動で追加されます
          </p>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-20 z-30 p-4 sm:static sm:p-0">
        <button
          type="button"
          onClick={onAddPurchase}
          className="mx-auto block w-full max-w-3xl rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 py-4 text-lg font-black text-white shadow-lg sm:shadow-sm"
        >
          ＋ 仕入れ商品を追加
        </button>
      </div>

      <p className="rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-800">
        現在は、このスマホ・ブラウザ内に自動保存します。機種変更に備えたクラウド保存とバックアップは次の段階で追加できます。
      </p>
    </div>
  );
}
