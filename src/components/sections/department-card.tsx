import Image from "next/image";

import { Card, CardBody, CardText, CardTitle } from "@/components/ui/card";
import type { PublicDepartment } from "@/types/content";

/**
 * One department, backed by a `public.sections` row.
 *
 * The image is optional because `sections.image_url` is nullable and null in every
 * current row. When absent the card simply has no media area rather than reserving
 * an empty box - a card that is all frame and no picture looks broken.
 *
 * `sizes` matches the grid this card lives in: full width on mobile, half at `sm`,
 * a third at `lg`. Getting this wrong is the usual cause of `next/image` shipping a
 * desktop-sized file to a phone.
 *
 * Remote images are served from Supabase Storage, allow-listed in `next.config.ts`
 * by a pattern derived from `NEXT_PUBLIC_SUPABASE_URL`.
 */

interface DepartmentCardProps {
  readonly department: PublicDepartment;
  /** Heading level, so the card fits whatever section encloses it. */
  readonly headingLevel?: 2 | 3 | 4;
}

const IMAGE_SIZES = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

export function DepartmentCard({ department, headingLevel = 3 }: DepartmentCardProps) {
  const { name, description, imageUrl } = department;

  return (
    <Card as="article" className="flex h-full flex-col overflow-hidden">
      {imageUrl ? (
        <div className="relative aspect-[3/2] w-full overflow-hidden bg-surface-muted">
          <Image
            src={imageUrl}
            // The department name is the only description available. It is already
            // the card's heading, so this repeats rather than adds - but an image
            // that carries the department's identity is not decorative, and there is
            // no separate caption to draw on.
            alt={name}
            fill
            sizes={IMAGE_SIZES}
            className="object-cover"
          />
        </div>
      ) : null}

      <CardBody className="flex flex-1 flex-col">
        {/* Names and descriptions are database content (Arabic today), so they
            carry `dir="auto"` to render correctly inside either catalogue. */}
        <CardTitle level={headingLevel}>
          <span dir="auto">{name}</span>
        </CardTitle>
        {description ? (
          <CardText>
            <span dir="auto">{description}</span>
          </CardText>
        ) : null}
      </CardBody>
    </Card>
  );
}
