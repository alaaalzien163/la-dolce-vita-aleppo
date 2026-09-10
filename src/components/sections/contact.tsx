import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { SectionNotice } from "@/components/ui/section-notice";
import { SECTION_IDS } from "@/lib/constants/sections";
import type { QueryResult } from "@/lib/supabase/result";
import type { SiteSettings } from "@/types/content";

/**
 * Contact band - presentation only.
 *
 * No form, no Server Action, no `contact_messages`. This lists whatever contact
 * details `public.site_settings` publishes and nothing else.
 *
 * EVERY FIELD IS OPTIONAL AND EVERY ABSENT FIELD IS OMITTED. Nothing here is
 * invented: no placeholder phone number, no sample address, no fabricated hours. In
 * the current database every one of these columns is null, so this section renders
 * its heading and a quiet notice - which is the honest output, not a bug.
 *
 * Phone numbers and URLs get `dir="ltr"`. Their glyphs are Latin and their order is
 * significant, so inheriting RTL would reorder a phone number on the Arabic page - a
 * real defect, not a cosmetic one. The surrounding label stays in the page direction.
 *
 * OPENING HOURS ARE NOT RENDERED YET. `site_settings.opening_hours` is a `json`
 * column - established by probing the live database - but it is null in the only
 * published row, so its internal shape has never been observed. Rendering it would
 * mean inventing a structure. The label key exists and is ready; the markup waits
 * until a real value can be inspected.
 */

interface ContactProps {
  readonly locale: Locale;
  readonly result: QueryResult<SiteSettings>;
}

const HEADING_ID = "contact-heading";

interface ContactEntry {
  readonly key: string;
  readonly label: string;
  /** Rendered as a link when set, plain text otherwise. */
  readonly href?: string;
  readonly value: string;
  /** Force LTR for values whose character order matters. */
  readonly isolate?: boolean;
  /** Auto-detect direction for database text (Arabic on an English page). */
  readonly autoDir?: boolean;
  readonly external?: boolean;
}

/**
 * Only absolute http(s) URLs are safe to open in a new tab: anything else - a
 * `javascript:` value, or a relative path that would silently turn into navigation
 * within the site - is dropped as if it were absent. Values come from admin-published
 * rows, not visitors, but the guard is the boundary between "a published link" and
 * "safe markup", and it costs one line.
 */
function isSafeExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function Contact({ locale, result }: ContactProps) {
  const t = await getTranslations({ locale, namespace: "contact" });

  const settings = result.status === "success" ? result.data : null;

  const entries: ContactEntry[] = [];

  if (settings?.phone) {
    entries.push({
      key: "phone",
      label: t("phone"),
      // `tel:` tolerates spaces poorly; strip whitespace for the href only and keep
      // the published formatting for display.
      href: `tel:${settings.phone.replace(/\s+/g, "")}`,
      value: settings.phone,
      isolate: true,
    });
  }

  if (settings?.email) {
    const snapchatUrl = isSafeExternalUrl(settings.email) ? settings.email : undefined;

    entries.push({
      key: "snapchat",
      label: t("snapchat"),
      href: snapchatUrl,
      value: settings.email,
      isolate: true,
      external: Boolean(snapchatUrl),
    });
  }

  if (settings?.address) {
    entries.push({
      key: "address",
      label: t("address"),
      value: settings.address,
      autoDir: true,
    });
  }

  if (settings?.googleMapsUrl && isSafeExternalUrl(settings.googleMapsUrl)) {
    entries.push({
      key: "directions",
      label: t("directions"),
      href: settings.googleMapsUrl,
      value: t("directions"),
      external: true,
    });
  }

  if (settings?.instagramUrl && isSafeExternalUrl(settings.instagramUrl)) {
    entries.push({
      key: "instagram",
      label: t("followUs"),
      href: settings.instagramUrl,
      value: t("followUs"),
      external: true,
    });
  }

  return (
    <Section id={SECTION_IDS.contact} labelledBy={HEADING_ID}>
      <SectionHeading id={HEADING_ID} eyebrow={t("eyebrow")} title={t("title")} />

      <div className="mt-12">
        {result.status === "error" ? (
          <SectionNotice tone="error" title={t("errorTitle")} description={t("errorDescription")} />
        ) : entries.length === 0 ? (
          <SectionNotice title={t("pendingTitle")} description={t("pendingDescription")} />
        ) : (
          // A description list is the right structure for label/value pairs: it pairs
          // each term with its detail without inventing headings for them.
          <dl className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry) => (
              <div key={entry.key} className="border-t border-border pt-5">
                <dt className="text-eyebrow font-semibold tracking-eyebrow text-accent-ink uppercase">
                  {entry.label}
                </dt>
                <dd className="mt-2 text-base">
                  {entry.href ? (
                    <a
                      href={entry.href}
                      {...(entry.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : null)}
                      dir={entry.isolate ? "ltr" : entry.autoDir ? "auto" : undefined}
                      className="inline-block transition-colors duration-150 ease-out hover:text-accent-ink active:text-foreground"
                    >
                      {entry.value}
                    </a>
                  ) : (
                    <span
                      dir={entry.isolate ? "ltr" : entry.autoDir ? "auto" : undefined}
                      className="inline-block"
                    >
                      {entry.value}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </Section>
  );
}
