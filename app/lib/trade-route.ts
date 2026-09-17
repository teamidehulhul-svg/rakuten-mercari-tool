export type TradePlatform =
  | "rakuten"
  | "ebay"
  | "amazon"
  | "mercari"
  | "yahoo"
  | "rakuma"
  | "base"
  | "other";

export const platformLabels: Record<TradePlatform, string> = {
  rakuten: "楽天",
  ebay: "eBay",
  amazon: "Amazon",
  mercari: "メルカリ",
  yahoo: "Yahoo!・ヤフオク",
  rakuma: "ラクマ",
  base: "BASE",
  other: "その他",
};

export const salesChannelOptions: TradePlatform[] = [
  "mercari",
  "yahoo",
  "ebay",
  "rakuma",
  "base",
  "amazon",
  "other",
];

export const getSalesChannel = (entry: {
  salesChannel?: TradePlatform;
}): TradePlatform => entry.salesChannel || "mercari";
