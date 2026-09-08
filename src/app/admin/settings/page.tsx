import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { saveSiteSettings } from "@/app/admin/settings/actions";
import { getSiteSettingsFormLabels } from "@/app/admin/settings/form-labels";
import { SettingsForm } from "@/app/admin/settings/settings-form";
import { Container } from "@/components/ui/container";
import { SectionNotice } from "@/components/ui/section-notice";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminSiteSettings } from "@/lib/data/admin/site-settings";

/**
 * Site settings. Guarded before render; the action re-checks independently.
 *
 * This page is both the first save and every save after it: the singleton may
 * legitimately not exist yet, so a "never saved" state is shown as a create
 * form rather than an error. A broken singleton (two rows) is different - it
 * refuses to render the form at all, because a save over it would replace one
 * of two truths and make the corruption look legitimate.
 */
export const dynamic = "force-dynamic";

export default async function SiteSettingsPage() {
  await requireAdmin();

  const locale = await getAdminLocale();
  const [t, { labels }, settingsResult] = await Promise.all([
    getTranslations({ locale, namespace: "adminSiteSettings" }),
    getSiteSettingsFormLabels(),
    getAdminSiteSettings(),
  ]);

  return (
    <main className="py-section">
      <Container>
        <nav aria-label={t("backToDashboard")} className="mb-8">
          <Link
            href="/admin"
            className="text-sm underline decoration-accent-line decoration-1 underline-offset-4 transition-colors duration-150 ease-out hover:text-accent-ink"
          >
            {t("backToDashboard")}
          </Link>
        </nav>

        <h1 className="text-display-sm font-medium">{t("title")}</h1>
        <p className="mt-3 max-w-measure text-sm text-foreground-muted">{t("description")}</p>

        <div className="mt-10">
          {settingsResult.status === "error" ? (
            <SectionNotice
              tone="error"
              title={t("errorTitle")}
              description={t("errorDescription")}
              headingLevel={3}
            />
          ) : settingsResult.status === "malformed" ? (
            <SectionNotice
              tone="error"
              title={t("malformedTitle")}
              description={t("malformedDescription")}
              headingLevel={3}
            />
          ) : settingsResult.status === "empty" ? (
            <div className="flex flex-col gap-8">
              <SectionNotice
                title={t("notCreatedTitle")}
                description={t("notCreatedDescription")}
                headingLevel={3}
              />
              <SettingsForm action={saveSiteSettings} labels={labels} />
            </div>
          ) : (
            <SettingsForm
              action={saveSiteSettings}
              labels={labels}
              settings={settingsResult.settings}
            />
          )}
        </div>
      </Container>
    </main>
  );
}
