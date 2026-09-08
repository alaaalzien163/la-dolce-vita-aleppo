interface SkipLinkProps {
  /** Fragment of the main landmark, e.g. `#home`. */
  readonly href: string;
  readonly children: string;
}

/**
 * First focusable element in the document, so a keyboard or screen-reader user
 * can jump past the navigation on every page.
 *
 * Visually hidden until focused rather than removed: `sr-only` keeps it in the
 * tab order, and `focus:not-sr-only` reveals it in place. It is positioned with
 * logical `start-*` insets, so it appears on the correct edge in both RTL and
 * LTR without a directional variant.
 */
export function SkipLink({ href, children }: SkipLinkProps) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:inline-block focus:rounded-control focus:bg-surface-inverse focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-foreground-inverse focus:shadow-raised"
    >
      {children}
    </a>
  );
}
