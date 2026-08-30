import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword");
    const requestedPages = Math.min(
      10,
      Math.max(1, Math.floor(Number(searchParams.get("pages")) || 1))
    );
    const requestedCount = requestedPages * 30;

    if (!keyword) {
      return NextResponse.json(
        {
          success: false,
          message: "検索キーワードを入力してください",
        },
        { status: 400 }
      );
    }

    const clientId = process.env.EBAY_CLIENT_ID;
    const clientSecret = process.env.EBAY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          success: false,
          message: "eBay APIキーが設定されていません",
        },
        { status: 500 }
      );
    }

    // eBay OAuth用の認証文字列を作成
    const credentials = Buffer.from(
      `${clientId}:${clientSecret}`
    ).toString("base64");

    // Application Access Tokenを取得
    const tokenResponse = await fetch(
      "https://api.ebay.com/identity/v1/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
          Authorization: `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          scope:
            "https://api.ebay.com/oauth/api_scope",
        }),
        cache: "no-store",
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            "eBayアクセストークンの取得に失敗しました",
          error: tokenData,
        },
        { status: tokenResponse.status }
      );
    }

    const accessToken = tokenData.access_token;

    // eBay Browse APIは1回あたり最大200件なので、
    // 300件指定時だけ複数回に分けて取得する。
    const batches: { limit: number; offset: number }[] = [];

    for (let offset = 0; offset < requestedCount; offset += 200) {
      batches.push({
        limit: Math.min(200, requestedCount - offset),
        offset,
      });
    }

    const batchResults = await Promise.all(
      batches.map(async ({ limit, offset }) => {
        const ebayUrl = new URL(
          "https://api.ebay.com/buy/browse/v1/item_summary/search"
        );

        ebayUrl.searchParams.set("q", keyword);
        ebayUrl.searchParams.set("limit", String(limit));
        ebayUrl.searchParams.set("offset", String(offset));

        const ebayResponse = await fetch(ebayUrl.toString(), {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
            Accept: "application/json",
          },
          cache: "no-store",
        });

        const ebayData = await ebayResponse.json();

        if (!ebayResponse.ok) {
          throw new Error(
            ebayData?.errors?.[0]?.message ||
              "eBayの商品検索に失敗しました"
          );
        }

        return ebayData;
      })
    );

    const total = batchResults[0]?.total ?? 0;
    const items = Array.from(
      new Map(
        batchResults
          .flatMap((result) => result.itemSummaries ?? [])
          .map((item) => [item.itemId, item])
      ).values()
    ).slice(0, requestedCount);

    return NextResponse.json({
      success: true,
      total,
      count: items.length,
      requestedCount,
      items,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "eBay検索中にエラーが発生しました",
      },
      { status: 500 }
    );
  }
}
