"use client";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils/cn";

interface AdminControlsProps {
  readonly cookieName: string;
  readonly targetLocale: string;
  readonly targetLocaleLabel: string;
  readonly switchLocaleLabel: string;
  readonly toDarkLabel: string;
  readonly toLightLabel: string;
  readonly className?: string;
}

/**
 * Small persistent control group for the unprefixed admin tree. Locale routing
 * remains public-only; this writes the same next-intl preference cookie the public
 * locale switcher uses, then reloads the current protected URL in the new UI locale.
 */
export function AdminControls({
  cookieName,
  targetLocale,
  targetLocaleLabel,
  switchLocaleLabel,
  toDarkLabel,
  toLightLabel,
  className,
}: AdminControlsProps) {
  function switchLocale() {
    document.cookie = `${cookieName}=${encodeURIComponent(targetLocale)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    window.location.reload();
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-control border border-border bg-surface/95 p-1 shadow-card supports-[backdrop-filter]:backdrop-blur-sm",
        className,
      )}
    >
      <ThemeToggle toDarkLabel={toDarkLabel} toLightLabel={toLightLabel} />
      <button
        type="button"
        onClick={switchLocale}
        aria-label={switchLocaleLabel}
        title={switchLocaleLabel}
        className="inline-flex h-11 items-center justify-center rounded-control px-3 text-sm font-semibold text-foreground transition-colors duration-150 ease-out hover:bg-surface-subtle active:bg-border"
      >
        <span lang={targetLocale}>{targetLocaleLabel}</span>
      </button>
    </div>
  );
}
