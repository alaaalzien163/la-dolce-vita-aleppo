/**
 * Entry point to the admin area from the public site.
 *
 * The site logo links here. That is intentional and it is the whole of the
 * discoverability story: there is no "Admin" item in the navigation, no link in the
 * footer text, and nothing in the sitemap. One private tool, one existing account, and
 * an entrance that a visitor has no reason to try.
 *
 * IT IS NOT A SECURITY MEASURE. Anyone can type `/admin`. The proxy rejects requests
 * without a verified session, and `requireAdmin()` rejects sessions whose
 * `profiles.role` is not `admin`, which is where access is actually decided. This
 * constant only keeps the entrance quiet.
 *
 * KNOWN TRADE-OFF. A logo conventionally returns to the home page, so this surprises
 * visitors and, more importantly, makes the link's purpose unclear to a screen reader:
 * it announces the site name but navigates to a sign-in form. If that matters more than
 * the quiet entrance, the better arrangement is a logo that points at `#home` and a
 * discreet, properly labelled sign-in link in the footer. That is a one-line change
 * here plus a footer link, and no other code moves.
 */
export const ADMIN_ENTRY_HREF = "/admin/login";

/**
 * The `public.profiles.role` value that grants access to the dashboard.
 *
 * A constant so the comparison appears once, not as a bare string literal in each
 * guard. It is not a source of authority: the row in the database is, and this only
 * names the value being looked for.
 *
 * The generated schema types `profiles.role` as a plain `string`, so a typo here would
 * compile. If the column is ever migrated to an enum, replace this with
 * `Database["public"]["Enums"][…]` and the compiler will start catching that.
 */
export const ADMIN_ROLE = "admin";
