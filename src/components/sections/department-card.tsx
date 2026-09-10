import type { Locale } from "next-intl";
import Image from "next/image";

import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardText, CardTitle } from "@/components/ui/card";
import { getPathname } from "@/i18n/navigation";
import type { PublicDepartment } from "@/types/content";

/**
 * One department, backed by a `public.sections` row.
 *
 * The card is a uniform frame: image on top, then name, then a clamped
 * description, then a single "View More" link pinned to the bottom. Every card in
 * a row is the same width and height as its neighbors because the card binds
 * itself to its grid cell (`min-w-0` + `w-full` fill the `flex` list item, which
 * is stretched by the grid), and the CTA uses `mt-auto`, so the button always
 * sits at the same vertical position no matter how long the name or description
 * is. The description is clamped to three lines; the full copy lives on the
 * department's detail page.
 *
 * The card itself is not a link: a "View More" anchor is the one interactive
 * element, so there is no nested-link HTML, keyboard focus lands on a single
 * control, and its accessible name is the localized label.
 *
 * The visual is `previewImageUrl` - the department's first active section_image when
 * one exists, falling back to the legacy single `sections.image_url`, then null.
 * When absent the card simply has no media area rather than reserving an empty box
 * - a card that is all frame and no picture looks broken. The grid still gives it
 * the row's full height, so the missing image never shrinks the card.
 *
 * `sizes` matches the grid this card lives in: full width on mobile, half at `sm`,
 * a third at `lg`. Getting this wrong is the usual cause of `next/image` shipping a
 * desktop-sized file to a phone.
 *
 * Remote images are served from Supabase Storage, allow-listed in `next.config.ts`
 * by a pattern derived from `NEXT_PUBLIC_SUPABASE_URL`.
 */

interface DepartmentCardProps {
  readonly locale: Locale;
  readonly department: PublicDepartment;
  /** Heading level, so the card fits whatever section encloses it. */
  readonly headingLevel?: 2 | 3 | 4;
  /** Localized "View More" label, so the card stays presentation-only. */
  readonly viewMoreLabel: string;
}

const IMAGE_SIZES = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

export function DepartmentCard({
  locale,
  department,
  headingLevel = 3,
  viewMoreLabel,
}: DepartmentCardProps) {
  const { name, slug, description, previewImageUrl } = department;

  const href = slug.length > 0 ? getPathname({ href: `/departments/${slug}`, locale }) : null;

  return (
    <Card as="article" className="group flex h-full w-full min-w-0 flex-col overflow-hidden">
      {previewImageUrl ? (
        <div className="relative aspect-[3/2] w-full shrink-0 overflow-hidden bg-surface-muted">
          <Image
            src={previewImageUrl}
            alt={name}
            fill
            sizes={IMAGE_SIZES}
            // A 4% settle on card hover, the only decoration that suggests the card
            // is alive - and it is disabled under `prefers-reduced-motion`.
            className="object-cover transition-transform duration-300 ease-out motion-safe:group-hover:scale-[1.04]"
          />
        </div>
      ) : null}

      <CardBody className="flex flex-1 flex-col">
        <CardTitle level={headingLevel}>
          <span dir="auto">{name}</span>
        </CardTitle>
        {description ? (
          <CardText>
            <span dir="auto" className="line-clamp-3">
              {description}
            </span>
          </CardText>
        ) : null}

        {href ? (
          <div className="mt-auto pt-6">
            <a
              href={href}
              className={buttonStyles({
                variant: "outline",
                size: "md",
                className: "group w-full",
              })}
            >
              {viewMoreLabel}
              {/* Chevron points toward the next page; `rtl:-scale-x-100` mirrors it to
                  point left in Arabic, and the hover slide moves it that same way. */}
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4 transition-transform duration-200 ease-out motion-safe:group-hover:translate-x-0.5 rtl:-scale-x-100"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </a>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
