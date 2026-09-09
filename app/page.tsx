"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useRef, useState } from "react";
import AmazonSearch from "./components/amazon-search";
import AppNavigation, {
  type MainNavigationTab,
} from "./components/app-navigation";
import BarcodeScanner from "./components/barcode-scanner";
import EbayResearchBox from "./components/ebay-research-box";
import MercariMarketLinks from "./components/mercari-market-links";
import type { ListingDraft } from "./components/listing-support";
import type { LedgerDraft } from "./components/revenue-ledger";
import {
  platformLabels,
  type TradePlatform,
} from "./lib/trade-route";
import { createTranslatedEbayResearchUrl } from "./lib/ebay-research";
import { exportProfit } from "./lib/export-profit";

const HomeDashboard = dynamic(() => import("./components/home-dashboard"), {
  ssr: false,
  loading: () => (
    <div className="rounded-3xl bg-white p-8 text-center font-bold text-violet-700 shadow-sm">
      ホームを読み込んでいます...
    </div>
  ),
});

const RevenueLedger = dynamic(() => import("./components/revenue-ledger"), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl bg-white p-8 text-center font-bold text-violet-700 shadow-sm">
      収支表を読み込んでいます...
    </div>
  ),
});

const ListingSupport = dynamic(() => import("./components/listing-support"), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl bg-white p-8 text-center font-bold text-fuchsia-700 shadow-sm">
      出品サポートを読み込んでいます...
    </div>
  ),
});

const InventoryManager = dynamic(
  () => import("./components/inventory-manager"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl bg-white p-8 text-center font-bold text-violet-700 shadow-sm">
        在庫管理を読み込んでいます...
      </div>
    ),
  }
);

type RakutenProduct = {
  itemName: string;
  itemPrice: number;
  itemUrl: string;
  shopName: string;
  itemCode: string;
  pointRate?: number;
  mediumImageUrls?: { imageUrl: string }[];
};

type EbayProduct = {
  itemId: string;
  title: string;
  itemWebUrl: string;
  price?: { value: string; currency: string };
  image?: { imageUrl: string };
  condition?: string;
  shippingOptions?: {
    shippingCost?: { value: string; currency: string };
  }[];
};

type ResearchTab = "rakuten" | "ebay" | "amazon" | "scanner";
type ActiveTab =
  | "home"
  | ResearchTab
  | "calculator"
  | "listing"
  | "ledger"
  | "inventory";

type CalculatorProduct = {
  source: TradePlatform;
  productName: string;
  purchasePrice: number;
  imageUrl?: string;
  itemUrl?: string;
};

type CalculatorSalesChannel = "mercari-rakuma" | "yahoo" | "ebay";

const calculatorSalesChannels: Record<
  CalculatorSalesChannel,
  { label: string; feeRate: number; activeClass: string }
> = {
  ebay: {
    label: "🌎 eBay販売",
    feeRate: 20,
    activeClass: "bg-gradient-to-r from-blue-600 to-violet-600 text-white",
  },
  "mercari-rakuma": {
    label: "🔴 メルカリ・ラクマ",
    feeRate: 10,
    activeClass: "bg-gradient-to-r from-red-500 to-fuchsia-500 text-white",
  },
  yahoo: {
    label: "🔵 Yahoo!フリマ",
    feeRate: 5,
    activeClass: "bg-blue-600 text-white",
  },
};

const researchTabs: {
  tab: ResearchTab;
  label: string;
  activeClass: string;
}[] = [
  { tab: "rakuten", label: "🛒 楽天", activeClass: "bg-red-500 text-white" },
  { tab: "ebay", label: "🌎 eBay", activeClass: "bg-blue-600 text-white" },
  { tab: "amazon", label: "📦 Amazon", activeClass: "bg-orange-500 text-white" },
  {
    tab: "scanner",
    label: "📷 スキャン",
    activeClass: "bg-emerald-600 text-white",
  },
];

const isResearchTab = (tab: ActiveTab): tab is ResearchTab =>
  tab === "rakuten" ||
  tab === "ebay" ||
  tab === "amazon" ||
  tab === "scanner";

const convertToEbayKeyword = (keyword: string) => {
  const dictionary: Record<string, string> = {
    ゲームボーイ: "Nintendo Game Boy",
    ゲームボーイアドバンス: "Nintendo Game Boy Advance",
    ニンテンドースイッチ: "Nintendo Switch",
    任天堂スイッチ: "Nintendo Switch",
    ポケモンカード: "Pokemon Card",
    ポケカ: "Pokemon Card",
    プレイステーション: "PlayStation",
    プレステ: "PlayStation",
    ファミコン: "Nintendo Famicom",
    スーパーファミコン: "Super Famicom",
  };

  const trimmed = keyword.trim();
  return dictionary[trimmed] || trimmed;
};

const createRakutenSearchUrl = (keyword: string) =>
  `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(
    keyword.trim()
  )}/`;

const createEbaySearchUrl = (keyword: string) =>
  `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(
    convertToEbayKeyword(keyword)
  )}`;

const getRakutenPricing = (product: RakutenProduct, extraPointRate: number) => {
  const itemPrice = Number(product.itemPrice) || 0;
  const basePointRate =
    Number(product.pointRate) > 0 ? Number(product.pointRate) : 1;
  const totalPointRate = basePointRate + extraPointRate;
  const pointValue = Math.floor(itemPrice * (totalPointRate / 100));

  return {
    itemPrice,
    totalPointRate,
    pointValue,
    effectivePrice: Math.max(0, itemPrice - pointValue),
  };
};

const getEbayPricing = (product: EbayProduct, usdJpyRate: number) => {
  const itemPriceUsd = Number(product.price?.value || 0);
  const shippingUsd = Number(
    product.shippingOptions?.[0]?.shippingCost?.value || 0
  );
  const itemPriceJpy = Math.round(itemPriceUsd * usdJpyRate);
  const shippingJpy = Math.round(shippingUsd * usdJpyRate);

  return {
    itemPriceUsd,
    shippingUsd,
    totalJpy: itemPriceJpy + shippingJpy,
  };
};

const formatYen = (value: number) => `¥${value.toLocaleString("ja-JP")}`;

const getKeywordMatchScore = (title: string, keyword: string) => {
  const normalize = (value: string) =>
    value.toLocaleLowerCase().replace(/[\s\-_/・,，.。()（）【】\[\]]/g, "");
  const normalizedTitle = normalize(title);
  const normalizedKeyword = normalize(keyword);

  if (!normalizedKeyword) return 0;
  if (normalizedTitle === normalizedKeyword) return 1000;
  if (normalizedTitle.includes(normalizedKeyword)) return 500;

  return keyword
    .toLocaleLowerCase()
    .split(/[\s　]+/)
    .filter((token) => token.length >= 2)
    .reduce(
      (score, token) => score + (normalizedTitle.includes(normalize(token)) ? 50 : 0),
      0
    );
};

type PaginationControlsProps = {
  page: number;
  pageCount: number;
  loading: boolean;
  onPageChange: (page: number) => void;
};

function PaginationControls({
  page,
  pageCount,
  loading,
  onPageChange,
}: PaginationControlsProps) {
  return (
    <nav
      aria-label="検索結果のページ切り替え"
      className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-2"
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={loading || page <= 1}
        className="min-h-11 rounded-lg bg-white px-4 py-2 text-sm font-black text-gray-700 shadow-sm disabled:opacity-35"
      >
        ← 前へ
      </button>
      <span className="text-sm font-black text-gray-700">
        {page} / {pageCount}ページ
      </span>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={loading || page >= pageCount}
        className="min-h-11 rounded-lg bg-white px-4 py-2 text-sm font-black text-gray-700 shadow-sm disabled:opacity-35"
      >
        次へ →
      </button>
    </nav>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [lastResearchTab, setLastResearchTab] =
    useState<ResearchTab>("rakuten");
  const [error, setError] = useState("");
  const [ledgerDraft, setLedgerDraft] = useState<LedgerDraft | null>(null);
  const [listingDraft, setListingDraft] = useState<ListingDraft | null>(null);
  const [amazonSearchKeyword, setAmazonSearchKeyword] = useState("");

  const [rakutenKeyword, setRakutenKeyword] = useState("");
  const [rakutenProduct, setRakutenProduct] =
    useState<RakutenProduct | null>(null);
  const [rakutenProducts, setRakutenProducts] = useState<RakutenProduct[]>([]);
  const [rakutenPage, setRakutenPage] = useState(1);
  const [rakutenPageCount, setRakutenPageCount] = useState(1);
  const [rakutenTotal, setRakutenTotal] = useState(0);
  const [rakutenLoading, setRakutenLoading] = useState(false);
  const [minRakutenPrice, setMinRakutenPrice] = useState("");
  const [maxRakutenPrice, setMaxRakutenPrice] = useState("");
  const [extraPointRate, setExtraPointRate] = useState("0");

  const [ebayKeyword, setEbayKeyword] = useState("");
  const [ebayProduct, setEbayProduct] = useState<EbayProduct | null>(null);
  const [ebayProducts, setEbayProducts] = useState<EbayProduct[]>([]);
  const [ebayPage, setEbayPage] = useState(1);
  const [ebayPageCount, setEbayPageCount] = useState(1);
  const [ebayTotal, setEbayTotal] = useState(0);
  const [ebayLoading, setEbayLoading] = useState(false);
  const [usdJpyRate, setUsdJpyRate] = useState("150");
  const rakutenResultsRef = useRef<HTMLDivElement>(null);
  const ebayResultsRef = useRef<HTMLDivElement>(null);

  const [calculatorProduct, setCalculatorProduct] =
    useState<CalculatorProduct | null>(null);
  const [calcSource, setCalcSource] = useState<TradePlatform>("other");
  const [calcSalesChannel, setCalcSalesChannel] =
    useState<CalculatorSalesChannel>("mercari-rakuma");
  const [calcProductName, setCalcProductName] = useState("");
  const [calcPurchasePrice, setCalcPurchasePrice] = useState("");
  const [calcMercariPrice, setCalcMercariPrice] = useState("");
  const [calcMercariShipping, setCalcMercariShipping] = useState("750");
  const [calcEbayPrice, setCalcEbayPrice] = useState("");
  const [calcEbayShippingChargeMode, setCalcEbayShippingChargeMode] =
    useState<"included" | "separate">("included");
  const [calcEbayBuyerShipping, setCalcEbayBuyerShipping] = useState("0");
  const [calcEbayRate, setCalcEbayRate] = useState("150");
  const [calcEbayShipping, setCalcEbayShipping] = useState("2500");
  const [calcEbayPacking, setCalcEbayPacking] = useState("200");
  const [calcEbayFee, setCalcEbayFee] = useState("20");
  const [calcEbayFixedFee, setCalcEbayFixedFee] = useState("0");
  const isExport = calcSalesChannel === "ebay";
  const calcEbayGrossUsd = Number(calcEbayPrice || 0) +
    (calcEbayShippingChargeMode === "separate" ? Number(calcEbayBuyerShipping || 0) : 0);
  const exportResult = exportProfit({ purchase: Number(calcPurchasePrice), saleUsd: Number(calcEbayPrice),
    buyerShippingUsd: calcEbayShippingChargeMode === "separate" ? Number(calcEbayBuyerShipping) : 0,
    rate: Number(calcEbayRate), shipping: Number(calcEbayShipping), packing: Number(calcEbayPacking),
    feePercent: Number(calcEbayFee), fixedFeeUsd: Number(calcEbayFixedFee) });

  const calcPurchase = Number(calcPurchasePrice || 0);
  const calcSale = isExport ? exportResult.sale : Number(calcMercariPrice || 0);
  const calcShipping = Number((isExport ? calcEbayShipping : calcMercariShipping) || 0);
  const calcFeeRate = isExport ? Number(calcEbayFee) : calculatorSalesChannels[calcSalesChannel].feeRate;
  const calcSellingFee = isExport ? exportResult.fee : Math.floor(calcSale * (calcFeeRate / 100));
  const calcProfit = isExport ? exportResult.profit : calcSale - calcSellingFee - calcShipping - calcPurchase;
  const calcProfitRate = calcSale > 0 ? (calcProfit / calcSale) * 100 : 0;
  const calcROI = calcPurchase > 0 ? (calcProfit / calcPurchase) * 100 : 0;
  const hasCalculation = isExport ? exportResult.valid : calcPurchase > 0 && calcSale > 0;

  const rakutenPricing = rakutenProduct
    ? getRakutenPricing(rakutenProduct, Number(extraPointRate) || 0)
    : null;
  const ebayPricing = ebayProduct
    ? getEbayPricing(ebayProduct, Number(usdJpyRate) || 0)
    : null;

  const openResearchTab = (tab: ResearchTab) => {
    setLastResearchTab(tab);
    setActiveTab(tab);
    setError("");
  };

  const openLedgerWithDraft = (draft: Omit<LedgerDraft, "draftId">) => {
    setLedgerDraft({
      ...draft,
      draftId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    });
    setActiveTab("ledger");
    setError("");
  };

  const openListingSupport = (draft?: Omit<ListingDraft, "draftId">) => {
    setListingDraft(
      draft
        ? {
            ...draft,
            draftId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          }
        : null
    );
    setActiveTab("listing");
    setError("");
  };

  const openCalculator = (product: CalculatorProduct) => {
    setCalcEbayPrice("");
    setCalculatorProduct(product);
    setCalcSource(product.source);
    setCalcProductName(product.productName);
    setCalcPurchasePrice(String(product.purchasePrice));
    setCalcSalesChannel("mercari-rakuma");
    setCalcMercariPrice("");
    setCalcMercariShipping("750");
    setActiveTab("calculator");
    setError("");
  };

  const openManualCalculator = () => {
    setCalcEbayPrice("");
    setCalculatorProduct(null);
    setCalcSource("other");
    setCalcProductName("");
    setCalcPurchasePrice("");
    setCalcSalesChannel("mercari-rakuma");
    setCalcMercariPrice("");
    setCalcMercariShipping("750");
    setActiveTab("calculator");
    setError("");
  };

  const searchRakutenProducts = async (
    barcodeKeyword?: string,
    requestedPage = 1
  ) => {
    const searchKeyword = barcodeKeyword?.trim() || rakutenKeyword.trim();
    const shouldScrollToResults = requestedPage !== rakutenPage;

    if (!searchKeyword) {
      setError("楽天で検索する商品名を入力してください");
      return;
    }

    if (barcodeKeyword) setRakutenKeyword(searchKeyword);

    setRakutenLoading(true);
    if (requestedPage === 1) {
      setRakutenProduct(null);
      setRakutenProducts([]);
    }
    setError("");

    try {
      const params = new URLSearchParams({
        keyword: searchKeyword,
        page: String(requestedPage),
      });

      if (Number(minRakutenPrice) > 0) params.set("minPrice", minRakutenPrice);
      if (Number(maxRakutenPrice) > 0) params.set("maxPrice", maxRakutenPrice);

      const response = await fetch(`/api/search?${params.toString()}`);
      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
        count?: number;
        page?: number;
        pageCount?: number;
        items?: ({ Item?: RakutenProduct } | RakutenProduct)[];
      };

      if (!response.ok || !data.success) {
        throw new Error(data.message || "楽天の商品検索に失敗しました");
      }

      const items = (data.items || []).map((entry) =>
        "Item" in entry && entry.Item ? entry.Item : (entry as RakutenProduct)
      );
      const extraRate = Number(extraPointRate) || 0;
      const rankedItems = [...items].sort((a, b) => {
        const scoreDifference =
          getKeywordMatchScore(b.itemName, searchKeyword) -
          getKeywordMatchScore(a.itemName, searchKeyword);

        return (
          scoreDifference ||
          getRakutenPricing(a, extraRate).effectivePrice -
            getRakutenPricing(b, extraRate).effectivePrice
        );
      });
      const recommended = rankedItems[0];

      if (!recommended) {
        throw new Error("条件に合う楽天商品が見つかりませんでした");
      }

      setRakutenProducts(rankedItems);
      setRakutenProduct(recommended);
      setRakutenPage(data.page || requestedPage);
      setRakutenPageCount(Math.max(1, data.pageCount || 1));
      setRakutenTotal(data.count || rankedItems.length);
      if (shouldScrollToResults) {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            rakutenResultsRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          });
        });
      }
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "楽天の商品検索に失敗しました"
      );
    } finally {
      setRakutenLoading(false);
    }
  };

  const searchEbayProducts = async (
    barcodeKeyword?: string,
    requestedPage = 1
  ) => {
    const searchKeyword = barcodeKeyword?.trim() || ebayKeyword.trim();
    const shouldScrollToResults = requestedPage !== ebayPage;

    if (!searchKeyword) {
      setError("eBayで検索する商品名を入力してください");
      return;
    }

    if (barcodeKeyword) setEbayKeyword(searchKeyword);

    setEbayLoading(true);
    if (requestedPage === 1) {
      setEbayProduct(null);
      setEbayProducts([]);
    }
    setError("");

    try {
      const params = new URLSearchParams({
        keyword: convertToEbayKeyword(searchKeyword),
        page: String(requestedPage),
      });
      const response = await fetch(`/api/ebay/search?${params.toString()}`);
      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
        total?: number;
        page?: number;
        pageCount?: number;
        items?: EbayProduct[];
      };

      if (!response.ok || !data.success) {
        throw new Error(data.message || "eBayの商品検索に失敗しました");
      }

      const rate = Number(usdJpyRate) || 0;
      const pricedItems = (data.items || []).filter(
        (item) => getEbayPricing(item, rate).totalJpy > 0
      );
      const convertedKeyword = convertToEbayKeyword(searchKeyword);
      const rankedItems = [...pricedItems].sort((a, b) => {
        const scoreDifference =
          getKeywordMatchScore(b.title, convertedKeyword) -
          getKeywordMatchScore(a.title, convertedKeyword);

        return (
          scoreDifference ||
          getEbayPricing(a, rate).totalJpy - getEbayPricing(b, rate).totalJpy
        );
      });
      const recommended = rankedItems[0];

      if (!recommended) {
        throw new Error("条件に合うeBay商品が見つかりませんでした");
      }

      setEbayProducts(rankedItems);
      setEbayProduct(recommended);
      setEbayPage(data.page || requestedPage);
      setEbayPageCount(Math.max(1, data.pageCount || 1));
      setEbayTotal(data.total || rankedItems.length);
      if (shouldScrollToResults) {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            ebayResultsRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          });
        });
      }
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "eBayの商品検索に失敗しました"
      );
    } finally {
      setEbayLoading(false);
    }
  };

  const changeRakutenResultsPage = (page: number) => {
    rakutenResultsRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    void searchRakutenProducts(undefined, page);
  };

  const changeEbayResultsPage = (page: number) => {
    ebayResultsRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    void searchEbayProducts(undefined, page);
  };

  const navigateMain = (tab: MainNavigationTab) => {
    if (tab === "research") {
      openResearchTab(lastResearchTab);
      return;
    }

    setActiveTab(tab);
    setError("");
  };

  const mainNavigationTab: MainNavigationTab = isResearchTab(activeTab)
    ? "research"
    : activeTab === "inventory" ||
        activeTab === "ledger" ||
        activeTab === "home"
      ? activeTab
      : "home";

  const pageTitle =
    activeTab === "rakuten"
      ? "楽天で仕入れ候補検索"
      : activeTab === "ebay"
        ? "eBayで仕入れ候補検索"
        : activeTab === "amazon"
          ? "Amazon → メルカリ"
          : activeTab === "calculator"
            ? "💰 利益計算"
            : activeTab === "listing"
              ? "✍️ 出品サポート"
              : activeTab === "scanner"
                ? "📷 バーコード検索"
                : activeTab === "inventory"
                  ? "📦 在庫管理"
                  : "📊 せどり収支表";

  const pageDescription =
    activeTab === "rakuten"
      ? "商品名の一致度を優先し、価格も比べながら候補を30件ずつ表示します"
      : activeTab === "ebay"
        ? "商品名の一致度を優先し、送料込み価格も比べながら30件ずつ表示します"
        : activeTab === "amazon"
          ? "Amazonの商品を検索してメルカリ販売の利益を確認します"
          : activeTab === "calculator"
            ? "商品情報を引き継いで純利益・利益率・ROIを計算します"
            : activeTab === "listing"
              ? "メルカリ・ラクマ・Yahoo!フリマ・eBay向けの出品文をまとめて作ります"
              : activeTab === "scanner"
                ? "バーコードを読み取って楽天・eBay・Amazonから検索します"
                : activeTab === "inventory"
                  ? "仕入れ済み・出品中・売却済みの商品をまとめて管理します"
                  : "売上・仕入れ・経費をまとめて純利益を確認します";

  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-50 via-gray-50 to-blue-50 px-4 pb-28 pt-6 sm:px-6 sm:pb-32 sm:pt-10">
      <div className="mx-auto max-w-6xl">
        {activeTab === "home" && (
          <HomeDashboard
            onResearch={() => openResearchTab(lastResearchTab)}
            onCalculator={openManualCalculator}
            onInventory={() => navigateMain("inventory")}
            onLedger={() => navigateMain("ledger")}
            onListing={() => openListingSupport()}
          />
        )}

        {isResearchTab(activeTab) && (
          <div className="sticky top-3 z-20 mb-6 grid grid-cols-4 gap-1 rounded-2xl bg-white/90 p-2 shadow-sm backdrop-blur sm:gap-2">
            {researchTabs.map((item) => (
              <button
                key={item.tab}
                type="button"
                onClick={() => openResearchTab(item.tab)}
                className={`min-h-12 rounded-xl px-1 py-3 text-[10px] font-black sm:px-4 sm:text-base ${
                  activeTab === item.tab
                    ? item.activeClass
                    : "bg-gray-50 text-gray-600"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {activeTab !== "home" && (
          <header className="mb-8">
            <h1 className="text-2xl font-black sm:text-3xl">{pageTitle}</h1>
            <p className="mt-2 text-sm font-medium text-gray-600 sm:text-base">
              {pageDescription}
            </p>
          </header>
        )}

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 font-bold text-red-700"
          >
            {error}
          </div>
        )}

        {isResearchTab(activeTab) && activeTab !== "scanner" && (
          <EbayResearchBox />
        )}

        {activeTab === "rakuten" && (
          <section className="space-y-6">
            <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  type="search"
                  value={rakutenKeyword}
                  onChange={(event) => setRakutenKeyword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void searchRakutenProducts();
                  }}
                  placeholder="商品名・JANコード"
                  className="min-h-12 flex-1 rounded-xl border border-gray-300 px-4 py-3"
                  aria-label="楽天の商品検索ワード"
                />
                <button
                  type="button"
                  onClick={() => void searchRakutenProducts()}
                  disabled={rakutenLoading}
                  className="min-h-12 rounded-xl bg-red-500 px-6 py-3 font-bold text-white disabled:opacity-50"
                >
                  {rakutenLoading ? "候補を検索中..." : "🔍 候補を検索"}
                </button>
              </div>

              <details className="mt-4 rounded-xl bg-red-50 p-4">
                <summary className="cursor-pointer font-bold text-red-900">
                  価格・ポイント設定（任意）
                </summary>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <label className="text-sm font-bold text-gray-700">
                    最低価格
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={minRakutenPrice}
                      onChange={(event) => setMinRakutenPrice(event.target.value)}
                      className="mt-2 w-full rounded-lg border border-red-100 bg-white px-3 py-3"
                    />
                  </label>
                  <label className="text-sm font-bold text-gray-700">
                    最高価格
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={maxRakutenPrice}
                      onChange={(event) => setMaxRakutenPrice(event.target.value)}
                      className="mt-2 w-full rounded-lg border border-red-100 bg-white px-3 py-3"
                    />
                  </label>
                  <label className="col-span-2 text-sm font-bold text-gray-700 sm:col-span-1">
                    追加ポイント率
                    <input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      value={extraPointRate}
                      onChange={(event) => setExtraPointRate(event.target.value)}
                      className="mt-2 w-full rounded-lg border border-red-100 bg-white px-3 py-3"
                    />
                  </label>
                </div>
              </details>
            </div>

            {rakutenProduct && rakutenPricing && (
              <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-red-100 sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-red-500 px-4 py-2 text-sm font-black text-white">
                    おすすめ候補
                  </span>
                  <span className="text-xs font-bold text-gray-400">
                    商品名の一致度＋実質価格
                  </span>
                </div>

                <div className="grid gap-6 md:grid-cols-[12rem_minmax(0,1fr)]">
                  <div className="relative mx-auto aspect-square w-full max-w-48 overflow-hidden rounded-2xl bg-gray-50">
                    {rakutenProduct.mediumImageUrls?.[0]?.imageUrl ? (
                      <Image
                        src={rakutenProduct.mediumImageUrls[0].imageUrl}
                        alt={rakutenProduct.itemName}
                        fill
                        sizes="192px"
                        className="object-contain p-3"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400">
                        画像なし
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-lg font-black leading-7 text-gray-900 sm:text-xl">
                      {rakutenProduct.itemName}
                    </h2>
                    <p className="mt-2 text-sm font-bold text-gray-500">
                      {rakutenProduct.shopName}
                    </p>

                    <div className="mt-5 rounded-2xl bg-red-50 p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-gray-600">販売価格</span>
                        <span className="text-xl font-black text-red-600">
                          {formatYen(rakutenPricing.itemPrice)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                        <span>合計ポイント率</span>
                        <span className="font-bold">
                          {rakutenPricing.totalPointRate}%
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 text-sm text-orange-600">
                        <span className="font-bold">ポイント相当</span>
                        <span className="font-black">
                          −{formatYen(rakutenPricing.pointValue)}
                        </span>
                      </div>
                      <div className="mt-4 border-t border-red-100 pt-4">
                        <p className="text-sm font-bold text-gray-600">
                          実質仕入れ価格
                        </p>
                        <p className="mt-1 text-3xl font-black text-red-600">
                          {formatYen(rakutenPricing.effectivePrice)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <a
                    href={rakutenProduct.itemUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-red-500 px-5 py-4 text-center font-bold text-white"
                  >
                    この商品を見る
                  </a>
                  <a
                    href={createRakutenSearchUrl(rakutenKeyword)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border-2 border-red-200 bg-white px-5 py-4 text-center font-bold text-red-600"
                  >
                    🔍 ほかの商品も見る
                  </a>
                </div>
                <MercariMarketLinks title={rakutenProduct.itemName} />
                <a
                  href={createTranslatedEbayResearchUrl(rakutenProduct.itemName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 block w-full rounded-xl bg-gradient-to-r from-blue-700 to-blue-500 px-5 py-4 text-center font-black text-white shadow-sm"
                >
                  eBay売れ行き調査 ↗
                </a>
                <button
                  type="button"
                  onClick={() =>
                    openCalculator({
                      source: "rakuten",
                      productName: rakutenProduct.itemName,
                      purchasePrice: rakutenPricing.effectivePrice,
                      imageUrl: rakutenProduct.mediumImageUrls?.[0]?.imageUrl,
                      itemUrl: rakutenProduct.itemUrl,
                    })
                  }
                  className="mt-3 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 px-5 py-4 font-bold text-white"
                >
                  💰 利益計算へ送る
                </button>
              </article>
            )}

            {rakutenProducts.length > 0 && (
              <section
                ref={rakutenResultsRef}
                className="scroll-mt-24 rounded-3xl bg-white p-4 shadow-sm sm:p-6"
              >
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">楽天の検索候補</h2>
                    <p className="mt-1 text-sm font-bold text-gray-500">
                      全{rakutenTotal.toLocaleString()}件・1ページ最大30件
                    </p>
                  </div>
                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600">
                    気になる商品を選べる
                  </span>
                </div>

                <PaginationControls
                  page={rakutenPage}
                  pageCount={rakutenPageCount}
                  loading={rakutenLoading}
                  onPageChange={changeRakutenResultsPage}
                />

                <div className="mt-4 divide-y divide-gray-100">
                  {rakutenProducts.map((product, index) => {
                    const pricing = getRakutenPricing(
                      product,
                      Number(extraPointRate) || 0
                    );
                    const isSelected =
                      product.itemCode === rakutenProduct?.itemCode;

                    return (
                      <article
                        key={`${product.itemCode}-${index}`}
                        className={`grid grid-cols-[5rem_minmax(0,1fr)] gap-3 py-4 sm:grid-cols-[6rem_minmax(0,1fr)] ${
                          isSelected ? "bg-red-50/60" : ""
                        }`}
                      >
                        <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-50">
                          {product.mediumImageUrls?.[0]?.imageUrl ? (
                            <Image
                              src={product.mediumImageUrls[0].imageUrl}
                              alt={product.itemName}
                              fill
                              sizes="96px"
                              className="object-contain p-1"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-gray-400">
                              画像なし
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="line-clamp-2 text-sm font-black leading-5 text-gray-900 sm:text-base">
                              {product.itemName}
                            </h3>
                            <span className="shrink-0 text-xs font-black text-gray-400">
                              #{(rakutenPage - 1) * 30 + index + 1}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs font-bold text-gray-500">
                            {product.shopName}
                          </p>
                          <p className="mt-2 text-lg font-black text-red-600">
                            実質 {formatYen(pricing.effectivePrice)}
                            <span className="ml-2 text-xs font-bold text-gray-400">
                              販売 {formatYen(pricing.itemPrice)}
                            </span>
                          </p>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setRakutenProduct(product);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              className={`rounded-lg px-3 py-2 text-xs font-black ${
                                isSelected
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {isSelected ? "✓ 選択中" : "この候補を選ぶ"}
                            </button>
                            <a
                              href={createTranslatedEbayResearchUrl(product.itemName)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg bg-blue-600 px-3 py-2 text-center text-xs font-black text-white"
                            >
                              eBay調査 ↗
                            </a>
                          </div>
                          <MercariMarketLinks
                            title={product.itemName}
                            variant="compact"
                          />
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="mt-4">
                  <PaginationControls
                    page={rakutenPage}
                    pageCount={rakutenPageCount}
                    loading={rakutenLoading}
                    onPageChange={changeRakutenResultsPage}
                  />
                </div>
              </section>
            )}
          </section>
        )}

        {activeTab === "ebay" && (
          <section className="space-y-6">
            <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  type="search"
                  value={ebayKeyword}
                  onChange={(event) => setEbayKeyword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void searchEbayProducts();
                  }}
                  placeholder="商品名・UPCコード"
                  className="min-h-12 flex-1 rounded-xl border border-gray-300 px-4 py-3"
                  aria-label="eBayの商品検索ワード"
                />
                <button
                  type="button"
                  onClick={() => void searchEbayProducts()}
                  disabled={ebayLoading}
                  className="min-h-12 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white disabled:opacity-50"
                >
                  {ebayLoading ? "候補を検索中..." : "🔍 候補を検索"}
                </button>
              </div>

              {ebayKeyword.trim() && (
                <p className="mt-3 text-sm text-gray-500">
                  eBay検索ワード：
                  <span className="ml-1 font-bold text-blue-600">
                    {convertToEbayKeyword(ebayKeyword)}
                  </span>
                </p>
              )}

              <label className="mt-4 block rounded-xl bg-blue-50 p-4 text-sm font-bold text-blue-950">
                為替レート（1ドル＝何円）
                <input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={usdJpyRate}
                  onChange={(event) => setUsdJpyRate(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-blue-100 bg-white px-4 py-3 text-gray-900"
                />
              </label>
            </div>

            {ebayProduct && ebayPricing && (
              <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-blue-100 sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-blue-600 px-4 py-2 text-sm font-black text-white">
                    おすすめ候補
                  </span>
                  <span className="text-xs font-bold text-gray-400">
                    商品名の一致度＋送料込み価格
                  </span>
                </div>

                <div className="grid gap-6 md:grid-cols-[12rem_minmax(0,1fr)]">
                  <div className="relative mx-auto aspect-square w-full max-w-48 overflow-hidden rounded-2xl bg-gray-50">
                    {ebayProduct.image?.imageUrl ? (
                      <Image
                        src={ebayProduct.image.imageUrl}
                        alt={ebayProduct.title}
                        fill
                        sizes="192px"
                        className="object-contain p-3"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400">
                        画像なし
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-lg font-black leading-7 text-gray-900 sm:text-xl">
                      {ebayProduct.title}
                    </h2>
                    {ebayProduct.condition && (
                      <p className="mt-2 text-sm font-bold text-gray-500">
                        状態：{ebayProduct.condition}
                      </p>
                    )}

                    <div className="mt-5 rounded-2xl bg-blue-50 p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-gray-600">商品価格</span>
                        <span className="text-xl font-black text-blue-600">
                          ${ebayPricing.itemPriceUsd.toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                        <span>海外送料</span>
                        <span className="font-bold">
                          ${ebayPricing.shippingUsd.toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-4 border-t border-blue-100 pt-4">
                        <p className="text-sm font-bold text-gray-600">
                          送料込み仕入れ価格
                        </p>
                        <p className="mt-1 text-3xl font-black text-blue-600">
                          約{formatYen(ebayPricing.totalJpy)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <a
                    href={ebayProduct.itemWebUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-blue-600 px-5 py-4 text-center font-bold text-white"
                  >
                    この商品を見る
                  </a>
                  <a
                    href={createEbaySearchUrl(ebayKeyword)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border-2 border-blue-200 bg-white px-5 py-4 text-center font-bold text-blue-600"
                  >
                    🔍 ほかの商品も見る
                  </a>
                </div>
                <MercariMarketLinks title={ebayProduct.title} />
                <a
                  href={createTranslatedEbayResearchUrl(ebayProduct.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 block w-full rounded-xl bg-gradient-to-r from-blue-700 to-blue-500 px-5 py-4 text-center font-black text-white shadow-sm"
                >
                  eBay売れ行き調査 ↗
                </a>
                <button
                  type="button"
                  onClick={() =>
                    openCalculator({
                      source: "ebay",
                      productName: ebayProduct.title,
                      purchasePrice: ebayPricing.totalJpy,
                      imageUrl: ebayProduct.image?.imageUrl,
                      itemUrl: ebayProduct.itemWebUrl,
                    })
                  }
                  className="mt-3 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 px-5 py-4 font-bold text-white"
                >
                  💰 利益計算へ送る
                </button>
              </article>
            )}

            {ebayProducts.length > 0 && (
              <section
                ref={ebayResultsRef}
                className="scroll-mt-24 rounded-3xl bg-white p-4 shadow-sm sm:p-6"
              >
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">eBayの検索候補</h2>
                    <p className="mt-1 text-sm font-bold text-gray-500">
                      全{ebayTotal.toLocaleString()}件・1ページ最大30件
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-600">
                    気になる商品を選べる
                  </span>
                </div>

                <PaginationControls
                  page={ebayPage}
                  pageCount={ebayPageCount}
                  loading={ebayLoading}
                  onPageChange={changeEbayResultsPage}
                />

                <div className="mt-4 divide-y divide-gray-100">
                  {ebayProducts.map((product, index) => {
                    const pricing = getEbayPricing(
                      product,
                      Number(usdJpyRate) || 0
                    );
                    const isSelected = product.itemId === ebayProduct?.itemId;

                    return (
                      <article
                        key={product.itemId}
                        className={`grid grid-cols-[5rem_minmax(0,1fr)] gap-3 py-4 sm:grid-cols-[6rem_minmax(0,1fr)] ${
                          isSelected ? "bg-blue-50/60" : ""
                        }`}
                      >
                        <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-50">
                          {product.image?.imageUrl ? (
                            <Image
                              src={product.image.imageUrl}
                              alt={product.title}
                              fill
                              sizes="96px"
                              className="object-contain p-1"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-gray-400">
                              画像なし
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="line-clamp-2 text-sm font-black leading-5 text-gray-900 sm:text-base">
                              {product.title}
                            </h3>
                            <span className="shrink-0 text-xs font-black text-gray-400">
                              #{(ebayPage - 1) * 30 + index + 1}
                            </span>
                          </div>
                          {product.condition && (
                            <p className="mt-1 text-xs font-bold text-gray-500">
                              状態：{product.condition}
                            </p>
                          )}
                          <p className="mt-2 text-lg font-black text-blue-600">
                            約{formatYen(pricing.totalJpy)}
                            <span className="ml-2 text-xs font-bold text-gray-400">
                              ${pricing.itemPriceUsd.toLocaleString()}＋送料
                            </span>
                          </p>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEbayProduct(product);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              className={`rounded-lg px-3 py-2 text-xs font-black ${
                                isSelected
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {isSelected ? "✓ 選択中" : "この候補を選ぶ"}
                            </button>
                            <a
                              href={createTranslatedEbayResearchUrl(product.title)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg bg-blue-600 px-3 py-2 text-center text-xs font-black text-white"
                            >
                              売れ行き調査 ↗
                            </a>
                          </div>
                          <MercariMarketLinks
                            title={product.title}
                            variant="compact"
                          />
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="mt-4">
                  <PaginationControls
                    page={ebayPage}
                    pageCount={ebayPageCount}
                    loading={ebayLoading}
                    onPageChange={changeEbayResultsPage}
                  />
                </div>
              </section>
            )}
          </section>
        )}

        <div className={activeTab === "amazon" ? "block" : "hidden"}>
          <AmazonSearch
            initialKeyword={amazonSearchKeyword}
            onInitialKeywordConsumed={() => setAmazonSearchKeyword("")}
            onRegister={(draft) => openLedgerWithDraft(draft)}
          />
        </div>

        {activeTab === "scanner" && (
          <BarcodeScanner
            onSearch={(target, barcode) => {
              setError("");

              if (target === "rakuten") {
                openResearchTab("rakuten");
                void searchRakutenProducts(barcode);
                return;
              }

              if (target === "amazon") {
                setAmazonSearchKeyword(barcode);
                openResearchTab("amazon");
                return;
              }

              openResearchTab("ebay");
              void searchEbayProducts(barcode);
            }}
          />
        )}

        {activeTab === "calculator" && (
          <section className="space-y-5">
            {calculatorProduct && (
              <article className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-gray-50">
                  {calculatorProduct.imageUrl ? (
                    <Image
                      src={calculatorProduct.imageUrl}
                      alt={calculatorProduct.productName}
                      fill
                      sizes="96px"
                      className="object-contain p-2"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-3xl">
                      📦
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="line-clamp-2 font-black text-gray-900">
                    {calculatorProduct.productName}
                  </h2>
                  <span className="mt-2 inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                    {platformLabels[calculatorProduct.source]}から自動入力
                  </span>
                  {calculatorProduct.itemUrl && (
                    <a
                      href={calculatorProduct.itemUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block text-sm font-bold text-blue-600"
                    >
                      商品ページを見る →
                    </a>
                  )}
                </div>
              </article>
            )}

            <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
              <div className="space-y-4">
                <div>
                  <p className="font-bold">販売先</p>
                  <div className="mt-2 grid gap-2 rounded-xl bg-gray-100 p-1 sm:grid-cols-3">
                    {(
                      Object.entries(calculatorSalesChannels) as [
                        CalculatorSalesChannel,
                        (typeof calculatorSalesChannels)[CalculatorSalesChannel],
                      ][]
                    ).map(([value, settings]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setCalcSalesChannel(value)}
                        className={`min-h-14 rounded-lg px-3 py-3 text-sm font-black shadow-sm ${
                          calcSalesChannel === value
                            ? settings.activeClass
                            : "bg-white text-gray-600"
                        }`}
                      >
                        {settings.label}
                        <span className="mt-1 block text-xs opacity-80">
                          {value === "ebay" ? "概算手数料・諸費用 20%（変更可）" : `手数料 ${settings.feeRate}%`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {!calculatorProduct && (
                  <label className="block font-bold">
                    仕入れ先
                    <select
                      value={calcSource}
                      onChange={(event) =>
                        setCalcSource(event.target.value as TradePlatform)
                      }
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
                    >
                      {Object.entries(platformLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="block font-bold">
                  商品名
                  <input
                    type="text"
                    value={calcProductName}
                    onChange={(event) => setCalcProductName(event.target.value)}
                    placeholder="例：ゲーム機 本体セット"
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
                  />
                </label>

                <label className="block rounded-2xl bg-red-50 p-4 font-bold">
                  {calculatorProduct
                    ? "実質仕入れ価格（自動入力・修正OK）"
                    : "仕入れ合計（円）"}
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={calcPurchasePrice}
                    onChange={(event) => setCalcPurchasePrice(event.target.value)}
                    placeholder="例：29204"
                    className="mt-2 w-full rounded-xl border border-red-100 bg-white px-4 py-3 text-xl font-black"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block font-bold">
                    {isExport
                      ? calcEbayShippingChargeMode === "separate"
                        ? "eBay商品価格（米ドル）"
                        : "eBay販売予定額（米ドル・送料込み）"
                      : calcSalesChannel === "yahoo"
                      ? "Yahoo!フリマ販売予定価格"
                      : "メルカリ・ラクマ販売予定価格"}
                    <input
                      type="number"
                      min="0"
                      inputMode={isExport ? "decimal" : "numeric"}
                      step={isExport ? "0.01" : "1"}
                      value={isExport ? calcEbayPrice : calcMercariPrice}
                      onChange={(event) => isExport ? setCalcEbayPrice(event.target.value) : setCalcMercariPrice(event.target.value)}
                      placeholder={isExport ? "例：49.99" : "例：42800"}
                      className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-lg font-bold"
                    />
                  </label>
                  <label className="block font-bold">
                    {isExport ? "郵便局などへ払う送料（円）" : "発送送料"}
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={isExport ? calcEbayShipping : calcMercariShipping}
                      onChange={(event) =>
                        isExport ? setCalcEbayShipping(event.target.value) : setCalcMercariShipping(event.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-lg font-bold"
                    />
                  </label>
                </div>

                {isExport && <div className="space-y-4 rounded-2xl bg-blue-50 p-4">
                  <p className="font-bold text-blue-800">国内で仕入れ → eBayで販売</p>
                  <div>
                    <p className="font-bold">購入者への送料設定</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-white p-1">
                      <button
                        type="button"
                        onClick={() => setCalcEbayShippingChargeMode("included")}
                        className={`min-h-12 rounded-lg px-3 py-2 font-black ${calcEbayShippingChargeMode === "included" ? "bg-blue-600 text-white" : "text-gray-600"}`}
                      >
                        送料込み
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalcEbayShippingChargeMode("separate")}
                        className={`min-h-12 rounded-lg px-3 py-2 font-black ${calcEbayShippingChargeMode === "separate" ? "bg-violet-600 text-white" : "text-gray-600"}`}
                      >
                        送料を別請求
                      </button>
                    </div>
                  </div>
                  {calcEbayShippingChargeMode === "separate" && (
                    <label className="block rounded-xl bg-violet-50 p-3 font-bold text-violet-900">
                      購入者から受け取る送料（米ドル）
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={calcEbayBuyerShipping}
                        onChange={(event) => setCalcEbayBuyerShipping(event.target.value)}
                        placeholder="例：18.00"
                        className="mt-2 w-full rounded-xl border border-violet-100 bg-white p-3 text-lg font-bold"
                      />
                    </label>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="font-bold">為替（1ドル＝何円）<input type="number" min="0.01" step="0.01" inputMode="decimal" value={calcEbayRate} onChange={e => setCalcEbayRate(e.target.value)} className="mt-2 w-full rounded-xl border bg-white p-3" /></label>
                    <label className="font-bold">梱包・その他費用（円）<input type="number" min="0" inputMode="numeric" value={calcEbayPacking} onChange={e => setCalcEbayPacking(e.target.value)} className="mt-2 w-full rounded-xl border bg-white p-3" /></label>
                  </div>
                  <details><summary className="cursor-pointer py-3 font-bold text-violet-700">手数料の設定を変更</summary>
                    <label className="block font-bold">概算手数料・諸費用（％）<input type="number" min="0" max="99.99" step="0.01" inputMode="decimal" value={calcEbayFee} onChange={e => setCalcEbayFee(e.target.value)} className="my-2 w-full rounded-xl border bg-white p-3" /></label>
                    <label className="block font-bold">別途加算する固定手数料（米ドル）<input type="number" min="0" step="0.01" inputMode="decimal" value={calcEbayFixedFee} onChange={e => setCalcEbayFixedFee(e.target.value)} className="my-2 w-full rounded-xl border bg-white p-3" /></label>
                  </details>
                  <p className="text-sm text-blue-900">20％は公式の一律料率ではなく概算です。広告・換金費等を含めて見積もる設定で、別の割合は自動加算しません。カテゴリー・税・広告条件で不足する場合があります。固定費を含めて見積もる場合は固定手数料を0にしてください。為替は手入力です。</p>
                  <p className="font-black text-blue-700">
                    購入者から受け取る合計：${calcEbayGrossUsd.toFixed(2)} → {formatYen(calcSale)}
                  </p>
                </div>}

                <div className="flex items-center justify-between rounded-xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-700">
                  <span>販売手数料{calcFeeRate}%（自動計算）</span>
                  <span>{formatYen(calcSellingFee)}</span>
                </div>
              </div>
            </div>

            {hasCalculation ? (
              <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="rounded-xl bg-green-50 p-3 text-center sm:p-4">
                    <p className="text-xs font-bold text-gray-600 sm:text-sm">
                      純利益
                    </p>
                    <p className="mt-1 text-lg font-black text-green-700 sm:text-2xl">
                      {calcProfit >= 0 ? "+" : ""}
                      {formatYen(calcProfit)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-yellow-50 p-3 text-center sm:p-4">
                    <p className="text-xs font-bold text-gray-600 sm:text-sm">
                      利益率
                    </p>
                    <p className="mt-1 text-lg font-black text-yellow-700 sm:text-2xl">
                      {calcProfitRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3 text-center sm:p-4">
                    <p className="text-xs font-bold text-gray-600 sm:text-sm">ROI</p>
                    <p className="mt-1 text-lg font-black text-blue-700 sm:text-2xl">
                      {calcROI.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div
                  className={`mt-4 rounded-xl p-4 text-center text-xl font-black ${
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

                <button
                  type="button"
                  onClick={() =>
                    openLedgerWithDraft({
                      productName: calcProductName.trim() || "仕入れ商品",
                      source: calcSource,
                      salesChannel:
                        isExport ? "ebay" : calcSalesChannel === "yahoo" ? "yahoo" : "mercari",
                      purchasePrice: calcPurchase,
                      expectedSalePrice: calcSale,
                      sellingFee: calcSellingFee,
                      shippingCost: calcShipping,
                      otherExpenses: isExport ? Number(calcEbayPacking) : 0,
                      imageUrl: calculatorProduct?.imageUrl,
                      itemUrl: calculatorProduct?.itemUrl,
                    })
                  }
                  className="mt-4 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 py-4 font-bold text-white"
                >
                  📦 この計算結果を仕入れ登録へ
                </button>
              </div>
            ) : (
              <div className="rounded-xl bg-purple-50 p-5 text-center font-bold text-purple-700">
                販売予定価格を入力すると、利益をすぐ計算します
              </div>
            )}

            {calculatorProduct &&
              (calculatorProduct.source === "rakuten" ||
                calculatorProduct.source === "ebay") && (
                <button
                  type="button"
                  onClick={() =>
                    openResearchTab(calculatorProduct.source as ResearchTab)
                  }
                  className="w-full rounded-xl border-2 border-violet-200 bg-white px-5 py-4 font-bold text-violet-700"
                >
                  検索結果に戻る
                </button>
              )}
          </section>
        )}

        {activeTab === "ledger" && (
          <RevenueLedger
            draft={ledgerDraft}
            onDraftConsumed={() => setLedgerDraft(null)}
          />
        )}

        {activeTab === "listing" && <ListingSupport draft={listingDraft} />}

        {activeTab === "inventory" && (
          <InventoryManager
            onAddPurchase={() =>
              openLedgerWithDraft({
                productName: "",
                source: "other",
                purchasePrice: 0,
                expectedSalePrice: 0,
                sellingFee: 0,
                shippingCost: 750,
              })
            }
            onOpenLedger={() => {
              setActiveTab("ledger");
              setError("");
            }}
            onCreateListing={(draft) => openListingSupport(draft)}
          />
        )}
      </div>

      <AppNavigation activeTab={mainNavigationTab} onNavigate={navigateMain} />
    </main>
  );
}
