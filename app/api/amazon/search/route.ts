import { NextRequest, NextResponse } from "next/server";

const AMAZON_JP_MARKETPLACE_ID = "A1VC38T7YXB528";
const AMAZON_FE_ENDPOINT = "https://sellingpartnerapi-fe.amazon.com";
const AMAZON_LWA_TOKEN_ENDPOINT = "https://api.amazon.com/auth/o2/token";

type AmazonCatalogItem = {
  asin?: string;
  summaries?: Array<{
    marketplaceId?: string;
    itemName?: string;
    brand?: string;
    manufacturer?: string;
    modelNumber?: string;
  }>;
  images?: Array<{
    marketplaceId?: string;
    images?: Array<{
      variant?: string;
      link?: string;
      height?: number;
      width?: number;
    }>;
  }>;
  productTypes?: Array<{
    marketplaceId?: string;
    productType?: string;
  }>;
  salesRanks?: Array<{
    marketplaceId?: string;
    classificationRanks?: Array<{ title?: string; rank?: number }>;
    displayGroupRanks?: Array<{ title?: string; rank?: number }>;
  }>;
};

type CatalogResponse = {
  numberOfResults?: number;
  items?: AmazonCatalogItem[];
  pagination?: { nextToken?: string };
  errors?: Array<{ code?: string; message?: string; details?: string }>;
};

const detectIdentifierType = (keyword: string) => {
  if (/^\d{13}$/.test(keyword)) return "JAN";
  if (/^\d{14}$/.test(keyword)) return "GTIN";
  if (/^\d{12}$/.test(keyword)) return "UPC";
  if (/^\d{8}$/.test(keyword)) return "EAN";
  if (/^\d{10}$/.test(keyword)) return "ISBN";
  if (/^[A-Z0-9]{10}$/i.test(keyword)) return "ASIN";
  return null;
};

const getLwaAccessToken = async () => {
  const clientId = process.env.AMAZON_SP_API_CLIENT_ID;
  const clientSecret = process.env.AMAZON_SP_API_CLIENT_SECRET;
  const refreshToken = process.env.AMAZON_SP_API_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const response = await fetch(AMAZON_LWA_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });
  const data = (await response.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || "Amazon認証に失敗しました"
    );
  }

  return data.access_token;
};

const normalizeCatalogItem = (item: AmazonCatalogItem) => {
  const summary =
    item.summaries?.find(
      (entry) => entry.marketplaceId === AMAZON_JP_MARKETPLACE_ID
    ) || item.summaries?.[0];
  const imageSet =
    item.images?.find(
      (entry) => entry.marketplaceId === AMAZON_JP_MARKETPLACE_ID
    ) || item.images?.[0];
  const image =
    imageSet?.images?.find((entry) => entry.variant === "MAIN") ||
    imageSet?.images?.[0];
  const salesRankSet =
    item.salesRanks?.find(
      (entry) => entry.marketplaceId === AMAZON_JP_MARKETPLACE_ID
    ) || item.salesRanks?.[0];
  const salesRank =
    salesRankSet?.displayGroupRanks?.[0] ||
    salesRankSet?.classificationRanks?.[0];
  const productType =
    item.productTypes?.find(
      (entry) => entry.marketplaceId === AMAZON_JP_MARKETPLACE_ID
    ) || item.productTypes?.[0];

  return {
    asin: item.asin || "",
    title: summary?.itemName || item.asin || "Amazon商品",
    brand: summary?.brand || summary?.manufacturer || "",
    modelNumber: summary?.modelNumber || "",
    imageUrl: image?.link || "",
    imageWidth: image?.width || 500,
    imageHeight: image?.height || 500,
    productType: productType?.productType || "",
    salesRank: salesRank?.rank || null,
    salesRankTitle: salesRank?.title || "",
    itemUrl: item.asin ? `https://www.amazon.co.jp/dp/${item.asin}` : "",
  };
};

export async function GET(request: NextRequest) {
  try {
    const keyword = request.nextUrl.searchParams.get("keyword")?.trim() || "";
    const requestedCount = Math.min(
      300,
      Math.max(
        1,
        Math.floor(Number(request.nextUrl.searchParams.get("count")) || 30)
      )
    );

    if (!keyword) {
      return NextResponse.json(
        { success: false, message: "Amazonで検索する商品名を入力してください" },
        { status: 400 }
      );
    }

    const accessToken = await getLwaAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          configRequired: true,
          message: "Amazon検索を使うにはSP-APIの3つのキーを設定してください",
        },
        { status: 503 }
      );
    }

    const identifierType = detectIdentifierType(keyword);
    const collectedItems: AmazonCatalogItem[] = [];
    let nextToken = "";
    let total = 0;

    do {
      const apiUrl = new URL(
        "/catalog/2022-04-01/items",
        AMAZON_FE_ENDPOINT
      );

      apiUrl.searchParams.set("marketplaceIds", AMAZON_JP_MARKETPLACE_ID);
      apiUrl.searchParams.set(
        "includedData",
        "summaries,images,productTypes,salesRanks"
      );
      apiUrl.searchParams.set("locale", "ja_JP");
      apiUrl.searchParams.set(
        "pageSize",
        String(Math.min(20, requestedCount - collectedItems.length))
      );

      if (identifierType) {
        apiUrl.searchParams.set("identifiers", keyword);
        apiUrl.searchParams.set("identifiersType", identifierType);
      } else {
        apiUrl.searchParams.set("keywords", keyword);
        apiUrl.searchParams.set("keywordsLocale", "ja_JP");
      }

      if (nextToken) {
        apiUrl.searchParams.set("pageToken", nextToken);
      }

      const amazonResponse = await fetch(apiUrl, {
        headers: {
          Accept: "application/json",
          "x-amz-access-token": accessToken,
        },
        cache: "no-store",
      });
      const amazonData = (await amazonResponse.json()) as CatalogResponse;

      if (!amazonResponse.ok) {
        return NextResponse.json(
          {
            success: false,
            message:
              amazonData.errors?.[0]?.message ||
              "Amazonの商品検索に失敗しました",
          },
          { status: amazonResponse.status }
        );
      }

      collectedItems.push(...(amazonData.items || []));
      total = amazonData.numberOfResults ?? total;
      nextToken = identifierType ? "" : amazonData.pagination?.nextToken || "";

      if (nextToken && collectedItems.length < requestedCount) {
        await new Promise((resolve) => setTimeout(resolve, 550));
      }
    } while (nextToken && collectedItems.length < requestedCount);

    const uniqueItems = Array.from(
      new Map(
        collectedItems
          .filter((item) => item.asin)
          .map((item) => [item.asin as string, item])
      ).values()
    ).slice(0, requestedCount);

    return NextResponse.json({
      success: true,
      total,
      count: uniqueItems.length,
      requestedCount,
      items: uniqueItems.map(normalizeCatalogItem),
    });
  } catch (error) {
    console.error("Amazon catalog search failed", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Amazon検索中にエラーが発生しました",
      },
      { status: 500 }
    );
  }
}
