import { NextResponse } from "next/server";
import { translateJapaneseText } from "@/app/lib/translate-ja-en";

const MAX_FIELDS = 5;
const MAX_FIELD_LENGTH = 400;

type TranslateRequest = {
  texts?: unknown;
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
        { success: false, message: "一度に英訳できる項目は5つまでです" },
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

    const translations = await Promise.all(texts.map(translateJapaneseText));

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
