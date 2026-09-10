"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import type { NavItem } from "@/components/layout/nav-items";
import { iconButtonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/**
 * Mobile navigation disclosure.
 *
 * The only Client Component on the page, and only because correct behaviour needs
 * state: a menu that stays open after a link is tapped is broken, and in-page
 * anchors do not reload the document, so nothing else would close it.
 *
 * Built as a disclosure - button with `aria-expanded` plus the panel it controls -
 * rather than a modal dialog. There is no focus trap, no scroll lock, and no
 * inert background, because none of those are appropriate for a short list of
 * same-page links, and each one would add code that can trap a keyboard user.
 *
 * No `useTranslations` here: labels arrive as props. That keeps the message
 * catalogue and `NextIntlClientProvider` out of the client bundle entirely.
 */

interface MobileNavProps {
  readonly items: readonly NavItem[];
  readonly openLabel: string;
  readonly closeLabel: string;
  readonly menuLabel: string;
}

export function MobileNav({ items, openLabel, closeLabel, menuLabel }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  // Escape returns focus to the toggle rather than leaving it stranded in a panel
  // that is no longer rendered.
  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? closeLabel : openLabel}
        onClick={() => setOpen((value) => !value)}
        className={iconButtonStyles()}
      >
        {/* Decorative: the button is named by aria-label. */}
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="size-6"
        >
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />}
        </svg>
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-full border-b border-border bg-surface shadow-raised"
      >
        <nav aria-label={menuLabel} className="px-gutter py-4">
          <ul className="flex flex-col">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={item.href}
                  onClick={close}
                  className={cn(
                    "block rounded-control px-3 py-3 text-base font-medium",
                    "transition-colors duration-150 ease-out hover:bg-surface-muted active:bg-border",
                  )}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
