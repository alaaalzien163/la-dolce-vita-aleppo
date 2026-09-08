import "server-only";

/**
 * Currencies the menu-item form may write to `menu_items.currency`.
 *
 * WHY THIS IS CONFIGURATION AND NOT A CONSTANT. The generated schema types the column as a
 * plain `string` with a database default. Generated types do not carry CHECK constraints, and
 * the publishable key cannot read `information_schema`, so the set of values the database will
 * actually accept is not discoverable from anything in this repository. Hardcoding a guess
 * such as `USD` or `IQD` would either be silently wrong or fail every save against a
 * constraint that disagrees.
 *
 * So the supported set is declared explicitly, once, in the environment:
 *
 *     MENU_ITEM_CURRENCIES=IQD,USD
 *
 * Server-only and deliberately not `NEXT_PUBLIC_*`. Values are used verbatim - no case
 * folding, no trimming beyond the separator - because whatever the database constraint spells
 * is the contract, and normalising could produce a value it does not recognise.
 *
 * WHEN UNSET, THE COLUMN IS NOT WRITTEN AT ALL. The form hides the currency control and the
 * action omits the field, so the database default applies. That is the only behaviour that is
 * correct without knowing the constraint: omitting a column with a default always succeeds,
 * while writing an unverified value might never succeed.
 */

/** Configured currencies, in declaration order. Empty when the column should be left alone. */
export function getSupportedMenuItemCurrencies(): readonly string[] {
  const raw = process.env.MENU_ITEM_CURRENCIES?.trim();

  if (!raw) {
    return [];
  }

  const values = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  // De-duplicated so a careless `IQD,IQD` cannot render two identical options.
  return Array.from(new Set(values));
}

/** Whether the admin may choose a currency at all. */
export function isMenuItemCurrencyConfigured(): boolean {
  return getSupportedMenuItemCurrencies().length > 0;
}
