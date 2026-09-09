export function exportProfit(input: {
  purchase: number; saleUsd: number; rate: number; shipping: number;
  packing: number; feePercent: number; fixedFeeUsd: number;
}) {
  const values = Object.values(input);
  const valid = values.every(value => Number.isFinite(value) && value >= 0)
    && input.purchase > 0 && input.saleUsd > 0 && input.rate > 0 && input.feePercent < 100;
  if (!valid) return { valid: false, sale: 0, fee: 0, profit: 0 };
  const sale = Math.round(input.saleUsd * input.rate);
  const fee = Math.round(sale * input.feePercent / 100 + input.fixedFeeUsd * input.rate);
  return { valid, sale, fee, profit: sale - fee - input.purchase - input.shipping - input.packing };
}
