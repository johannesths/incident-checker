"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldHalf, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMO_COMPANY_PROFILE } from "../lib/company/profile";

const NAV = [
  { href: "/triage", label: "Triage" },
  { href: "/severity", label: "Schweregrad" },
  { href: "/meldung", label: "Meldung" },
];

const SETTINGS_HREF = "/einstellungen";

/**
 * Ruhige weiße Kopfzeile: Die Akzentfarbe erscheint nur als Signatur – als
 * Linie über der Seite, in der Wortmarke und unter dem aktiven Schritt. So
 * bleibt Orange den Handlungen (Schaltflächen, aktiver Schritt) vorbehalten.
 */
export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="h-0.5 bg-primary" />
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <ShieldHalf className="size-6 text-primary" />
          <span className="text-base font-semibold tracking-tight">
            Threatly
          </span>
        </Link>

        <nav className="flex h-full items-center gap-7 text-sm">
          {NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              pathname={pathname}
              label={item.label}
            />
          ))}
          <span aria-hidden className="h-5 w-px bg-border" />
          {/* Die Stammdaten des Unternehmens stehen neben, nicht in der Abfolge der Schritte. */}
          <NavLink
            href={SETTINGS_HREF}
            pathname={pathname}
            label={DEMO_COMPANY_PROFILE.name}
            icon={<SlidersHorizontal className="size-4" />}
          />
        </nav>
      </div>
    </header>
  );
}

function NavLink({
  href,
  pathname,
  label,
  icon,
}: {
  href: string;
  pathname: string;
  label: string;
  icon?: React.ReactNode;
}) {
  // Unterseiten (z. B. /triage/ergebnis) markieren denselben Schritt.
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-full items-center gap-1.5 font-medium transition-colors",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
      {active && (
        <span
          aria-hidden
          className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
        />
      )}
    </Link>
  );
}
