import { NextResponse } from "next/server";
import {
  createEbayResearchQuery,
  createEbayResearchUrlFromQuery,
} from "@/app/lib/ebay-research";
import { translateJapaneseText } from "@/app/lib/translate-ja-en";

const MAX_TITLE_LENGTH = 400;
const JAPANESE_TEXT = /[\u3040-\u30ff\u3400-\u9fff]/;
const DIRECT_QUERIES = new Map([
  ["漫画", "Manga"],
  ["コミック", "Manga"],
]);

const optimizeTranslatedQuery = (source: string, translated: string) => {
  let query = translated.trim();

  if (/漫画|コミック/.test(source)) {
    query = query.replace(/\b(?:comic books?|comics?|cartoons?)\b/gi, "Manga");
  }

  return query;
};

export async function GET(request: Request) {
  const title = new URL(request.url).searchParams.get("title")?.trim() || "";

  if (!title || title.length > MAX_TITLE_LENGTH) {
    return NextResponse.json(
      { success: false, message: "400文字以内の商品名を入力してください" },
      { status: 400 }
    );
  }

  const directQuery = DIRECT_QUERIES.get(title);
  let researchQuery = directQuery || createEbayResearchQuery(title);

  if (!directQuery && JAPANESE_TEXT.test(title)) {
    try {
      const translated = await translateJapaneseText(title);
      researchQuery = optimizeTranslatedQuery(title, translated) || researchQuery;
    } catch (error) {
      console.warn("eBay research translation unavailable; using fallback:", error);
    }
  }

  return NextResponse.redirect(
    createEbayResearchUrlFromQuery(researchQuery),
    307
  );
}
