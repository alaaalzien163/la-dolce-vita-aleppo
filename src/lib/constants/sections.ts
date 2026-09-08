/**
 * Stable, untranslated anchor IDs for the one-page homepage.
 *
 * These are deliberately English in every locale. A URL fragment is not indexed
 * as a separate document, so localizing it would only break deep links when the
 * active language changes. The visible labels are translated; the IDs are not.
 *
 * Sections themselves are built in a later phase - this file only fixes the
 * contract so navigation, scroll offsets, and headings cannot drift apart.
 */
export const SECTION_IDS = {
  home: "home",
  about: "about",
  departments: "departments",
  menu: "menu",
  contact: "contact",
} as const;

export type SectionId = (typeof SECTION_IDS)[keyof typeof SECTION_IDS];

/** Order in which sections appear in the document and in the navigation. */
export const SECTION_ORDER: ReadonlyArray<SectionId> = [
  SECTION_IDS.home,
  SECTION_IDS.about,
  SECTION_IDS.departments,
  SECTION_IDS.menu,
  SECTION_IDS.contact,
];
