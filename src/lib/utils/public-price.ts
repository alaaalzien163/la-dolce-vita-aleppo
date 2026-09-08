/**
 * Safe public presentation of a menu item's price and currency.
 *
 * Pure module, no I/O, no server-only marker: both components that use it render
 * server-side, but the functions themselves only transform strings.
 *
 * WHY NOT `Intl.NumberFormat`. A locale formatter inserts grouping separators,
 * changes the digit forms, and can reorder an untrusted currency token in ways we
 * do not control. The requirement here is to display the stored value without
 * altering it, and it is met by formatting the two-decimal value textually and
 * appending the currency code verbatim - no arithmetic, no rounding, no reversal.
 *
 * The known-currency set mirrors the database CHECK constraint for
 * `menu_items.currency` (USD, EUR, SYP). Anything else is treated as absent so an
 * unexpected value cannot render misleading currency text; the price itself is
 * still shown.
 */

/** Currency codes accepted by the public renderer. */
const PUBLIC_CURRENCIES: ReadonlySet<string> = new Set(["USD", "EUR", "SYP"]);

/** Whether a stored currency code is safe to display. */
export function isPublicCurrency(currency: unknown): boolean {
  return typeof currency === "string" && PUBLIC_CURRENCIES.has(currency);
}

/**
 * Renders a price as a two-decimal amount with its currency code,
 * e.g. `12.50 USD`, or the bare amount when the currency is unknown.
 *
 * `null` when the price cannot be shown safely (missing or not a non-negative
 * decimal with at most two places - a corrupted value should not be invented
 * into a number).
 *
 * No arithmetic is performed: the decimal is padded/truncated textually to
 * exactly two places, which reproduces any `numeric(10,2)` value exactly.
 */
export function formatPublicPrice(
  price: number | string | null | undefined,
  currency: unknown,
): string | null {
  if (price === null || price === undefined) {
    return null;
  }

  const raw = String(price).trim();

  if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
    return null;
  }

  const [whole, fraction = ""] = raw.split(".");
  const amount = `${whole}.${fraction.padEnd(2, "0")}`;

  return isPublicCurrency(currency) ? `${amount} ${currency}` : amount;
}
