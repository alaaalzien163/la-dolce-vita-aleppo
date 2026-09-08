import { revalidatePath } from "next/cache";

/**
 * Public route revalidation, scoped per content type.
 *
 * Every public page is a statically prerendered document in each locale, so a
 * content change must invalidate exactly the pages whose rows it touched - never
 * the whole site. Each helper below revalidates the homepage plus the dedicated
 * page the content type feeds:
 *
 *   - sections    → homepage + `/departments` (Departments band + Departments page)
 *   - menu chain  → homepage + `/menu`
 *   - site settings → every public page (the footer/contact render them all)
 *
 * The home route is included for menu changes too: the homepage Menu preview
 * describes that content, so a stale homepage would mislead even though the heavy
 * data lives on the dedicated page.
 */

const LOCALES = ["ar", "en"] as const;

function revalidateSuffixes(suffixes: readonly string[]): void {
  for (const locale of LOCALES) {
    for (const suffix of suffixes) {
      revalidatePath(`/${locale}${suffix}`);
    }
  }
}

/** Homepage previews and the section behind the site chrome. */
export function revalidatePublicHome(): void {
  revalidateSuffixes([""]);
}

/** Homepage + the dedicated Departments page. */
export function revalidatePublicDepartments(): void {
  revalidateSuffixes(["", "/departments"]);
}

/** Homepage + the dedicated Menu page. */
export function revalidatePublicMenu(): void {
  revalidateSuffixes(["", "/menu"]);
}

/** Every public page - used when the shared chrome content changes. */
export function revalidateAllPublic(): void {
  revalidateSuffixes(["", "/departments", "/menu"]);
}
