"use client";

import Link from "next/link";
import { Building2, SlidersHorizontal } from "lucide-react";
import { entityTypeLabel, formatAddress } from "@/lib/company/profile";
import { useCompanyProfile } from "@/lib/company/store";

/**
 * Für welches Unternehmen ist die Anwendung eingerichtet? Die Stammdaten aus
 * den Einstellungen gehen in jede Meldung ein – die Startseite zeigt sie
 * deshalb vorab, damit erkennbar ist, in wessen Namen gemeldet wird.
 */
export function CompanyProfileCard() {
  const profile = useCompanyProfile();

  // undefined: Der Speicher wurde noch nicht gelesen (Hydration).
  if (!profile) return null;

  return (
    <section className="rounded-xl border border-border/60 bg-card/70 p-5 backdrop-blur">
      <div className="flex flex-wrap items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Building2 className="size-5" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Eingerichtet für
          </p>
          <h2 className="text-lg font-semibold tracking-tight">
            {profile.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {[entityTypeLabel(profile), profile.legalForm, formatAddress(profile)]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <Link
          href="/einstellungen"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          <SlidersHorizontal className="size-4" />
          Profil bearbeiten
        </Link>
      </div>

      <dl className="mt-5 grid gap-4 border-t border-border/60 pt-4 sm:grid-cols-2 lg:grid-cols-4">
        <Detail label="LEI" value={profile.lei} mono />
        <Detail label="BaFin-ID" value={profile.bafinId} mono />
        <Detail label="Zuständige Behörde" value={profile.competentAuthority} />
        <Detail
          label="Meldekontakt"
          value={[profile.contactName, profile.contactEmail]
            .filter(Boolean)
            .join(" · ")}
        />
      </dl>
    </section>
  );
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={`truncate text-sm font-medium ${mono ? "font-mono" : ""}`}
        title={value || undefined}
      >
        {value || "—"}
      </dd>
    </div>
  );
}
