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

type ListingPlatform = "mercari" | "ebay";
type ConditionKey = "new" | "likeNew" | "good" | "fair";

const conditionLabels: Record<ConditionKey, { mercari: string; ebay: string }> = {
  new: { mercari: "新品・未使用", ebay: "New" },
  likeNew: { mercari: "未使用に近い", ebay: "Like New" },
  good: { mercari: "目立った傷や汚れなし", ebay: "Good" },
  fair: { mercari: "傷や汚れあり", ebay: "Acceptable" },
};

const initialPlatform = (draft: ListingDraft | null): ListingPlatform =>
  draft?.salesChannel === "ebay" ? "ebay" : "mercari";

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
  const [notes, setNotes] = useState("");
  const [englishNotes, setEnglishNotes] = useState("");
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

    if (platform === "ebay") {
      const ebayName = englishName.trim() || cleanProductName;
      const ebayBrandModel = englishBrandModel.trim() || cleanBrandModel;
      const ebayIncludedItems =
        englishIncludedItems.trim() || cleanIncludedItems;
      const ebayNotes = englishNotes.trim() || cleanNotes;
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
        "",
        "Please check the photos carefully for the actual condition.",
        "The item will be packed carefully for shipping from Japan.",
      ]
        .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
        .join("\n")
        .trim();

      return { title, description, maxTitleLength: 80 };
    }

    const title = [cleanBrandModel, cleanProductName]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 40);
    const description = [
      "ご覧いただきありがとうございます。",
      "",
      `【商品名】${cleanProductName}`,
      cleanBrandModel ? `【ブランド・型番】${cleanBrandModel}` : "",
      `【状態】${conditionLabels[condition].mercari}`,
      `【付属品】${cleanIncludedItems}`,
      cleanNotes ? `【補足】${cleanNotes}` : "",
      "",
      "商品の状態は写真でもご確認ください。",
      "丁寧に梱包して発送します。",
      "即購入OKです！",
    ]
      .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
      .join("\n")
      .trim();

    return { title, description, maxTitleLength: 40 };
  }, [
    brandModel,
    condition,
    englishBrandModel,
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
          texts: [productName, brandModel, includedItems, notes],
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

      const [translatedName, translatedBrand, translatedIncluded, translatedNotes] =
        data.translations;
      setEnglishName(translatedName || productName);
      setEnglishBrandModel(translatedBrand || brandModel);
      setEnglishIncludedItems(translatedIncluded || includedItems);
      setEnglishNotes(translatedNotes || notes);
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

  const formattedPrice = price
    ? `¥${Number(price || 0).toLocaleString("ja-JP")}`
    : "未入力";

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-500 via-pink-500 to-orange-400 p-5 text-white shadow-lg sm:p-7">
        <p className="text-sm font-bold text-white/80">月額0円で使える</p>
        <h2 className="mt-1 text-2xl font-black">✍️ 出品サポート</h2>
        <p className="mt-2 text-sm font-bold text-white/85">
          入力した商品情報から、タイトルと説明文をすぐ作成します
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
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
          {(
            [
              ["mercari", "🔴 メルカリ"],
              ["ebay", "🌎 eBay"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setPlatform(value);
                setFeedback("");
              }}
              className={`rounded-lg px-3 py-3 font-black ${
                platform === value
                  ? "bg-white text-violet-700 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

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

          <div className="grid gap-4 sm:grid-cols-2">
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
              </div>

              <p className="mt-3 text-xs leading-5 text-blue-700">
                自動英訳後も、英語の欄を自由に修正できます
              </p>
            </div>
          )}
        </div>
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
              void copyText(
                `${output.title}\n\n${output.description}\n\n出品価格：${formattedPrice}`,
                "出品内容"
              )
            }
            className="rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-3 py-3 text-sm font-black text-white"
          >
            ✨ 全部コピー
          </button>
        </div>
      </section>
    </div>
  );
}
