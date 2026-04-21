export type QuoteLineCalcInput = {
  quantity: number;
  unitPrice: number;
};

export function roundMoney(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function calcLineTotal(input: QuoteLineCalcInput) {
  const quantity = Number(input.quantity || 0);
  const unitPrice = Number(input.unitPrice || 0);
  return roundMoney(quantity * unitPrice);
}

export function calcQuoteSubTotal(
  items: Array<{ quantity: number; unitPrice: number } | { lineTotal: number }>
) {
  return roundMoney(
    items.reduce((sum, item) => {
      if ("lineTotal" in item) return sum + Number(item.lineTotal || 0);
      return sum + calcLineTotal(item);
    }, 0)
  );
}

export function calcQuoteGrandTotal(input: {
  subTotal: number;
  discountPercent?: number | null;
  discountAmount?: number | null;
  shippingFee?: number | null;
  taxPercent?: number | null;
  householdTaxPercent?: number | null;
}) {
  const subTotal = Number(input.subTotal || 0);
  const shippingFee = Number(input.shippingFee || 0);

  const discountAmount =
    input.discountPercent != null
      ? roundMoney(subTotal * (Number(input.discountPercent || 0) / 100))
      : Number(input.discountAmount || 0);

  const afterDiscount = roundMoney(subTotal - discountAmount);

  const taxAmount =
    input.taxPercent != null
      ? roundMoney(afterDiscount * (Number(input.taxPercent || 0) / 100))
      : 0;

  const householdTaxAmount =
    input.householdTaxPercent != null
      ? roundMoney(afterDiscount * (Number(input.householdTaxPercent || 0) / 100))
      : 0;

  const grandTotal = roundMoney(
    afterDiscount + shippingFee + taxAmount + householdTaxAmount
  );

  return {
    subTotal,
    discountAmount,
    taxAmount,
    householdTaxAmount,
    grandTotal,
  };
}