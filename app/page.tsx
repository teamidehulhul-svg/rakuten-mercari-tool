"use client";

import { useState } from "react";

type RakutenProduct = {
  itemName: string;
  itemPrice: number;
  itemUrl: string;
  shopName: string;
  itemCode: string;
  pointRate?: number;
  mediumImageUrls?: {
    imageUrl: string;
  }[];
};

type MercariPriceSet = {
  price1: string;
  price2: string;
  price3: string;
};

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [products, setProducts] = useState<RakutenProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [mercariKeywords, setMercariKeywords] = useState<
    Record<string, string>
  >({});

  const [mercariPrices, setMercariPrices] = useState<
    Record<string, MercariPriceSet>
  >({});

  const [minProfit, setMinProfit] = useState("1000");
  const [minProfitRate, setMinProfitRate] = useState("20");
  const [shippingCost, setShippingCost] = useState("750");

  // 自分で上乗せする楽天ポイント率
  const [extraPointRate, setExtraPointRate] = useState("0");

  const [sortByProfit, setSortByProfit] = useState(false);
  const [candidateOnly, setCandidateOnly] = useState(false);

  const searchProducts = async () => {
    if (!keyword.trim()) {
      setError("商品名を入力してください");
      return;
    }

    setLoading(true);
    setError("");
    setProducts([]);
    setCandidateOnly(false);
    setSortByProfit(false);

    try {
      const response = await fetch(
        `/api/search?keyword=${encodeURIComponent(keyword)}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "楽天の商品検索に失敗しました"
        );
      }

      const items: RakutenProduct[] = (data.items || []).map(
        (entry: { Item?: RakutenProduct } | RakutenProduct) => {
          if ("Item" in entry && entry.Item) {
            return entry.Item;
          }

          return entry as RakutenProduct;
        }
      );

      setProducts(items);

      const keywordMap: Record<string, string> = {};

      items.forEach((product, index) => {
        const productKey =
          product.itemCode || String(index);

        const shortKeyword = product.itemName
          .replace(/【.*?】/g, "")
          .replace(/\[.*?\]/g, "")
          .replace(/（.*?）/g, "")
          .replace(/\(.*?\)/g, "")
          .replace(/送料無料/g, "")
          .replace(/ポイント.*?倍/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 60);

        keywordMap[productKey] = shortKeyword;
      });

      setMercariKeywords(keywordMap);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "検索中にエラーが発生しました"
      );
    } finally {
      setLoading(false);
    }
  };

  const updateMercariPrice = (
    productKey: string,
    field: keyof MercariPriceSet,
    value: string
  ) => {
    setMercariPrices((prev) => ({
      ...prev,
      [productKey]: {
        price1: prev[productKey]?.price1 || "",
        price2: prev[productKey]?.price2 || "",
        price3: prev[productKey]?.price3 || "",
        [field]: value,
      },
    }));
  };

  const calculateProduct = (
    product: RakutenProduct,
    index: number
  ) => {
    const productKey =
      product.itemCode || String(index);

    const rakutenPrice = Number(product.itemPrice);

    const basePointRate =
      Number(product.pointRate) > 0
        ? Number(product.pointRate)
        : 1;

    const extraRate =
      Number(extraPointRate) || 0;

    const totalPointRate =
      basePointRate + extraRate;

    const pointValue = Math.floor(
      rakutenPrice * (totalPointRate / 100)
    );

    const effectiveRakutenPrice =
      rakutenPrice - pointValue;

    const priceSet =
      mercariPrices[productKey] || {
        price1: "",
        price2: "",
        price3: "",
      };

    const enteredPrices = [
      Number(priceSet.price1),
      Number(priceSet.price2),
      Number(priceSet.price3),
    ].filter((price) => price > 0);

    const averageMercariPrice =
      enteredPrices.length > 0
        ? Math.floor(
            enteredPrices.reduce(
              (sum, price) => sum + price,
              0
            ) / enteredPrices.length
          )
        : 0;

    const mercariFee = Math.floor(
      averageMercariPrice * 0.1
    );

    const shipping = Number(shippingCost) || 0;

    const profit =
      averageMercariPrice -
      mercariFee -
      shipping -
      effectiveRakutenPrice;

    const profitRate =
      effectiveRakutenPrice > 0
        ? (profit / effectiveRakutenPrice) * 100
        : 0;

    const requiredProfit =
      Number(minProfit) || 0;

    const requiredRate =
      Number(minProfitRate) || 0;

    const isGoodCandidate =
      averageMercariPrice > 0 &&
      profit >= requiredProfit &&
      profitRate >= requiredRate;

    const isLoss =
      averageMercariPrice > 0 &&
      profit < 0;

    return {
      productKey,
      rakutenPrice,
      basePointRate,
      extraRate,
      totalPointRate,
      pointValue,
      effectiveRakutenPrice,
      priceSet,
      averageMercariPrice,
      mercariFee,
      shipping,
      profit,
      profitRate,
      isGoodCandidate,
      isLoss,
    };
  };

  let displayedProducts = products.map(
    (product, index) => ({
      product,
      index,
      calculation: calculateProduct(
        product,
        index
      ),
    })
  );

  if (candidateOnly) {
    displayedProducts =
      displayedProducts.filter(
        (item) =>
          item.calculation.isGoodCandidate
      );
  }

  if (sortByProfit) {
    displayedProducts = [
      ...displayedProducts,
    ].sort(
      (a, b) =>
        b.calculation.profit -
        a.calculation.profit
    );
  }

  const candidateCount = products.filter(
    (product, index) =>
      calculateProduct(product, index)
        .isGoodCandidate
  ).length;

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto max-w-6xl">

        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            楽天 → メルカリ
          </h1>

          <p className="mt-2 text-gray-600">
            楽天仕入れとメルカリ相場を比較して利益商品を探します
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold">
            楽天の商品を探す
          </h2>

          <div className="flex flex-col gap-4 md:flex-row">
            <input
              type="text"
              value={keyword}
              onChange={(e) =>
                setKeyword(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  searchProducts();
                }
              }}
              placeholder="例：ワイヤレスイヤホン"
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3"
            />

            <button
              onClick={searchProducts}
              disabled={loading}
              className="rounded-lg bg-black px-8 py-3 font-bold text-white"
            >
              {loading
                ? "検索中..."
                : "楽天商品を検索"}
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold">
            利益判定の設定
          </h2>

          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-bold">
                最低利益（円）
              </label>

              <input
                type="number"
                value={minProfit}
                onChange={(e) =>
                  setMinProfit(e.target.value)
                }
                className="w-full rounded-lg border px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                最低利益率（%）
              </label>

              <input
                type="number"
                value={minProfitRate}
                onChange={(e) =>
                  setMinProfitRate(e.target.value)
                }
                className="w-full rounded-lg border px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                メルカリ送料（円）
              </label>

              <input
                type="number"
                value={shippingCost}
                onChange={(e) =>
                  setShippingCost(e.target.value)
                }
                className="w-full rounded-lg border px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                追加楽天ポイント（%）
              </label>

              <input
                type="number"
                value={extraPointRate}
                onChange={(e) =>
                  setExtraPointRate(e.target.value)
                }
                placeholder="例：5"
                className="w-full rounded-lg border px-4 py-3"
              />

              <p className="mt-1 text-xs text-gray-500">
                SPUやキャンペーン分を追加
              </p>
            </div>
          </div>
        </div>

        {products.length > 0 && (
          <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap gap-3">

              <button
                onClick={() =>
                  setSortByProfit(
                    (prev) => !prev
                  )
                }
                className="rounded-lg bg-gray-100 px-5 py-3 font-bold"
              >
                {sortByProfit
                  ? "✓ 利益が高い順"
                  : "利益が高い順にする"}
              </button>

              <button
                onClick={() =>
                  setCandidateOnly(
                    (prev) => !prev
                  )
                }
                className="rounded-lg bg-gray-100 px-5 py-3 font-bold"
              >
                {candidateOnly
                  ? "✓ 仕入れ候補だけ表示中"
                  : "仕入れ候補だけ表示"}
              </button>

              <div className="ml-auto rounded-lg bg-green-50 px-5 py-3 font-bold text-green-700">
                仕入れ候補：
                {candidateCount}件
              </div>

            </div>
          </div>
        )}

        <div className="mt-8">
          <h2 className="mb-4 text-xl font-bold">
            検索結果
          </h2>

          {error && (
            <div className="rounded-xl bg-red-50 p-5 text-red-600">
              {error}
            </div>
          )}

          {loading && (
            <div className="rounded-xl bg-white p-8 text-center">
              楽天市場を検索しています...
            </div>
          )}

          <div className="space-y-5">
            {displayedProducts.map(
              ({
                product,
                index,
                calculation,
              }) => {

                const imageUrl =
                  product.mediumImageUrls?.[0]
                    ?.imageUrl || "";

                const {
                  productKey,
                  rakutenPrice,
                  basePointRate,
                  extraRate,
                  totalPointRate,
                  pointValue,
                  effectiveRakutenPrice,
                  priceSet,
                  averageMercariPrice,
                  mercariFee,
                  shipping,
                  profit,
                  profitRate,
                  isGoodCandidate,
                  isLoss,
                } = calculation;

                const mercariKeyword =
                  mercariKeywords[productKey] ||
                  product.itemName;

                const mercariSearchUrl =
                  "https://jp.mercari.com/search?keyword=" +
                  encodeURIComponent(
                    mercariKeyword
                  );

                return (
                  <div
                    key={productKey}
                    className={`rounded-2xl bg-white p-6 shadow-sm ${
                      isGoodCandidate
                        ? "ring-2 ring-green-400"
                        : ""
                    }`}
                  >

                    {isGoodCandidate && (
                      <div className="mb-5 rounded-lg bg-green-100 p-3 text-center text-lg font-bold text-green-700">
                        ✅ 仕入れ候補
                      </div>
                    )}

                    <div className="grid gap-6 lg:grid-cols-[150px_1fr_350px]">

                      <div className="flex h-36 w-36 items-center justify-center rounded-xl bg-gray-50">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={product.itemName}
                            className="max-h-32 max-w-32 object-contain"
                          />
                        ) : (
                          <span>
                            画像なし
                          </span>
                        )}
                      </div>

                      <div>

                        <h3 className="font-bold">
                          {product.itemName}
                        </h3>

                        <p className="mt-2 text-sm text-gray-500">
                          {product.shopName}
                        </p>

                        <div className="mt-4 rounded-xl bg-red-50 p-4">

                          <p className="text-sm text-gray-600">
                            楽天販売価格
                          </p>

                          <p className="text-2xl font-bold text-red-600">
                            ¥
                            {rakutenPrice.toLocaleString()}
                          </p>

                          <div className="mt-3 space-y-1 text-sm">

                            <div className="flex justify-between">
                              <span>
                                商品ポイント
                              </span>
                              <span>
                                {basePointRate}%
                              </span>
                            </div>

                            <div className="flex justify-between">
                              <span>
                                追加ポイント
                              </span>
                              <span>
                                +{extraRate}%
                              </span>
                            </div>

                            <div className="flex justify-between font-bold">
                              <span>
                                合計ポイント率
                              </span>
                              <span>
                                {totalPointRate}%
                              </span>
                            </div>

                            <div className="flex justify-between font-bold text-orange-600">
                              <span>
                                獲得ポイント相当
                              </span>
                              <span>
                                +
                                {pointValue.toLocaleString()}
                                pt
                              </span>
                            </div>

                          </div>

                          <div className="mt-3 border-t pt-3">
                            <p className="text-sm font-bold">
                              実質仕入れ価格
                            </p>

                            <p className="text-xl font-bold">
                              ¥
                              {effectiveRakutenPrice.toLocaleString()}
                            </p>
                          </div>

                        </div>

                        <div className="mt-5">

                          <label className="text-sm font-bold">
                            メルカリ検索ワード
                          </label>

                          <input
                            type="text"
                            value={mercariKeyword}
                            onChange={(e) =>
                              setMercariKeywords(
                                (prev) => ({
                                  ...prev,
                                  [productKey]:
                                    e.target.value,
                                })
                              )
                            }
                            className="mt-2 w-full rounded-lg border px-4 py-3"
                          />

                        </div>

                        <div className="mt-4 flex gap-3">

                          <a
                            href={product.itemUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-red-50 px-4 py-2 font-bold text-red-600"
                          >
                            楽天を見る
                          </a>

                          <a
                            href={mercariSearchUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-blue-50 px-4 py-2 font-bold text-blue-600"
                          >
                            メルカリで検索
                          </a>

                        </div>

                      </div>

                      <div className="rounded-xl bg-gray-50 p-5">

                        <p className="font-bold">
                          メルカリ相場 3件
                        </p>

                        <div className="mt-3 space-y-3">

                          {(
                            [
                              "price1",
                              "price2",
                              "price3",
                            ] as const
                          ).map((field, i) => (
                            <input
                              key={field}
                              type="number"
                              value={priceSet[field]}
                              onChange={(e) =>
                                updateMercariPrice(
                                  productKey,
                                  field,
                                  e.target.value
                                )
                              }
                              placeholder={`売れた価格${
                                i + 1
                              }`}
                              className="w-full rounded-lg border bg-white px-4 py-3"
                            />
                          ))}

                        </div>

                        {averageMercariPrice > 0 && (
                          <div className="mt-5 space-y-2">

                            <div className="flex justify-between font-bold">
                              <span>
                                平均メルカリ相場
                              </span>
                              <span>
                                ¥
                                {averageMercariPrice.toLocaleString()}
                              </span>
                            </div>

                            <div className="flex justify-between text-sm">
                              <span>
                                手数料10%
                              </span>
                              <span>
                                -¥
                                {mercariFee.toLocaleString()}
                              </span>
                            </div>

                            <div className="flex justify-between text-sm">
                              <span>
                                送料
                              </span>
                              <span>
                                -¥
                                {shipping.toLocaleString()}
                              </span>
                            </div>

                            <div className="flex justify-between text-sm">
                              <span>
                                実質仕入れ
                              </span>
                              <span>
                                -¥
                                {effectiveRakutenPrice.toLocaleString()}
                              </span>
                            </div>

                            <div className="border-t pt-3">

                              <p className="text-sm font-bold">
                                想定利益
                              </p>

                              <p
                                className={`text-3xl font-bold ${
                                  profit >= 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                ¥
                                {profit.toLocaleString()}
                              </p>

                              <p
                                className={`font-bold ${
                                  profitRate >= 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                利益率{" "}
                                {profitRate.toFixed(1)}
                                %
                              </p>

                              {isGoodCandidate && (
                                <div className="mt-3 rounded-lg bg-green-100 p-3 text-center font-bold text-green-700">
                                  ✅ 仕入れ候補
                                </div>
                              )}

                              {isLoss && (
                                <div className="mt-3 rounded-lg bg-red-100 p-3 text-center font-bold text-red-700">
                                  ❌ 赤字・見送り
                                </div>
                              )}

                              {!isGoodCandidate &&
                                !isLoss && (
                                  <div className="mt-3 rounded-lg bg-yellow-100 p-3 text-center font-bold text-yellow-700">
                                    △ 利益が少ない
                                  </div>
                                )}

                            </div>

                          </div>
                        )}

                      </div>

                    </div>

                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>
    </main>
  );
}