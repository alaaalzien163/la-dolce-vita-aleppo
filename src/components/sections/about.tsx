import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

import { DecorativeVideo } from "@/components/ui/decorative-video";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { SECTION_IDS } from "@/lib/constants/sections";
import { getAboutStory } from "@/lib/content/about-story";
import type { QueryResult } from "@/lib/supabase/result";
import { cn } from "@/lib/utils/cn";
import type { PublicStudioInfo } from "@/types/content";

/**
 * About band - the brand story in editorial form.
 *
 * The copy is the curated bilingual story from `@/lib/content/about-story`: the
 * English text renders on `/en` (with one Arabic line kept as an editorial accent)
 * and the Arabic text on `/ar`. It is static by design, so the section never
 * depends on admin content for its words.
 *
 * The photograph is still database-driven. `studio_info` is the only place the
 * team can publish a picture, so `result` supplies `heroImageUrl` when a photo
 * exists, and the decorative about video (`/about.mp4` in the same reserved box)
 * shows when it does not. The reserved box is identical either way, so
 * publishing media never moves the page.
 *
 * Layout: the photo (or panel) column is sticky on wide viewports so it stays in
 * view while the reader moves down the story. `order` is a flow-relative property,
 * so flipping the two columns in RTL needs no `rtl:` variants.
 */

interface AboutProps {
  readonly locale: Locale;
  readonly result: QueryResult<PublicStudioInfo>;
}

const HEADING_ID = "about-heading";

const IMAGE_SIZES = "(min-width: 1024px) 50vw, 100vw";

/** Editorial "pull" typography shared by the subtitle and every `lead` block. */
const DISPLAY_LINE_CLASS =
  "font-display text-display-sm font-medium tracking-display [line-height:var(--leading-display)]";

export async function About({ locale, result }: AboutProps) {
  const t = await getTranslations({ locale, namespace: "about" });
  const story = getAboutStory(locale);

  const content = result.status === "success" ? result.data : null;
  const imageUrl = content?.heroImageUrl ?? null;

  return (
    <Section id={SECTION_IDS.about} surface="muted" labelledBy={HEADING_ID}>
      <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-20">
        {/* `order` is flow-relative, so the columns mirror themselves in RTL. */}
        <div className="lg:sticky lg:top-24 lg:order-2">
          {imageUrl ? (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-panel border bg-surface-muted sm:aspect-[3/2] lg:aspect-square">
              <Image
                src={imageUrl}
                // The photograph carries the venue's identity; the story title is
                // the section heading and names it in the visitor's language.
                alt={story.title}
                fill
                sizes={IMAGE_SIZES}
                className="object-cover"
              />
            </div>
          ) : (
            <DecorativeVideo
              src="/about.mp4"
              className="aspect-[4/3] w-full sm:aspect-[3/2] lg:aspect-square"
            />
          )}
        </div>

        <div className="flex flex-col lg:order-1">
          <SectionHeading id={HEADING_ID} eyebrow={t("eyebrow")} title={story.title} />

          <p className={cn("mt-3 text-accent-ink", DISPLAY_LINE_CLASS)}>{story.subtitle}</p>

          <div className="mt-10 flex flex-col border-t border-border pt-8">
            {story.blocks.map((block, index) =>
              block.kind === "body" ? (
                <p key={index} className={cn("text-foreground", index === 0 ? undefined : "mt-6")}>
                  {block.text}
                </p>
              ) : (
                <p
                  key={index}
                  dir={block.dir}
                  lang={block.lang}
                  className={cn(
                    DISPLAY_LINE_CLASS,
                    block.dir === "rtl" ? "text-accent-ink" : "text-foreground",
                    index === 0 ? undefined : "mt-8",
                  )}
                >
                  {block.text}
                </p>
              ),
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}
