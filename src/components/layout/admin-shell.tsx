"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";

interface AdminShellProps {
  readonly children: ReactNode;
  readonly controls: ReactNode;
  readonly siteName: string;
  readonly dashboardLabel: string;
}

/** Shared top bar for protected pages; the sign-in page keeps only compact controls. */
export function AdminShell({ children, controls, siteName, dashboardLabel }: AdminShellProps) {
  const pathname = usePathname();

  if (pathname === "/admin/login") {
    return (
      <>
        <div className="fixed end-3 top-3 z-50">{controls}</div>
        {children}
      </>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/92 supports-[backdrop-filter]:backdrop-blur-sm">
        <Container className="flex min-h-16 items-center gap-3 py-2 sm:min-h-20">
          <Link
            href="/admin"
            aria-label={dashboardLabel}
            className="inline-flex shrink-0 items-center rounded-control"
          >
            <Logo label={siteName} size="sm" priority />
          </Link>
          <div className="ms-auto">{controls}</div>
        </Container>
      </header>
      <div className="min-w-0">{children}</div>
    </>
  );
}
