"use client";

import { useState } from "react";

type RakutenProduct = {
  itemName: string;
  itemPrice: number;
  itemUrl: string;
  shopName: string;
  itemCode: string;
  mediumImageUrls?: {
    imageUrl: string;
  }[];
};

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [products, setProducts] = useState<RakutenProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchProducts = async () => {
    if (!keyword.trim()) {
      setError("商品名を入力してください");
      return;
    }

    setLoading(true);
    setError("");
    setProducts([]);

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

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            楽天 → メルカリ
          </h1>

          <p className="mt-2 text-gray-600">
            楽天市場の商品を検索して、仕入れ候補を探します
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold text-gray-900">
            楽天の商品を探す
          </h2>

          <div className="flex flex-col gap-4 md:flex-row">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  searchProducts();
                }
              }}
              placeholder="例：ワイヤレスイヤホン"
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
            />

            <button
              onClick={searchProducts}
              disabled={loading}
              className="rounded-lg bg-black px-8 py-3 font-bold text-white disabled:opacity-50"
            >
              {loading ? "検索中..." : "楽天商品を検索"}
            </button>
          </div>
        </div>

        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              検索結果
            </h2>

            {products.length > 0 && (
              <p className="text-sm text-gray-500">
                {products.length}件表示
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-2xl bg-red-50 p-6 text-red-700">
              {error}
            </div>
          )}

          {!error && !loading && products.length === 0 && (
            <div className="rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm">
              商品名を入力して検索してください。
            </div>
          )}

          {loading && (
            <div className="rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm">
              楽天市場を検索しています...
            </div>
          )}

          {!loading && products.length > 0 && (
            <div className="grid gap-5 md:grid-cols-2">
              {products.map((product, index) => {
                const imageUrl =
                  product.mediumImageUrls?.[0]?.imageUrl || "";

                return (
                  <div
                    key={product.itemCode || index}
                    className="rounded-2xl bg-white p-5 shadow-sm"
                  >
                    <div className="flex gap-5">
                      <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-xl bg-gray-50">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={product.itemName}
                            className="max-h-28 max-w-28 object-contain"
                          />
                        ) : (
                          <span className="text-sm text-gray-400">
                            画像なし
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-3 font-bold text-gray-900">
                          {product.itemName}
                        </h3>

                        <p className="mt-2 text-sm text-gray-500">
                          {product.shopName}
                        </p>

                        <p className="mt-3 text-2xl font-bold text-red-600">
                          ¥{Number(product.itemPrice).toLocaleString()}
                        </p>

                        {product.itemUrl && (
                          <a
                            href={product.itemUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-block font-bold text-blue-600 hover:underline"
                          >
                            楽天の商品ページを見る →
                          </a>
                        )}
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