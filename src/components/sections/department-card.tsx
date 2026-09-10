import type { Locale } from "next-intl";
import Image from "next/image";

import { Card, CardBody, CardText, CardTitle } from "@/components/ui/card";
import { getPathname } from "@/i18n/navigation";
import type { PublicDepartment } from "@/types/content";

/**
 * One department, backed by a `public.sections` row.
 *
 * The whole card is one link through to the department's detail page (where its
 * `section_images` carousel lives). `slug` is carried by `PublicDepartment`, so both
 * the homepage band and the `/departments` page can send visitors onward.
 *
 * The visual is `previewImageUrl` - the department's first active section_image when
 * one exists, falling back to the legacy single `sections.image_url`, then null.
 * When absent the card simply has no media area rather than reserving an empty box
 * - a card that is all frame and no picture looks broken.
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
}

const IMAGE_SIZES = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

export function DepartmentCard({ locale, department, headingLevel = 3 }: DepartmentCardProps) {
  const { name, slug, description, previewImageUrl } = department;

  const href = slug.length > 0 ? getPathname({ href: `/departments/${slug}`, locale }) : null;

  return (
    <Card as="article" interactive className="flex h-full flex-col overflow-hidden">
      {href ? (
        <a href={href} className="flex flex-1 flex-col focus-visible:outline-offset-[-2px]">
          {previewImageUrl ? (
            <div className="relative aspect-[3/2] w-full overflow-hidden bg-surface-muted">
              <Image
                src={previewImageUrl}
                alt={name}
                fill
                sizes={IMAGE_SIZES}
                className="object-cover"
              />
            </div>
          ) : null}

          <CardBody className="flex flex-1 flex-col">
            <CardTitle level={headingLevel}>
              <span dir="auto">{name}</span>
            </CardTitle>
            {description ? (
              <CardText>
                <span dir="auto">{description}</span>
              </CardText>
            ) : null}
          </CardBody>
        </a>
      ) : (
        <>
          {previewImageUrl ? (
            <div className="relative aspect-[3/2] w-full overflow-hidden bg-surface-muted">
              <Image
                src={previewImageUrl}
                alt={name}
                fill
                sizes={IMAGE_SIZES}
                className="object-cover"
              />
            </div>
          ) : null}
          <CardBody className="flex flex-1 flex-col">
            <CardTitle level={headingLevel}>
              <span dir="auto">{name}</span>
            </CardTitle>
            {description ? (
              <CardText>
                <span dir="auto">{description}</span>
              </CardText>
            ) : null}
          </CardBody>
        </>
      )}
    </Card>
  );
}
