import "server-only";

const MYMEMORY_ENDPOINT = "https://api.mymemory.translated.net/get";
const MAX_SEGMENT_BYTES = 450;

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

export const translateJapaneseText = async (text: string) => {
  const cleanText = text.trim();
  if (!cleanText) return "";

  const translatedChunks = await Promise.all(
    splitByByteLength(cleanText).map(translateSegment)
  );
  return translatedChunks.join(" ");
};
