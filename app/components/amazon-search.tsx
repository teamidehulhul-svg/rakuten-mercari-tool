"use client";

import { useEffect, useMemo, useState } from "react";
import type { LedgerDraft } from "./revenue-ledger";

type AmazonSearchProps = {
  initialKeyword?: string;
  onInitialKeywordConsumed?: () => void;
  onRegister: (draft: Omit<LedgerDraft, "draftId">) => void;
};

const isAsin = (value: string) => /^[A-Z0-9]{10}$/i.test(value.trim());

const createAmazonUrl = (value: string) => {
  const query = value.trim();

  if (isAsin(query)) {
    return `https://www.amazon.co.jp/dp/${query.toUpperCase()}`;
  }

  return `https://www.amazon.co.jp/s?k=${encodeURIComponent(query)}`;
};

export default function AmazonSearch({
  initialKeyword = "",
  onInitialKeywordConsumed,
  onRegister,
}: AmazonSearchProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [productName, setProductName] = useState(initialKeyword);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [mercariPrice, setMercariPrice] = useState("");
  const [shippingCost, setShippingCost] = useState("750");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const nextKeyword = initialKeyword.trim();

    if (!nextKeyword) return;

    const timeoutId = window.setTimeout(() => {
      setKeyword(nextKeyword);
      setProductName(nextKeyword);
      setMessage("バーコードを入力しました。下のボタンからAmazonを検索できます");
      onInitialKeywordConsumed?.();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [initialKeyword, onInitialKeywordConsumed]);

  const amazonUrl = useMemo(
    () => (keyword.trim() ? createAmazonUrl(keyword) : ""),
    [keyword]
  );
  const mercariUrl = useMemo(
    () =>
      `https://jp.mercari.com/search?keyword=${encodeURIComponent(
        (productName || keyword).trim()
      )}`,
    [keyword, productName]
  );

  const purchase = Number(purchasePrice || 0);
  const sale = Number(mercariPrice || 0);
  const shipping = Number(shippingCost || 0);
  const mercariFee = Math.floor(sale * 0.1);
  const profit = sale - mercariFee - shipping - purchase;
  const profitRate = purchase > 0 ? (profit / purchase) * 100 : 0;
  const hasCalculation = purchase > 0 && sale > 0;

  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold">📦 Amazonの商品を探す</h2>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
              月額0円モード
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            商品名・JAN・ASINを入力して、Amazonの検索結果を開きます
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <input
            type="search"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setMessage("");
            }}
            placeholder="商品名・JAN・ASIN"
            className="min-h-12 flex-1 rounded-xl border border-gray-300 px-4 py-3"
          />
          {amazonUrl ? (
            <a
              href={amazonUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (!productName.trim()) setProductName(keyword.trim());
                setMessage("Amazonを開きました。価格を確認して下に入力してください");
              }}
              className="min-h-12 rounded-xl bg-orange-500 px-6 py-3 text-center font-bold text-white"
            >
              Amazonで検索
            </a>
          ) : (
            <button
              type="button"
              onClick={() => setMessage("商品名・JAN・ASINを入力してください")}
              className="min-h-12 rounded-xl bg-orange-500 px-6 py-3 font-bold text-white"
            >
              Amazonで検索
            </button>
          )}
        </div>

        {message && (
          <p
            role="status"
            className="mt-4 rounded-xl bg-orange-50 px-4 py-3 text-sm font-bold text-orange-800"
          >
            {message}
          </p>
        )}

        <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50 p-4 text-sm text-gray-700">
          <p className="font-bold text-orange-900">この検索は大口契約なしで使えます</p>
          <p className="mt-1">
            Amazonの商品一覧はAmazon側で表示します。検索回数の上限やアプリの月額料金はありません。
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="text-xl font-bold">💰 見つけた商品の利益を確認</h2>
          <p className="mt-2 text-sm text-gray-500">
            Amazonで確認した商品名と価格を入れると、メルカリ販売の利益を計算できます
          </p>
        </div>

        <div>
          <label htmlFor="amazon-product-name" className="mb-2 block text-sm font-bold">
            商品名
          </label>
          <input
            id="amazon-product-name"
            type="text"
            value={productName}
            onChange={(event) => setProductName(event.target.value)}
            placeholder="Amazonの商品名を入力"
            className="w-full rounded-xl border border-gray-300 px-4 py-3"
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="amazon-purchase-price" className="mb-2 block text-sm font-bold">
              Amazon価格（円）
            </label>
            <input
              id="amazon-purchase-price"
              type="number"
              min="0"
              inputMode="numeric"
              value={purchasePrice}
              onChange={(event) => setPurchasePrice(event.target.value)}
              placeholder="例：34800"
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </div>
          <div>
            <label htmlFor="amazon-mercari-price" className="mb-2 block text-sm font-bold">
              メルカリ想定売価（円）
            </label>
            <input
              id="amazon-mercari-price"
              type="number"
              min="0"
              inputMode="numeric"
              value={mercariPrice}
              onChange={(event) => setMercariPrice(event.target.value)}
              placeholder="例：44800"
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </div>
          <div>
            <label htmlFor="amazon-shipping-cost" className="mb-2 block text-sm font-bold">
              送料（円）
            </label>
            <input
              id="amazon-shipping-cost"
              type="number"
              min="0"
              inputMode="numeric"
              value={shippingCost}
              onChange={(event) => setShippingCost(event.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {amazonUrl ? (
            <a
              href={amazonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-orange-50 px-4 py-3 text-center font-bold text-orange-700"
            >
              Amazonを確認
            </a>
          ) : (
            <span className="rounded-xl bg-gray-100 px-4 py-3 text-center font-bold text-gray-400">
              Amazonを確認
            </span>
          )}
          <a
            href={mercariUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-blue-50 px-4 py-3 text-center font-bold text-blue-700"
          >
            メルカリで検索
          </a>
        </div>

        {hasCalculation && (
          <div className="mt-5 rounded-xl bg-emerald-50 p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-emerald-800">予想純利益</p>
                <p className="mt-1 text-3xl font-black text-emerald-700">
                  {profit >= 0 ? "+" : ""}¥{profit.toLocaleString()}
                </p>
              </div>
              <p className="text-lg font-bold text-emerald-700">
                {profitRate.toFixed(1)}%
              </p>
            </div>
            <p className="mt-3 text-xs text-gray-600">
              メルカリ手数料 {mercariFee.toLocaleString()}円・送料 {shipping.toLocaleString()}円で計算
            </p>
            <div
              className={`mt-3 rounded-lg p-3 text-center text-lg font-bold ${
                profitRate >= 20
                  ? "bg-green-100 text-green-700"
                  : profitRate >= 10
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
              }`}
            >
              {profitRate >= 20 ? "◎ 仕入れ候補" : profitRate >= 10 ? "○ 検討" : "❌ 見送り"}
            </div>

            <button
              type="button"
              onClick={() =>
                onRegister({
                  productName: productName.trim() || keyword.trim() || "Amazon商品",
                  source: "amazon",
                  purchasePrice: purchase,
                  expectedSalePrice: sale,
                  sellingFee: mercariFee,
                  shippingCost: shipping,
                  itemUrl: amazonUrl,
                })
              }
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 px-5 py-4 font-bold text-white"
            >
              📦 この商品を仕入れ登録へ
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
