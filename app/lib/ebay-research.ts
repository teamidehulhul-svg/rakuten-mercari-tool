const researchKeywordRules: Array<[RegExp, string]> = [
  [/シルバニア/, "Sylvanian Families"],
  [/ハローキティ|キティ/, "Hello Kitty"],
  [/ポケモンカード|ポケカ/, "Pokemon Card"],
  [/ポケモン|pokemon/i, "Pokemon"],
  [/ゲームボーイアドバンス/, "Nintendo Game Boy Advance"],
  [/ゲームボーイ/, "Nintendo Game Boy"],
  [/ニンテンドースイッチ|任天堂スイッチ/, "Nintendo Switch"],
  [/プレイステーション|プレステ/, "PlayStation"],
  [/スーパーファミコン/, "Super Famicom"],
  [/ファミコン/, "Nintendo Famicom"],
  [/パール|真珠/, "Pearl"],
  [/ネックレス/, "Necklace"],
  [/イヤリング/, "Earrings"],
  [/ピアス/, "Pierced Earrings"],
  [/財布|ウォレット/, "Wallet"],
  [/バッグ|かばん|鞄/, "Bag"],
  [/ポーチ/, "Pouch"],
  [/腕時計|時計/, "Watch"],
  [/カメラ/, "Camera"],
  [/フィギュア/, "Figure"],
  [/ぬいぐるみ/, "Plush"],
  [/包丁/, "Kitchen Knife"],
  [/箸/, "Chopsticks"],
  [/着物/, "Kimono"],
  [/本革|牛革|レザー/, "Leather"],
];

export const createEbayResearchQuery = (title: string) => {
  const cleanedTitle = title
    .replace(/[【】［］＜＞「」『』!！★☆]/g, " ")
    .replace(/送料無料|在庫あり|特価|sale|セール/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const terms = researchKeywordRules
    .filter(([pattern]) => pattern.test(cleanedTitle))
    .map(([, english]) => english);
  const uniqueTerms = Array.from(new Set(terms));

  if (/日本製|国産|made in japan/i.test(cleanedTitle)) {
    uniqueTerms.unshift("Japanese");
  }

  if (uniqueTerms.length > 0) return uniqueTerms.slice(0, 4).join(" ");

  const asciiTerms = cleanedTitle
    .replace(/[^\x20-\x7E]/g, " ")
    .split(/\s+/)
    .filter((term) => /[A-Za-z0-9]/.test(term))
    .slice(0, 8)
    .join(" ");

  return asciiTerms || cleanedTitle.slice(0, 80);
};

export const createEbayResearchUrl = (title: string) => {
  const params = new URLSearchParams({
    marketplace: "EBAY-US",
    keywords: createEbayResearchQuery(title),
    dayRange: "365",
    categoryId: "0",
    offset: "0",
    limit: "50",
    tabName: "SOLD",
    tz: "Asia/Tokyo",
  });

  return `https://www.ebay.com/sh/research?${params.toString()}`;
};
