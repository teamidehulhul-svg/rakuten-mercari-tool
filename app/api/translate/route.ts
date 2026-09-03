import { NextResponse } from "next/server";

const MYMEMORY_ENDPOINT = "https://api.mymemory.translated.net/get";
const MAX_FIELDS = 4;
const MAX_FIELD_LENGTH = 400;
const MAX_SEGMENT_BYTES = 450;

type TranslateRequest = {
  texts?: unknown;
};

type MyMemoryResponse = {
  responseData?: {
    translatedText?: string;
  };
  responseStatus?: number | string;
  responseDetails?: string;
};

const normalizeTranslation = (value: string) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

const translateSegment = async (text: string) => {
  const url = new URL(MYMEMORY_ENDPOINT);
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", "ja|en");
  url.searchParams.set("mt", "1");

  if (process.env.MYMEMORY_EMAIL) {
    url.searchParams.set("de", process.env.MYMEMORY_EMAIL);
  }

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await response.json()) as MyMemoryResponse;

  if (
    !response.ok ||
    Number(data.responseStatus || response.status) !== 200 ||
    !data.responseData?.translatedText
  ) {
    throw new Error(data.responseDetails || "翻訳サービスから応答がありませんでした");
  }

  return normalizeTranslation(data.responseData.translatedText);
};

const splitByByteLength = (text: string) => {
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  let current = "";

  for (const character of text) {
    if (encoder.encode(current + character).length > MAX_SEGMENT_BYTES) {
      if (current) chunks.push(current);
      current = character;
    } else {
      current += character;
    }
  }

  if (current) chunks.push(current);
  return chunks;
};

const translateText = async (text: string) => {
  const cleanText = text.trim();
  if (!cleanText) return "";

  const translatedChunks = await Promise.all(
    splitByByteLength(cleanText).map(translateSegment)
  );
  return translatedChunks.join(" ");
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TranslateRequest;

    if (!Array.isArray(body.texts) || body.texts.length === 0) {
      return NextResponse.json(
        { success: false, message: "英訳する文章を入力してください" },
        { status: 400 }
      );
    }

    if (body.texts.length > MAX_FIELDS) {
      return NextResponse.json(
        { success: false, message: "一度に英訳できる項目は4つまでです" },
        { status: 400 }
      );
    }

    const texts = body.texts.map((value) =>
      typeof value === "string" ? value.trim() : ""
    );

    if (texts.some((value) => value.length > MAX_FIELD_LENGTH)) {
      return NextResponse.json(
        { success: false, message: "1項目は400文字以内で入力してください" },
        { status: 400 }
      );
    }

    const translations = await Promise.all(texts.map(translateText));

    return NextResponse.json({ success: true, translations });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "TimeoutError"
        ? "英訳に時間がかかっています。少し待ってからもう一度お試しください"
        : "現在、英訳サービスを利用できません。少し待ってからもう一度お試しください";

    console.error("Translation API error:", error);
    return NextResponse.json({ success: false, message }, { status: 503 });
  }
}
