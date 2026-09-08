import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { changeAdminPassword, updateAdminProfile } from "@/app/admin/profile/actions";
import { getProfileFormLabels } from "@/app/admin/profile/form-labels";
import { PasswordForm } from "@/app/admin/profile/password-form";
import { ProfileForm } from "@/app/admin/profile/profile-form";
import { Container } from "@/components/ui/container";
import { SectionNotice } from "@/components/ui/section-notice";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requireAdmin } from "@/lib/auth/admin";
import { ADMIN_ROLE } from "@/lib/constants/admin";
import { getAdminProfile } from "@/lib/data/admin/profile";

/**
 * Profile and password management, for the existing admin account only.
 *
 * Guarded before render; the actions re-check independently. The email shown
 * comes from the verified token claims (there is no email column on
 * `profiles`), the role is displayed from the row and is never editable, and
 * `auth.uid()` - resolved here and again inside the actions - is the only
 * identity the module ever acts on.
 */
export const dynamic = "force-dynamic";

export default async function AdminProfilePage() {
  const identity = await requireAdmin();

  const locale = await getAdminLocale();
  const [t, { profileLabels, passwordLabels }, profileRead] = await Promise.all([
    getTranslations({ locale, namespace: "adminProfile" }),
    getProfileFormLabels(),
    getAdminProfile(identity.id),
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

        <div className="mt-10 flex max-w-160 flex-col gap-10">
          {profileRead.status === "error" ? (
            <SectionNotice
              tone="error"
              title={t("errorTitle")}
              description={t("errorDescription")}
              headingLevel={3}
            />
          ) : profileRead.status === "empty" ? (
            <SectionNotice
              tone="error"
              title={t("errorTitle")}
              description={t("profileNotFound")}
              headingLevel={3}
            />
          ) : (
            <>
              <ProfileForm
                action={updateAdminProfile}
                labels={profileLabels}
                profile={profileRead.profile}
                email={identity.email}
                roleLabel={
                  profileRead.profile.role === ADMIN_ROLE
                    ? t("roleAdmin")
                    : profileRead.profile.role
                }
              />

              <div className="border-t border-border pt-10">
                <PasswordForm action={changeAdminPassword} labels={passwordLabels} />
              </div>
            </>
          )}
        </div>
      </Container>
    </main>
  );
}
