"use client";

import { useMemo, useState } from "react";
import type { TradePlatform } from "../lib/trade-route";

export type ListingDraft = {
  draftId: string;
  productName: string;
  salesChannel: TradePlatform;
  category?: string;
  expectedPrice?: number;
};

type ListingSupportProps = {
  draft: ListingDraft | null;
};

type ListingPlatform = "mercari" | "rakuma" | "yahoo" | "ebay";
type ConditionKey = "new" | "likeNew" | "good" | "fair";

const platformSettings: Record<
  ListingPlatform,
  {
    label: string;
    shortLabel: string;
    url: string;
    maxTitleLength: number;
    defaultFeeRate: number;
    activeClass: string;
  }
> = {
  mercari: {
    label: "🔴 メルカリ",
    shortLabel: "メルカリ",
    url: "https://jp.mercari.com/sell",
    maxTitleLength: 40,
    defaultFeeRate: 10,
    activeClass: "bg-red-500 text-white shadow-sm",
  },
  rakuma: {
    label: "🟣 ラクマ",
    shortLabel: "ラクマ",
    url: "https://fril.jp/item/new",
    maxTitleLength: 40,
    defaultFeeRate: 10,
    activeClass: "bg-fuchsia-600 text-white shadow-sm",
  },
  yahoo: {
    label: "🔵 Yahoo!フリマ",
    shortLabel: "Yahoo!フリマ",
    url: "https://paypayfleamarket.yahoo.co.jp/",
    maxTitleLength: 65,
    defaultFeeRate: 5,
    activeClass: "bg-blue-600 text-white shadow-sm",
  },
  ebay: {
    label: "🌎 eBay",
    shortLabel: "eBay",
    url: "https://www.ebay.com/sl/sell",
    maxTitleLength: 80,
    defaultFeeRate: 15,
    activeClass: "bg-sky-600 text-white shadow-sm",
  },
};

const conditionLabels: Record<ConditionKey, { mercari: string; ebay: string }> = {
  new: { mercari: "新品・未使用", ebay: "New" },
  likeNew: { mercari: "未使用に近い", ebay: "Like New" },
  good: { mercari: "目立った傷や汚れなし", ebay: "Good" },
  fair: { mercari: "傷や汚れあり", ebay: "Acceptable" },
};

const initialPlatform = (draft: ListingDraft | null): ListingPlatform =>
  draft?.salesChannel === "ebay"
    ? "ebay"
    : draft?.salesChannel === "yahoo"
      ? "yahoo"
      : "mercari";

export default function ListingSupport({ draft }: ListingSupportProps) {
  const [platform, setPlatform] = useState<ListingPlatform>(() =>
    initialPlatform(draft)
  );
  const [productName, setProductName] = useState(draft?.productName || "");
  const [englishName, setEnglishName] = useState("");
  const [brandModel, setBrandModel] = useState("");
  const [englishBrandModel, setEnglishBrandModel] = useState("");
  const [condition, setCondition] = useState<ConditionKey>("good");
  const [includedItems, setIncludedItems] = useState("写真に写っているものがすべてです");
  const [englishIncludedItems, setEnglishIncludedItems] = useState("");
  const [price, setPrice] = useState(
    draft?.expectedPrice ? String(draft.expectedPrice) : ""
  );
  const [shippingCost, setShippingCost] = useState("750");
  const [feeRate, setFeeRate] = useState(() =>
    String(platformSettings[initialPlatform(draft)].defaultFeeRate)
  );
  const [notes, setNotes] = useState("");
  const [englishNotes, setEnglishNotes] = useState("");
  const [additionalDescription, setAdditionalDescription] = useState("");
  const [englishAdditionalDescription, setEnglishAdditionalDescription] =
    useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedSource, setTranslatedSource] = useState("");
  const [feedback, setFeedback] = useState(
    draft ? "在庫の商品情報を引き継ぎました" : ""
  );

  const output = useMemo(() => {
    const cleanProductName = productName.trim() || "商品名";
    const cleanBrandModel = brandModel.trim();
    const cleanIncludedItems = includedItems.trim() || "写真に写っているものがすべてです";
    const cleanNotes = notes.trim();
    const cleanAdditionalDescription = additionalDescription.trim();

    if (platform === "ebay") {
      const ebayName = englishName.trim() || cleanProductName;
      const ebayBrandModel = englishBrandModel.trim() || cleanBrandModel;
      const ebayIncludedItems =
        englishIncludedItems.trim() || cleanIncludedItems;
      const ebayNotes = englishNotes.trim() || cleanNotes;
      const ebayAdditionalDescription =
        englishAdditionalDescription.trim() || cleanAdditionalDescription;
      const title = [ebayBrandModel, ebayName, conditionLabels[condition].ebay]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);

      const description = [
        "Thank you for visiting this listing.",
        "",
        `Item: ${ebayName}`,
        ebayBrandModel ? `Brand / Model: ${ebayBrandModel}` : "",
        `Condition: ${conditionLabels[condition].ebay}`,
        `Included: ${ebayIncludedItems}`,
        ebayNotes ? `Notes: ${ebayNotes}` : "",
        ...(ebayAdditionalDescription ? ["", ebayAdditionalDescription] : []),
        "",
        "Please check the photos carefully for the actual condition.",
        "The item will be packed carefully for shipping from Japan.",
      ]
        .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
        .join("\n")
        .trim();

      return {
        title,
        description,
        maxTitleLength: platformSettings.ebay.maxTitleLength,
      };
    }

    const title = [cleanBrandModel, cleanProductName]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, platformSettings[platform].maxTitleLength);
    const closingLine =
      platform === "rakuma"
        ? "コメントなしで購入OKです！"
        : platform === "yahoo"
          ? "ご購入前に写真と説明をご確認ください。"
          : "即購入OKです！";
    const description = [
      "ご覧いただきありがとうございます。",
      "",
      `【商品名】${cleanProductName}`,
      cleanBrandModel ? `【ブランド・型番】${cleanBrandModel}` : "",
      `【状態】${conditionLabels[condition].mercari}`,
      `【付属品】${cleanIncludedItems}`,
      cleanNotes ? `【補足】${cleanNotes}` : "",
      ...(cleanAdditionalDescription
        ? ["", `【追加説明】\n${cleanAdditionalDescription}`]
        : []),
      "",
      "商品の状態は写真でもご確認ください。",
      "丁寧に梱包して発送します。",
      closingLine,
    ]
      .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
      .join("\n")
      .trim();

    return {
      title,
      description,
      maxTitleLength: platformSettings[platform].maxTitleLength,
    };
  }, [
    additionalDescription,
    brandModel,
    condition,
    englishBrandModel,
    englishAdditionalDescription,
    englishIncludedItems,
    englishName,
    englishNotes,
    includedItems,
    notes,
    platform,
    productName,
  ]);

  const translationSource = JSON.stringify([
    productName.trim(),
    brandModel.trim(),
    includedItems.trim(),
    notes.trim(),
    additionalDescription.trim(),
  ]);
  const translationNeedsUpdate =
    translatedSource !== "" && translatedSource !== translationSource;

  const translateForEbay = async () => {
    if (!productName.trim()) {
      setFeedback("先に商品名を入力してください");
      return;
    }

    setIsTranslating(true);
    setFeedback("英訳しています...");

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texts: [
            productName,
            brandModel,
            includedItems,
            notes,
            additionalDescription,
          ],
        }),
      });
      const data = (await response.json()) as {
        success?: boolean;
        translations?: string[];
        message?: string;
      };

      if (!response.ok || !data.success || !data.translations) {
        throw new Error(data.message || "英訳できませんでした");
      }

      const [
        translatedName,
        translatedBrand,
        translatedIncluded,
        translatedNotes,
        translatedAdditionalDescription,
      ] = data.translations;
      setEnglishName(translatedName || productName);
      setEnglishBrandModel(translatedBrand || brandModel);
      setEnglishIncludedItems(translatedIncluded || includedItems);
      setEnglishNotes(translatedNotes || notes);
      setEnglishAdditionalDescription(
        translatedAdditionalDescription || additionalDescription
      );
      setTranslatedSource(translationSource);
      setFeedback("英訳できました！内容を確認してコピーしてください");
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "英訳できませんでした。少し待ってからもう一度お試しください"
      );
    } finally {
      setIsTranslating(false);
    }
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback(`${label}をコピーしました！`);
    } catch {
      setFeedback("コピーできませんでした。文章を長押ししてコピーしてください");
    }
  };

  const currentPlatform = platformSettings[platform];
  const numericPrice = Number(price) || 0;
  const numericFeeRate = Math.max(0, Number(feeRate) || 0);
  const numericShippingCost = Math.max(0, Number(shippingCost) || 0);
  const estimatedFee = Math.floor(numericPrice * (numericFeeRate / 100));
  const estimatedReceipt = Math.max(
    0,
    numericPrice - estimatedFee - numericShippingCost
  );

  const combinedListingText = `${output.title}\n\n${output.description}\n\n出品価格：${
    price ? `¥${numericPrice.toLocaleString("ja-JP")}` : "未入力"
  }`;

  const copyAndOpenPlatform = () => {
    window.open(currentPlatform.url, "_blank", "noopener,noreferrer");
    void copyText(
      combinedListingText,
      `出品内容（${currentPlatform.shortLabel}を開きました）`
    );
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-500 via-pink-500 to-orange-400 p-5 text-white shadow-lg sm:p-7">
        <p className="text-sm font-bold text-white/80">1回入力で4つの販売先に対応</p>
        <h2 className="mt-1 text-2xl font-black">✍️ 出品サポート</h2>
        <p className="mt-2 text-sm font-bold text-white/85">
          出品内容をまとめて作り、コピーして各サービスをすぐ開けます
        </p>
      </section>

      {feedback && (
        <p
          role="status"
          className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-800"
        >
          {feedback}
        </p>
      )}

      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-black">販売先</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1 sm:grid-cols-4">
          {(
            Object.entries(platformSettings) as [
              ListingPlatform,
              (typeof platformSettings)[ListingPlatform],
            ][]
          ).map(([value, settings]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setPlatform(value);
                  setFeeRate(String(settings.defaultFeeRate));
                  setFeedback("");
                }}
                className={`min-h-12 rounded-lg px-2 py-3 text-sm font-black ${
                  platform === value
                    ? settings.activeClass
                    : "text-gray-500"
                }`}
              >
                {settings.label}
              </button>
            ))}
        </div>
        <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-800">
          🔒 最後の「出品する」は各サービスで内容を確認して自分で押します
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="listing-product-name" className="mb-2 block font-bold">
              商品名
            </label>
            <input
              id="listing-product-name"
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              placeholder="例：Nintendo Switch 有機ELモデル"
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="listing-brand-model" className="mb-2 block font-bold">
                ブランド・型番
              </label>
              <input
                id="listing-brand-model"
                value={brandModel}
                onChange={(event) => setBrandModel(event.target.value)}
                placeholder="例：Nintendo HEG-001"
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              />
            </div>
            <div>
              <label htmlFor="listing-condition" className="mb-2 block font-bold">
                商品の状態
              </label>
              <select
                id="listing-condition"
                value={condition}
                onChange={(event) => setCondition(event.target.value as ConditionKey)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
              >
                {Object.entries(conditionLabels).map(([value, labels]) => (
                  <option key={value} value={value}>
                    {platform === "ebay" ? labels.ebay : labels.mercari}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="listing-included" className="mb-2 block font-bold">
              付属品
            </label>
            <input
              id="listing-included"
              value={includedItems}
              onChange={(event) => setIncludedItems(event.target.value)}
              placeholder="例：本体、箱、充電器"
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="listing-price" className="mb-2 block font-bold">
                出品価格（円）
              </label>
              <input
                id="listing-price"
                type="number"
                min="0"
                inputMode="numeric"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="例：29800"
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              />
            </div>
            <div>
              <label htmlFor="listing-shipping" className="mb-2 block font-bold">
                送料（円）
              </label>
              <input
                id="listing-shipping"
                type="number"
                min="0"
                inputMode="numeric"
                value={shippingCost}
                onChange={(event) => setShippingCost(event.target.value)}
                placeholder="例：750"
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              />
            </div>
            <div>
              <label htmlFor="listing-fee-rate" className="mb-2 block font-bold">
                販売手数料率（%）
              </label>
              <input
                id="listing-fee-rate"
                type="number"
                min="0"
                step="0.1"
                inputMode="decimal"
                value={feeRate}
                onChange={(event) => setFeeRate(event.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              />
              <p className="mt-1 text-xs text-gray-500">変動する場合は修正OK</p>
            </div>
          </div>

          <div>
              <label htmlFor="listing-notes" className="mb-2 block font-bold">
                傷・動作・補足
              </label>
              <input
                id="listing-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="例：動作確認済み、画面に小傷あり"
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              />
          </div>

          <div>
            <label
              htmlFor="listing-additional-description"
              className="mb-2 block font-bold"
            >
              追加説明（自由入力）
            </label>
            <textarea
              id="listing-additional-description"
              value={additionalDescription}
              onChange={(event) => setAdditionalDescription(event.target.value)}
              rows={4}
              maxLength={400}
              placeholder="例：自宅で大切に保管していました。ペット・喫煙者はいません。"
              className="w-full resize-y rounded-xl border border-gray-300 px-4 py-3"
            />
            <p className="mt-1 text-right text-xs text-gray-500">
              {additionalDescription.length}/400文字
            </p>
          </div>

          {platform === "ebay" && (
            <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-black text-blue-950">🌎 eBay用の英語</h3>
                  <p className="mt-1 text-xs font-bold text-blue-700">
                    日本語の商品情報をまとめて英訳します
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void translateForEbay()}
                  disabled={isTranslating}
                  className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm disabled:cursor-wait disabled:opacity-60"
                >
                  {isTranslating ? "⏳ 英訳中..." : "✨ まとめて自動英訳"}
                </button>
              </div>

              {translationNeedsUpdate && (
                <p className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800">
                  日本語を変更しました。もう一度「自動英訳」を押してください
                </p>
              )}

              <div className="mt-4 space-y-3">
                <div>
                  <label htmlFor="listing-english-name" className="mb-1 block text-sm font-bold text-blue-950">
                    English product name
                  </label>
                  <input
                    id="listing-english-name"
                    value={englishName}
                    onChange={(event) => setEnglishName(event.target.value)}
                    placeholder="Nintendo Switch OLED Model"
                    className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3"
                  />
                </div>
                <div>
                  <label htmlFor="listing-english-brand" className="mb-1 block text-sm font-bold text-blue-950">
                    Brand / Model
                  </label>
                  <input
                    id="listing-english-brand"
                    value={englishBrandModel}
                    onChange={(event) => setEnglishBrandModel(event.target.value)}
                    placeholder="Nintendo HEG-001"
                    className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3"
                  />
                </div>
                <div>
                  <label htmlFor="listing-english-included" className="mb-1 block text-sm font-bold text-blue-950">
                    Included items
                  </label>
                  <input
                    id="listing-english-included"
                    value={englishIncludedItems}
                    onChange={(event) => setEnglishIncludedItems(event.target.value)}
                    placeholder="Console, box, and charger"
                    className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3"
                  />
                </div>
                <div>
                  <label htmlFor="listing-english-notes" className="mb-1 block text-sm font-bold text-blue-950">
                    Notes
                  </label>
                  <input
                    id="listing-english-notes"
                    value={englishNotes}
                    onChange={(event) => setEnglishNotes(event.target.value)}
                    placeholder="Tested and working"
                    className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3"
                  />
                </div>
                <div>
                  <label
                    htmlFor="listing-english-additional-description"
                    className="mb-1 block text-sm font-bold text-blue-950"
                  >
                    Additional description
                  </label>
                  <textarea
                    id="listing-english-additional-description"
                    value={englishAdditionalDescription}
                    onChange={(event) =>
                      setEnglishAdditionalDescription(event.target.value)
                    }
                    rows={4}
                    maxLength={400}
                    placeholder="Carefully stored in a smoke-free and pet-free home."
                    className="w-full resize-y rounded-xl border border-blue-200 bg-white px-4 py-3"
                  />
                </div>
              </div>

              <p className="mt-3 text-xs leading-5 text-blue-700">
                自動英訳後も、英語の欄を自由に修正できます
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-5 text-white shadow-sm sm:p-6">
        <p className="text-sm font-bold text-white/80">売れた時の受取目安</p>
        <p className="mt-1 text-3xl font-black">
          ¥{estimatedReceipt.toLocaleString("ja-JP")}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold">
          <div className="rounded-xl bg-white/15 p-3">
            手数料目安
            <span className="mt-1 block text-lg">−¥{estimatedFee.toLocaleString("ja-JP")}</span>
          </div>
          <div className="rounded-xl bg-white/15 p-3">
            送料
            <span className="mt-1 block text-lg">−¥{numericShippingCost.toLocaleString("ja-JP")}</span>
          </div>
        </div>
        <p className="mt-3 text-xs font-bold text-white/80">
          ※仕入れ代を引く前の金額です。手数料はカテゴリ等で変わる場合があります。
        </p>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black">完成した出品タイトル</h2>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              output.title.length >= output.maxTitleLength
                ? "bg-orange-100 text-orange-700"
                : "bg-violet-50 text-violet-700"
            }`}
          >
            {output.title.length}/{output.maxTitleLength}文字
          </span>
        </div>
        <p className="mt-3 rounded-xl bg-violet-50 p-4 font-bold leading-7 text-violet-950">
          {output.title}
        </p>
        <button
          type="button"
          onClick={() => void copyText(output.title, "タイトル")}
          className="mt-3 w-full rounded-xl bg-violet-600 px-4 py-3 font-black text-white"
        >
          📋 タイトルをコピー
        </button>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-black">完成した商品説明</h2>
        <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-gray-50 p-4 font-sans text-sm leading-7 text-gray-800">
          {output.description}
        </pre>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void copyText(output.description, "商品説明")}
            className="rounded-xl bg-fuchsia-600 px-3 py-3 text-sm font-black text-white"
          >
            📋 説明文をコピー
          </button>
          <button
            type="button"
            onClick={() =>
              void copyText(combinedListingText, "出品内容")
            }
            className="rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-3 py-3 text-sm font-black text-white"
          >
            ✨ 全部コピー
          </button>
        </div>
        <button
          type="button"
          onClick={copyAndOpenPlatform}
          className={`mt-3 w-full rounded-xl px-4 py-4 font-black text-white shadow-sm ${
            platform === "mercari"
              ? "bg-red-500"
              : platform === "rakuma"
                ? "bg-fuchsia-600"
                : platform === "yahoo"
                  ? "bg-blue-600"
                  : "bg-sky-600"
          }`}
        >
          📋 全部コピーして{currentPlatform.shortLabel}を開く
        </button>
        <p className="mt-3 text-center text-xs font-bold text-gray-500">
          開いた出品画面に、コピーした内容を貼り付けて確認してください
        </p>
      </section>
    </div>
  );
}
