"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldHalf } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/triage", label: "Triage" },
  { href: "/severity", label: "Schweregrad" },
  { href: "/meldung", label: "Meldung" },
];

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
            IndIncident
          </span>
        </Link>

        <nav className="flex h-full items-center gap-7 text-sm">
          {NAV.map((item) => {
            // Unterseiten (z. B. /triage/ergebnis) markieren denselben Schritt.
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full items-center font-medium transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
