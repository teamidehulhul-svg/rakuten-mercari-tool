export type TradePlatform =
  | "rakuten"
  | "ebay"
  | "amazon"
  | "mercari"
  | "yahoo"
  | "other";

export const platformLabels: Record<TradePlatform, string> = {
  rakuten: "楽天",
  ebay: "eBay",
  amazon: "Amazon",
  mercari: "メルカリ",
  yahoo: "Yahoo!・ヤフオク",
  other: "その他",
};

export const getSalesChannel = (entry: {
  salesChannel?: TradePlatform;
}): TradePlatform => entry.salesChannel || "mercari";
