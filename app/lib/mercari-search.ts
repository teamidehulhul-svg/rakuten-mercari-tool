export type MercariPriceOrder = "asc" | "desc";

export const createMercariSearchUrl = (
  value: string,
  options?: { soldOnly?: boolean; order?: MercariPriceOrder }
) => {
  const query = value.trim();

  if (!query) return "";

  const params = new URLSearchParams({ keyword: query });

  if (options?.soldOnly) params.set("status", "sold_out");
  if (options?.order) {
    params.set("sort", "price");
    params.set("order", options.order);
  }

  return `https://jp.mercari.com/search?${params.toString()}`;
};
