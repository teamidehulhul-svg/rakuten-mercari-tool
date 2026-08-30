"use client";

import { useState } from "react";
import BarcodeScanner from "./components/barcode-scanner";

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
type EbayProduct = {
  itemId: string;
  title: string;
  itemWebUrl: string;
  price?: {
    value: string;
    currency: string;
  };
  image?: {
    imageUrl: string;
  };
  condition?: string;
  shippingOptions?: {
    shippingCost?: {
      value: string;
      currency: string;
    };
  }[];
};
type MercariPriceSet = {
  price1: string;
  price2: string;
  price3: string;
};

type SortMode =
  | "none"
  | "priceAsc"
  | "priceDesc"
  | "profitDesc";
const convertToEbayKeyword = (keyword: string) => {
  const dictionary: Record<string, string> = {
    "ゲームボーイ": "Nintendo Game Boy",
    "ゲームボーイアドバンス": "Nintendo Game Boy Advance",
    "ニンテンドースイッチ": "Nintendo Switch",
    "任天堂スイッチ": "Nintendo Switch",
    "ポケモンカード": "Pokemon Card",
    "ポケカ": "Pokemon Card",
    "プレイステーション": "PlayStation",
    "プレステ": "PlayStation",
    "ファミコン": "Nintendo Famicom",
    "スーパーファミコン": "Super Famicom",
  };

  const trimmed = keyword.trim();

  return dictionary[trimmed] || trimmed;
};
export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [products, setProducts] = useState<RakutenProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
const [activeTab, setActiveTab] =
  useState<"rakuten" | "ebay" | "calculator" | "scanner">("rakuten");
const [calcEbayPrice, setCalcEbayPrice] = useState("");
const [calcEbayShipping, setCalcEbayShipping] = useState("");
const [calcMercariPrice, setCalcMercariPrice] = useState("");
const [calcMercariShipping, setCalcMercariShipping] = useState("750");
const calcPurchaseCost =
  Number(calcEbayPrice || 0) + Number(calcEbayShipping || 0);

const calcMercariFee =
  Math.floor(Number(calcMercariPrice || 0) * 0.1);

const calcProfit =
  Number(calcMercariPrice || 0) -
  calcMercariFee -
  Number(calcMercariShipping || 0) -
  calcPurchaseCost;

const calcProfitRate =
  Number(calcMercariPrice || 0) > 0
    ? (calcProfit / Number(calcMercariPrice)) * 100
    : 0;

const calcROI =
  calcPurchaseCost > 0
    ? (calcProfit / calcPurchaseCost) * 100
    : 0;

const hasCalculatorInput =
  calcEbayPrice !== "" ||
  calcEbayShipping !== "" ||
  calcMercariPrice !== "";

  const [ebayKeyword, setEbayKeyword] = useState("");
const [ebayProducts, setEbayProducts] = useState<EbayProduct[]>([]);
const [ebayLoading, setEbayLoading] = useState(false);
const [ebayPages, setEbayPages] = useState(1);
const [usdJpyRate, setUsdJpyRate] = useState("150");
const [ebayMercariPrices, setEbayMercariPrices] = useState<
  Record<string, string>
>({});
const [currentPage, setCurrentPage] = useState(1);
const [bulkPages, setBulkPages] = useState(3);
const [mercariKeywords, setMercariKeywords] = useState<
  Record<string, string>
>({});
  const [mercariPrices, setMercariPrices] = useState<
    Record<string, MercariPriceSet>
  >({});

  const [minProfit, setMinProfit] = useState("1000");
  const [minProfitRate, setMinProfitRate] = useState("20");
  const [shippingCost, setShippingCost] = useState("750");
  const [minRakutenPrice, setMinRakutenPrice] = useState("1000");
  const [maxRakutenPrice, setMaxRakutenPrice] = useState("10000");
  const [extraPointRate, setExtraPointRate] = useState("0");

  const [sortMode, setSortMode] =
    useState<SortMode>("none");

  const [candidateOnly, setCandidateOnly] =
    useState(false);
const searchEbayProducts = async (barcodeKeyword?: string) => {
  const searchKeyword = barcodeKeyword?.trim() || ebayKeyword.trim();

  if (!searchKeyword) {
    setError("eBayで検索する商品名を入力してください");
    return;
  }

  if (barcodeKeyword) {
    setEbayKeyword(searchKeyword);
  }

  setEbayLoading(true);
  setError("");
  setEbayProducts([]);

  try {
   const convertedKeyword = convertToEbayKeyword(searchKeyword);

const response = await fetch(
  `/api/ebay/search?keyword=${encodeURIComponent(convertedKeyword)}&pages=${ebayPages}`
);

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || "eBayの商品検索に失敗しました"
      );
    }

    setEbayProducts(data.items || []);
  } catch (error) {
    setError(
      error instanceof Error
        ? error.message
        : "eBayの商品検索に失敗しました"
    );
  } finally {
    setEbayLoading(false);
  }
};
   const searchProducts= async (pageNumber = 1) => {
  
    if (!keyword.trim()) {
      setError("商品名を入力してください");
      return;
    }

    setLoading(true);
    setError("");
    setProducts([]);
    setCandidateOnly(false);
    setSortMode("none");

    try {
     const response = await fetch(
 `/api/search?keyword=${encodeURIComponent(keyword)}&page=${pageNumber}`
);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "楽天の商品検索に失敗しました"
        );
      }

      const items: RakutenProduct[] = (
        data.items || []
      ).map(
        (
          entry:
            | { Item?: RakutenProduct }
            | RakutenProduct
        ) => {
          if ("Item" in entry && entry.Item) {
            return entry.Item;
          }

          return entry as RakutenProduct;
        }
      );

      

      setProducts(items);
      setCurrentPage(pageNumber);

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
  const bulkSearchProducts = async (barcodeKeyword?: string) => {
    const searchKeyword = barcodeKeyword?.trim() || keyword.trim();

    if (!searchKeyword) {
      setError("商品名を入力してください");
      return;
    }

    if (barcodeKeyword) {
      setKeyword(searchKeyword);
    }

    setLoading(true);
    setError("");
    setProducts([]);
    setCandidateOnly(false);
    setSortMode("none");

    try {
      const allItems: RakutenProduct[] = [];

      // 1ページずつ順番に取得
      for (let page = 1; page <= bulkPages; page++) {
   if (page > 1) {
  await new Promise((resolve) => setTimeout(resolve, 1200));
}
  const response = await fetch(
    `/api/search?keyword=${encodeURIComponent(searchKeyword)}&page=${page}`
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
  console.warn(`${page}ページ目の取得をスキップしました`);
  continue;
}

  const items: RakutenProduct[] = (data.items || []).map(
    (
      entry:
        | { Item?: RakutenProduct }
        | RakutenProduct
    ) => {
      if ("Item" in entry && entry.Item) {
        return entry.Item;
      }

      return entry as RakutenProduct;
    }
  );

  allItems.push(...items);
console.log(`${page}ページ目: ${items.length}件 / 合計 ${allItems.length}件`);

}
      const uniqueItems = Array.from(
  new Map(
    allItems.map((item) => [
      item.itemCode || item.itemUrl,
      item,
    ])
  ).values()
);

setProducts(uniqueItems);
      setCurrentPage(1);

      const keywordMap: Record<string, string> = {};

      uniqueItems.forEach((product, index) => {
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
          : "まとめ検索中にエラーが発生しました"
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

    const shipping =
      Number(shippingCost) || 0;

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
const filteredProducts = products.filter((product) => {
  const price = Number(product.itemPrice);
  const minPrice = Number(minRakutenPrice) || 0;
  const maxPrice = Number(maxRakutenPrice) || Infinity;

  return price >= minPrice && price <= maxPrice;
});
let displayedProducts = filteredProducts.map(
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

  if (sortMode === "priceAsc") {
    displayedProducts = [
      ...displayedProducts,
    ].sort(
      (a, b) =>
        a.calculation.effectiveRakutenPrice -
        b.calculation.effectiveRakutenPrice
    );
  }

  if (sortMode === "priceDesc") {
    displayedProducts = [
      ...displayedProducts,
    ].sort(
      (a, b) =>
        b.calculation.effectiveRakutenPrice -
        a.calculation.effectiveRakutenPrice
    );
  }

  if (sortMode === "profitDesc") {
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
    <main className="min-h-screen bg-gradient-to-b from-purple-50 via-gray-50 to-blue-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="sticky top-0 z-20 mb-6 grid grid-cols-4 gap-1 rounded-2xl bg-white/90 p-2 shadow-sm backdrop-blur sm:gap-3">
  <button
    onClick={() => {
      setActiveTab("rakuten");
      setError("");
    }}
    className={`min-h-12 rounded-xl px-2 py-3 text-sm font-bold sm:px-4 sm:text-base ${
      activeTab === "rakuten"
        ? "bg-red-500 text-white"
        : "bg-gray-50 text-gray-600"
    }`}
  >
    🛒 楽天
  </button>

  <button
    onClick={() => {
      setActiveTab("ebay");
      setError("");
    }}
    className={`min-h-12 rounded-xl px-2 py-3 text-sm font-bold sm:px-4 sm:text-base ${
      activeTab === "ebay"
        ? "bg-blue-600 text-white"
        : "bg-gray-50 text-gray-600"
    }`}
  >
    🌎 eBay
  </button>
  <button
  onClick={() => {
    setActiveTab("calculator");
    setError("");
  }}
  className={`min-h-12 rounded-xl px-2 py-3 text-sm font-bold sm:px-4 sm:text-base ${
    activeTab === "calculator"
      ? "bg-purple-600 text-white"
      : "bg-gray-50 text-gray-600"
  }`}
>
  💰 計算
</button>
  <button
    onClick={() => {
      setActiveTab("scanner");
      setError("");
    }}
    className={`min-h-12 rounded-xl px-1 py-3 text-xs font-bold sm:px-4 sm:text-base ${
      activeTab === "scanner"
        ? "bg-emerald-600 text-white"
        : "bg-gray-50 text-gray-600"
    }`}
  >
    📷 スキャン
  </button>
</div>
        <div className="mb-8">
         <h1 className="text-2xl font-bold sm:text-3xl">
 {activeTab === "rakuten"
  ? "楽天 → メルカリ"
  : activeTab === "ebay"
  ? "eBay → メルカリ"
  : activeTab === "calculator"
  ? "💰 eBay → メルカリ 利益計算"
  : "📷 バーコード検索"}
</h1>

          <p className="mt-2 text-gray-600">
 {activeTab === "rakuten"
  ? "楽天仕入れとメルカリ相場を比較して利益商品を探します"
  : activeTab === "ebay"
  ? "eBay仕入れとメルカリ相場を比較して利益商品を探します"
  : activeTab === "calculator"
  ? "eBay仕入れ価格とメルカリ販売価格から利益を計算します"
  : "商品のバーコードを読み取って楽天・eBayから検索します"}
</p>
        </div>
{error && (
  <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
    {error}
  </div>
)}
{activeTab === "calculator" && (
  <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
    <h2 className="mb-5 text-xl font-bold">
      💰 eBay → メルカリ 利益計算
    </h2>

    <div className="space-y-4">
      <div>
        <label className="mb-2 block font-bold">
          ① eBay 商品価格（円）
        </label>
        <input
          type="number"
          value={calcEbayPrice}
          onChange={(e) => setCalcEbayPrice(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-4 py-3"
          placeholder="例：5980"
        />
      </div>

      <div>
        <label className="mb-2 block font-bold">
          ② eBay 送料（円）
        </label>
        <input
          type="number"
          value={calcEbayShipping}
          onChange={(e) => setCalcEbayShipping(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-4 py-3"
          placeholder="例：780"
        />
      </div>

      <div>
        <label className="mb-2 block font-bold">
          ③ メルカリ販売価格（円）
        </label>
        <input
          type="number"
          value={calcMercariPrice}
          onChange={(e) => setCalcMercariPrice(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-4 py-3"
          placeholder="例：8800"
        />
      </div>

      <div>
        <label className="mb-2 block font-bold">
          ④ メルカリ送料（円）
        </label>
        <input
          type="number"
          value={calcMercariShipping}
          onChange={(e) => setCalcMercariShipping(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-4 py-3"
          placeholder="例：210"
        />
      </div>
    </div>

    {hasCalculatorInput ? (
      <>
    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-xl bg-green-50 p-4 text-center">
        <p className="text-sm font-bold text-gray-600">純利益</p>
        <p className="mt-1 text-xl font-bold text-green-700">
          {calcProfit.toLocaleString()}円
        </p>
      </div>

      <div className="rounded-xl bg-yellow-50 p-4 text-center">
        <p className="text-sm font-bold text-gray-600">利益率</p>
        <p className="mt-1 text-xl font-bold text-yellow-700">
          {calcProfitRate.toFixed(1)}%
        </p>
      </div>

      <div className="rounded-xl bg-blue-50 p-4 text-center">
        <p className="text-sm font-bold text-gray-600">ROI</p>
        <p className="mt-1 text-xl font-bold text-blue-700">
          {calcROI.toFixed(1)}%
        </p>
      </div>
    </div>

    <div
      className={`mt-5 rounded-xl p-4 text-center text-xl font-bold ${
        calcProfitRate >= 20
          ? "bg-green-100 text-green-700"
          : calcProfitRate >= 10
          ? "bg-yellow-100 text-yellow-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {calcProfitRate >= 20
        ? "◎ 仕入れ候補"
        : calcProfitRate >= 10
        ? "○ 検討"
        : "❌ 見送り"}
    </div>
      </>
    ) : (
      <div className="mt-6 rounded-xl bg-purple-50 p-5 text-center font-bold text-purple-700">
        金額を入力すると、利益・利益率・ROIをすぐ計算します
      </div>
    )}
  </div>
)}
{activeTab === "scanner" && (
  <BarcodeScanner
    onSearch={(target, barcode) => {
      setError("");

      if (target === "rakuten") {
        setActiveTab("rakuten");
        void bulkSearchProducts(barcode);
        return;
      }

      setActiveTab("ebay");
      void searchEbayProducts(barcode);
    }}
  />
)}

<div
  className={`mb-6 rounded-2xl bg-white p-6 shadow-sm ${
    activeTab === "ebay" ? "block" : "hidden"
  }`}
>
  <h2 className="mb-2 text-xl font-bold">
    🇺🇸 eBayの商品を探す
  </h2>

  <p className="mb-4 text-sm text-gray-500">
    eBayの商品を検索して仕入れ候補を探します
  </p>

  <div className="space-y-4">
    <div className="flex flex-col gap-3 md:flex-row">
    <input
      type="text"
      value={ebayKeyword}
      onChange={(e) => setEbayKeyword(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          void searchEbayProducts();
        }
      }}
      placeholder="例：Nintendo Game Boy"
      className="flex-1 rounded-lg border border-gray-300 px-4 py-3"
    />
    <button
      onClick={() => void searchEbayProducts()}
      disabled={ebayLoading}
      className="rounded-lg bg-blue-600 px-6 py-3 font-bold text-white disabled:opacity-50"
    >
      {ebayLoading
        ? `${ebayPages * 30}件検索中...`
        : `eBayで${ebayPages * 30}件検索`}
    </button>
    </div>

{ebayKeyword.trim() && (
  <p className="text-sm text-gray-500">
    eBay検索ワード：
    <span className="ml-1 font-bold text-blue-600">
      {convertToEbayKeyword(ebayKeyword)}
    </span>
  </p>
)}

    <div className="rounded-xl bg-blue-50 p-4">
      <p className="mb-3 font-bold text-blue-900">検索件数</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[1, 3, 5, 10].map((pages) => (
          <button
            key={pages}
            type="button"
            onClick={() => setEbayPages(pages)}
            className={`rounded-lg px-3 py-3 font-bold ${
              ebayPages === pages
                ? "bg-blue-600 text-white"
                : "bg-white text-blue-700"
            }`}
          >
            {pages * 30}件
          </button>
        ))}
      </div>
    </div>

 <div>
  <label className="mb-2 block text-sm font-bold">
    為替レート（1ドル＝何円）
  </label>

  <input
    type="number"
    value={usdJpyRate}
    onChange={(e) => setUsdJpyRate(e.target.value)}
    className="w-full rounded-lg border border-gray-300 px-4 py-3"
  />
</div>
  </div>
</div>
{activeTab === "ebay" && ebayProducts.length > 0 && (
  <div className="mb-8">
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-xl font-bold">
        eBay検索結果
      </h2>

      <p className="text-sm text-gray-500">
        {ebayProducts.length}件表示
      </p>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      {ebayProducts.map((product) => {
        const price = Number(product.price?.value || 0);

        const shipping = Number(
          product.shippingOptions?.[0]?.shippingCost?.value || 0
        );

        const rate = Number(usdJpyRate) || 0;

const priceJpy = Math.round(price * rate);
const shippingJpy = Math.round(shipping * rate);
const totalJpy = priceJpy + shippingJpy;
       const mercariSalePrice = Number(
  ebayMercariPrices[product.itemId] || 0
);

const mercariFee = Math.round(mercariSalePrice * 0.1);

const domesticShipping = Number(shippingCost) || 0;

const ebayProfit =
  mercariSalePrice -
  mercariFee -
  domesticShipping -
  totalJpy;

const ebayProfitRate =
  totalJpy > 0
    ? (ebayProfit / totalJpy) * 100
    : 0;
return (
          <div
            key={product.itemId}
            className="rounded-2xl bg-white p-5 shadow-sm"
          >
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex h-32 w-full shrink-0 items-center justify-center rounded-xl bg-gray-50 sm:w-32">
                {product.image?.imageUrl ? (
                  <img
                    src={product.image.imageUrl}
                    alt={product.title}
                    className="max-h-28 max-w-28 object-contain"
                  />
                ) : (
                  <span className="text-sm text-gray-400">
                    画像なし
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-bold">
                  {product.title}
                </h3>

                {product.condition && (
                  <p className="mt-2 text-sm text-gray-500">
                    状態：{product.condition}
                  </p>
                )}

                <p className="mt-3 text-2xl font-bold text-blue-600">
                  ${price.toLocaleString()}
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  送料：${shipping.toLocaleString()}
                </p>
<div className="mt-3 rounded-lg bg-green-50 p-3">
  <p className="text-sm">
    商品価格：約{priceJpy.toLocaleString()}円
  </p>

  <p className="text-sm">
    送料：約{shippingJpy.toLocaleString()}円
  </p>

  <p className="mt-1 text-lg font-bold text-green-700">
    🇯🇵 送料込み仕入れ：約{totalJpy.toLocaleString()}円
  </p>
</div>

<div className="mt-4">
  <label className="mb-2 block text-sm font-bold">
    メルカリ想定売価（円）
  </label>

  <input
    type="number"
    value={ebayMercariPrices[product.itemId] || ""}
    onChange={(e) =>
      setEbayMercariPrices((prev) => ({
        ...prev,
        [product.itemId]: e.target.value,
      }))
    }
    placeholder="例：30000"
    className="w-full rounded-lg border border-gray-300 px-4 py-3"
  />
  {mercariSalePrice > 0 && (
  <div className="mt-3 rounded-xl bg-gray-50 p-4">
    <p className="text-sm">
      メルカリ手数料：{mercariFee.toLocaleString()}円
    </p>

    <p className="text-sm">
      国内送料：{domesticShipping.toLocaleString()}円
    </p>

    <p className="mt-2 text-xl font-bold">
      利益：{ebayProfit.toLocaleString()}円
    </p>

    <p className="text-lg font-bold">
      利益率：{ebayProfitRate.toFixed(1)}%
    </p>

    <div
  className={`mt-3 rounded-xl p-3 text-center text-2xl font-bold ${
    ebayProfitRate >= 20
      ? "bg-green-100 text-green-700"
      : ebayProfitRate >= 10
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-700"
  }`}
>
  {ebayProfitRate >= 20
    ? "◎ 仕入れ候補"
    : ebayProfitRate >= 10
    ? "○ 検討"
    : "❌ 見送り"}
</div>
  </div>
)}

</div>
                <a
                  href={product.itemWebUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block rounded-lg bg-blue-50 px-4 py-2 font-bold text-blue-600"
                >
                  eBayで見る →
                </a>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
  )}
  

        <div
  className={`rounded-2xl bg-white p-6 shadow-sm ${
    activeTab === "rakuten" ? "block" : "hidden"
  }`}
>
          <h2 className="mb-5 text-xl font-bold">
            楽天の商品を探す
          </h2>

          <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              value={keyword}
              onChange={(e) =>
                setKeyword(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void bulkSearchProducts();
                }
              }}
              placeholder="例：ワイヤレスイヤホン"
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3"
            />

            <button
              onClick={() => void bulkSearchProducts()}
              disabled={loading}
              className="rounded-lg bg-red-500 px-6 py-3 font-bold text-white disabled:opacity-50"
            >
              {loading
                ? `${bulkPages * 30}件検索中...`
                : `楽天で${bulkPages * 30}件検索`}
            </button>
            </div>

            <div className="rounded-xl bg-red-50 p-4">
              <p className="mb-3 font-bold text-red-900">検索件数</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[1, 3, 5, 10].map((pages) => (
                  <button
                    key={pages}
                    type="button"
                    onClick={() => setBulkPages(pages)}
                    className={`rounded-lg px-3 py-3 font-bold ${
                      bulkPages === pages
                        ? "bg-red-500 text-white"
                        : "bg-white text-red-700"
                    }`}
                  >
                    {pages * 30}件
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-sm font-bold">
                  最低価格（円）
                </label>
                <input
                  type="number"
                  value={minRakutenPrice}
                  onChange={(e) => setMinRakutenPrice(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  最高価格（円）
                </label>
                <input
                  type="number"
                  value={maxRakutenPrice}
                  onChange={(e) => setMaxRakutenPrice(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3"
                />
              </div>
            </div>
          </div>
        </div>
{activeTab === "rakuten" && (
<>
      <div className="hidden">

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
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
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
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
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
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
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
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
              />

              <p className="mt-1 text-xs text-gray-500">
                SPUやキャンペーン分を追加
              </p>
            </div>
          </div>
        </div>
  </>
)}
      {activeTab === "rakuten" && products.length > 0 && (
          <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
            <p className="mb-3 font-bold">
              並び替え・絞り込み
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() =>
                  setSortMode("priceAsc")
                }
                className={`rounded-lg px-5 py-3 font-bold ${
                  sortMode === "priceAsc"
                    ? "bg-black text-white"
                    : "bg-gray-100"
                }`}
              >
                安い順
              </button>

              <button
                onClick={() =>
                  setSortMode("priceDesc")
                }
                className={`rounded-lg px-5 py-3 font-bold ${
                  sortMode === "priceDesc"
                    ? "bg-black text-white"
                    : "bg-gray-100"
                }`}
              >
                高い順
              </button>

              <button
                onClick={() =>
                  setSortMode("profitDesc")
                }
                className={`rounded-lg px-5 py-3 font-bold ${
                  sortMode === "profitDesc"
                    ? "bg-green-600 text-white"
                    : "bg-gray-100"
                }`}
              >
                利益が高い順
              </button>

              <button
                onClick={() =>
                  setSortMode("none")
                }
                className={`rounded-lg px-5 py-3 font-bold ${
                  sortMode === "none"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100"
                }`}
              >
                元の順番
              </button>

          
              <button
                onClick={() =>
                  setCandidateOnly(
                    (prev) => !prev
                  )
                }
                className={`rounded-lg px-5 py-3 font-bold ${
                  candidateOnly
                    ? "bg-green-600 text-white"
                    : "bg-gray-100"
                }`}
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
<div className="hidden">
  <h2 className="text-xl font-bold">
    検索結果　{products.length}件取得 → 条件に合う商品 {filteredProducts.length}件
  </h2>

  <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-4">
    <button
      onClick={() => {
        if (currentPage > 1) {
          searchProducts(currentPage - 1);
        }
      }}
      disabled={currentPage === 1}
      className="rounded-lg bg-gray-200 px-5 py-3 font-bold disabled:opacity-40"
    >
      ← 前の30件
    </button>

    <div className="rounded-lg bg-white px-5 py-3 font-bold shadow-sm">
      {currentPage}ページ目
    </div>

    <button
      onClick={() => {
        searchProducts(currentPage + 1);
      }}
      className="rounded-lg bg-black px-5 py-3 font-bold text-white"
    >
      次の30件 →
    </button>
  </div>
</div> 
<div className="space-y-5">        
            {displayedProducts.map(
              ({
                product,
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

                    <div className="grid gap-6 lg:grid-cols-[150px_minmax(0,1fr)_350px]">
                      <div className="mx-auto flex h-36 w-full max-w-36 items-center justify-center rounded-xl bg-gray-50 lg:mx-0">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={product.itemName}
                            className="max-h-32 max-w-32 object-contain"
                          />
                        ) : (
                          <span className="text-gray-400">
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
                            className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3"
                          />
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
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
                              value={
                                priceSet[field]
                              }
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
                              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
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
{profitRate.toFixed(1)}%
{" "}
{profitRate >= 20
  ? "◎"
  : profitRate >= 10
  ? "○"
  : "❌"}
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
