import type { TableRow } from "@/lib/supabase/tables";

/**
 * Domain shapes consumed by the public site.
 *
 * These are deliberately narrower than the generated database rows. A component
 * that needs a department should not be able to reach `is_active`, `created_at`, or
 * any other column that carries no presentational meaning - if the UI can read a
 * visibility flag, sooner or later it will start filtering on it and quietly
 * diverge from RLS. Field types are derived from the generated schema rather than
 * restated, so a column type changing upstream breaks this file instead of silently
 * mismatching.
 *
 * Type-only module: no runtime import, safe from either a Server or Client
 * Component.
 */

type SectionRow = TableRow<"sections">;
type SectionImageRow = TableRow<"section_images">;
type SiteSettingsRow = TableRow<"site_settings">;
type StudioInfoRow = TableRow<"studio_info">;
type VenueRow = TableRow<"venues">;
type MenuRow = TableRow<"menus">;
type MenuMainCategoryRow = TableRow<"menu_main_categories">;
type MenuCategoryRow = TableRow<"menu_categories">;
type MenuItemRow = TableRow<"menu_items">;

/**
 * A public "Department" - the homepage concept backed by `public.sections`, the
 * root of the sections -> venues -> menus hierarchy.
 *
 * `is_active` is intentionally absent. Visibility is decided by RLS and by the
 * query in `src/lib/data/sections.ts`; re-exposing it here would invite the UI to
 * make its own visibility decisions.
 *
 * `slug` is present because this model is also the section node of the menu tree
 * (`PublicSectionWithVenues`), whose browse links need it. The homepage itself
 * never prints it - see `PublicDepartment`.
 */
export type Department = {
  readonly id: SectionRow["id"];
  readonly name: SectionRow["name"];
  readonly slug: SectionRow["slug"];
  readonly description: SectionRow["description"];
  readonly imageUrl: SectionRow["image_url"];
  readonly displayOrder: SectionRow["display_order"];
};

/**
 * The homepage's Departments band and the `/departments` list.
 *
 * `Department` minus nothing the card prints: the card now links through to the
 * department's detail page, so `slug` is carried on both surfaces - homepage
 * preview and full list - and the old exclusion (slug was only useful to the menu
 * tree) no longer applies. `is_active` is intentionally still absent.
 *
 * `previewImageUrl` is the visual a list card shows: the department's first active
 * `section_images` row when one exists, falling back to the legacy
 * `sections.image_url` single image, then `null`. Never a broken image.
 */
export type PublicDepartment = {
  readonly id: Department["id"];
  readonly name: Department["name"];
  readonly slug: Department["slug"];
  readonly description: Department["description"];
  readonly imageUrl: Department["imageUrl"];
  readonly previewImageUrl: string | null;
  readonly displayOrder: Department["displayOrder"];
};

/**
 * The kind of media a Department carousel slide can render.
 */
export type DepartmentMediaType = "image" | "video";

/**
 * One public media item of a Department, from `public.section_images`.
 *
 * Each media item is one row, discriminated by `media_type`: an image carries its
 * URL in the (schema-named) `image_url` column; a video carries its asset path
 * there too and, when present, points `poster_url` at a still image. Deliberately
 * narrowed to the columns a carousel slide can honestly render - an `id` for React
 * keys, the `media_type` discriminator, the media URL, the `alt_text` label, and
 * the optional poster. `is_active` is absent because visibility is decided by RLS
 * and the query in `src/lib/data/section-media.ts`, never by the UI; `display_order`
 * is consumed by the query, not shipped to the component; timestamps carry no
 * presentational meaning. `alt_text` stays nullable so the consumer can fall back
 * to the department's own name - the same precedent `DepartmentCard` already sets.
 */
export type PublicSectionMedia = {
  readonly id: SectionImageRow["id"];
  readonly mediaType: DepartmentMediaType;
  readonly mediaUrl: SectionImageRow["image_url"];
  readonly altText: SectionImageRow["alt_text"];
  readonly posterUrl: SectionImageRow["poster_url"];
};

/**
 * Contact and social details, from the `public.site_settings` singleton.
 *
 * Deliberately narrowed to the five fields a public component actually renders -
 * Contact lists them and the footer follows Instagram. Site identity was
 * intentionally not carried over: the header and footer display the localized
 * catalogue name, never the single-language database `site_name`, so fetching it
 * (or `tagline`, `logo_url`, `favicon_url`, or the unobserved `opening_hours`
 * JSON) would ship bytes no visitor sees.
 *
 * Every field is nullable in the database and null in the published row, so the
 * UI must treat all of it as absent-by-default and omit the corresponding element
 * rather than render an empty label.
 */
export type SiteSettings = {
  readonly phone: SiteSettingsRow["phone"];
  readonly email: SiteSettingsRow["email"];
  readonly address: SiteSettingsRow["address"];
  readonly googleMapsUrl: SiteSettingsRow["google_maps_url"];
  readonly instagramUrl: SiteSettingsRow["instagram_url"];
};

/**
 * Public About copy, from the `public.studio_info` singleton.
 *
 * Exposed only because anon SELECT on `studio_info` returns HTTP 200 (a valid
 * public read policy exists) - were that probe to fail, this type would not be
 * published. Only the fields the About band can honestly render are brought out:
 * no `is_active`, no timestamps, and no contact/social columns that no section
 * displays. Every text field except `title` is nullable in the database, so the
 * UI must omit any of them that are absent rather than render an empty label,
 * and must never fall back to invented copy.
 */
export type PublicStudioInfo = {
  readonly id: StudioInfoRow["id"];
  readonly title: StudioInfoRow["title"];
  readonly shortDescription: StudioInfoRow["short_description"];
  readonly description: StudioInfoRow["description"];
  readonly heroImageUrl: StudioInfoRow["hero_image_url"];
};

/**
 * Public menu view models.
 *
 * Same discipline as `Department` and `SiteSettings`: derived from the generated
 * schema with `Pick`, and stripped of anything a visitor should not see or should
 * not need (`is_active`, `created_at`, `updated_at`). Visibility is decided solely
 * by RLS plus the active/available filters in the public data modules; re-exposing
 * a flag here would invite the UI to make its own visibility decisions.
 *
 * These models describe the four menu tables that feed the menu surfaces. They
 * exist so the data layer is the single place those surfaces connect to.
 */

/** A public venue, the `sections -> venues` hop. */
export type PublicVenue = {
  readonly id: VenueRow["id"];
  readonly sectionId: VenueRow["section_id"];
  readonly name: VenueRow["name"];
  readonly slug: VenueRow["slug"];
  readonly description: VenueRow["description"];
  readonly displayOrder: VenueRow["display_order"];
};

/** A public menu, the `venues -> menus` hop. */
export type PublicMenu = {
  readonly id: MenuRow["id"];
  readonly venueId: MenuRow["venue_id"];
  readonly name: MenuRow["name"];
  readonly slug: MenuRow["slug"];
  readonly description: MenuRow["description"];
  readonly displayOrder: MenuRow["display_order"];
};

/** A public main category, the `menus -> menu_main_categories` hop. */
export type PublicMenuMainCategory = {
  readonly id: MenuMainCategoryRow["id"];
  readonly menuId: MenuMainCategoryRow["menu_id"];
  readonly name: MenuMainCategoryRow["name"];
  readonly slug: MenuMainCategoryRow["slug"];
  readonly description: MenuMainCategoryRow["description"];
  readonly displayOrder: MenuMainCategoryRow["display_order"];
};

/** A public menu category, the `menu_main_categories -> menu_categories` hop. */
export type PublicMenuCategory = {
  readonly id: MenuCategoryRow["id"];
  readonly mainCategoryId: MenuCategoryRow["main_category_id"];
  readonly name: MenuCategoryRow["name"];
  readonly slug: MenuCategoryRow["slug"];
  readonly description: MenuCategoryRow["description"];
  readonly displayOrder: MenuCategoryRow["display_order"];
};

/**
 * A public menu item.
 *
 * `is_available`, not `is_active`: the table has no `is_active` column, and whether
 * an item is sold is an availability decision, not a publish decision. `is_featured`
 * is carried for a future highlighting UI but no section invents one yet.
 */
export type PublicMenuItem = {
  readonly id: MenuItemRow["id"];
  readonly categoryId: MenuItemRow["category_id"];
  readonly name: MenuItemRow["name"];
  readonly description: MenuItemRow["description"];
  readonly price: MenuItemRow["price"];
  readonly currency: MenuItemRow["currency"];
  readonly displayOrder: MenuItemRow["display_order"];
  readonly imageUrl: MenuItemRow["image_url"];
  readonly isFeatured: MenuItemRow["is_featured"];
};

/** A venue with its active menus, for the browse tree. */
export type PublicVenueWithMenus = PublicVenue & {
  readonly menus: readonly PublicMenuWithMainCategories[];
};

/** A menu with its active main categories, for the browse tree. */
export type PublicMenuWithMainCategories = PublicMenu & {
  readonly mainCategories: readonly PublicMainCategoryWithCategories[];
};

/** A main category with its active categories, for the browse tree. */
export type PublicMainCategoryWithCategories = PublicMenuMainCategory & {
  readonly categories: readonly PublicMenuCategoryWithItems[];
};

/** A menu category with its available items, for the browse tree. */
export type PublicMenuCategoryWithItems = PublicMenuCategory & {
  readonly items: readonly PublicMenuItem[];
};

/** A section (Department) with its active venues, for the browse tree. */
export type PublicSectionWithVenues = Department & {
  readonly venues: readonly PublicVenueWithMenus[];
};

/**
 * The full public menu hierarchy, from active sections down to available items.
 *
 * `sections` reuses `Department` - the same table feeds the homepage's Departments
 * band - so the two presentations cannot disagree about what a section is.
 */
export type PublicMenuTree = {
  readonly sections: readonly PublicSectionWithVenues[];
};

/**
 * The homepage Menu band, rooted at active venues.
 *
 * Narrower than the full tree: it starts at venues because the band's structural
 * unit is a venue's menus, and Section rows are already loaded for the Departments
 * band on the same page, so re-reading them here would fetch the same rows twice.
 * The venues are `PublicVenueWithMenus` - the same nested venue shape the tree
 * builds, so the band and a future browse page cannot disagree about what a
 * venue contains.
 */
export type PublicMenuBand = {
  readonly venues: readonly PublicVenueWithMenus[];
};
