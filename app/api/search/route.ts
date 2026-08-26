import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
   const { searchParams } = new URL(request.url);
const keyword = searchParams.get("keyword");
const page = searchParams.get("page") || "1";

    if (!keyword) {
      return NextResponse.json(
        {
          success: false,
          message: "検索キーワードを入力してください",
        },
        { status: 400 }
      );
    }

    const applicationId = process.env.RAKUTEN_APPLICATION_ID;
    const accessKey = process.env.RAKUTEN_ACCESS_KEY;

    if (!applicationId || !accessKey) {
      return NextResponse.json(
        {
          success: false,
          message: "楽天APIのキーが設定されていません",
        },
        { status: 500 }
      );
    }

    const apiUrl = new URL(
      "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701"
    );

    apiUrl.searchParams.set("format", "json");
    apiUrl.searchParams.set("applicationId", applicationId);
    apiUrl.searchParams.set("accessKey", accessKey);
    apiUrl.searchParams.set("keyword", keyword);
   apiUrl.searchParams.set("hits", "30");
apiUrl.searchParams.set("page", page);
apiUrl.searchParams.set("imageFlag", "1");
const response = await fetch(apiUrl.toString(), {
  cache: "no-store",
  headers: {
    Referer: "https://rakuten-mercari-tool.vercel.app/",
    Origin: "https://rakuten-mercari-tool.vercel.app",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  },
});
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "楽天APIでエラーが発生しました",
          error: data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      count: data.count ?? 0,
      items: data.Items ?? [],
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "楽天検索中にエラーが発生しました",
      },
      { status: 500 }
    );
  }
}