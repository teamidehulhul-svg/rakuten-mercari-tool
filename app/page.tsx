"use client";

import { useState } from "react";

type Product = {
  name: string;
  rakutenPrice: number;
  mercariPrice: number;
};

const sampleProducts: Product[] = [
  {
    name: "ワイヤレスイヤホン",
    rakutenPrice: 3980,
    mercariPrice: 6500,
  },
  {
    name: "Nintendo Switch ソフト",
    rakutenPrice: 5280,
    mercariPrice: 7200,
  },
  {
    name: "Anker モバイルバッテリー",
    rakutenPrice: 4980,
    mercariPrice: 6800,
  },
];

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [minProfit, setMinProfit] = useState("1000");
  const [minRate, setMinRate] = useState("20");
  const [products, setProducts] = useState<Product[]>([]);

  const searchProducts = () => {
    const result = sampleProducts.filter((product) => {
      const profit = product.mercariPrice - product.rakutenPrice;
      const rate = (profit / product.rakutenPrice) * 100;

      const keywordMatch =
        keyword.trim() === "" ||
        product.name.toLowerCase().includes(keyword.toLowerCase());

      return (
        keywordMatch &&
        profit >= Number(minProfit) &&
        rate >= Number(minRate)
      );
    });

    setProducts(result);
  };

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            楽天 → メルカリ
          </h1>
          <p className="mt-2 text-gray-600">
            商品の価格差と利益をチェックするツール
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold text-gray-900">
            商品を探す
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                商品名
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="例：イヤホン"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                最低利益（円）
              </label>
              <input
                type="number"
                value={minProfit}
                onChange={(e) => setMinProfit(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                最低利益率（%）
              </label>
              <input
                type="number"
                value={minRate}
                onChange={(e) => setMinRate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
              />
            </div>
          </div>

          <button
            onClick={searchProducts}
            className="mt-5 rounded-lg bg-black px-6 py-3 font-bold text-white hover:bg-gray-800"
          >
            商品を検索
          </button>
        </div>

        <div className="mt-8">
          <h2 className="mb-4 text-xl font-bold text-gray-900">
            検索結果
          </h2>

          {products.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm">
              条件に合う商品がありません。
              <br />
              商品名を空欄にすると、サンプル商品を検索できます。
            </div>
          ) : (
            <div className="space-y-4">
              {products.map((product) => {
                const profit =
                  product.mercariPrice - product.rakutenPrice;
                const rate =
                  (profit / product.rakutenPrice) * 100;

                return (
                  <div
                    key={product.name}
                    className="rounded-2xl bg-white p-6 shadow-sm"
                  >
                    <h3 className="text-lg font-bold text-gray-900">
                      {product.name}
                    </h3>

                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-sm text-gray-500">
                          楽天価格
                        </p>
                        <p className="text-xl font-bold">
                          ¥{product.rakutenPrice.toLocaleString()}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">
                          メルカリ想定価格
                        </p>
                        <p className="text-xl font-bold">
                          ¥{product.mercariPrice.toLocaleString()}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">
                          利益
                        </p>
                        <p className="text-xl font-bold text-green-600">
                          ¥{profit.toLocaleString()}
                        </p>
                        <p className="text-sm text-green-600">
                          利益率 {rate.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}