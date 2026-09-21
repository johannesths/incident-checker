"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  ListChecks,
  RotateCcw,
  SendHorizonal,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { PdfDownloadButton } from "@/components/pdf-download-button";
import { cn } from "@/lib/utils";
import { CRITERION_BY_ID } from "@/lib/dora/criteria";
import { CLASSIFICATION } from "@/lib/dora/presentation";
import {
  REPORT_TYPE_BY_ID,
  getReportObligation,
} from "@/lib/dora/reporting";
import {
  STORAGE_KEYS,
  clearSession,
  useSessionValue,
} from "@/lib/session-store";
import { useCompanyProfile } from "@/lib/company/store";
import { pdfFilename } from "@/lib/pdf/download";
import type { SeveritySnapshot } from "@/lib/pdf/severity-summary";
import type { SeverityResult } from "@/lib/schemas";

export default function SeverityResultPage() {
  const router = useRouter();
  const result = useSessionValue<SeverityResult>(STORAGE_KEYS.severityResult);
  // Die erfassten Angaben gehören mit in die PDF-Zusammenfassung; der Entwurf
  // wird ausschließlich lesend berührt.
  const snapshot = useSessionValue<SeveritySnapshot>(
    STORAGE_KEYS.severityDraft,
  );
  const profile = useCompanyProfile();

  function startOver() {
    clearSession(STORAGE_KEYS.severityDraft, STORAGE_KEYS.severityResult);
    router.push("/severity");
  }

  // undefined: Der Speicher wurde noch nicht gelesen (Hydration).
  if (result === undefined) return null;

  if (!result) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/70 bg-muted/20 p-10 text-center">
          <ListChecks className="size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Es liegt keine Einstufung vor. Erfassen Sie zunächst die Angaben zum
            Vorfall.
          </p>
          <Link href="/severity" className={cn(buttonVariants({ size: "sm" }))}>
            Zur Schweregradbestimmung
          </Link>
        </div>
      </div>
    );
  }

  const tone = CLASSIFICATION[result.classification];
  const metCount = result.findings.filter((f) => f.thresholdMet).length;
  const obligation = getReportObligation(result.classification);

  return (
    <div className="space-y-8">
      <PageHeader
        step="Schritt 02 · Ergebnis"
        title="Einstufung nach DORA"
        desc="Gesamteinstufung und Bewertung der einzelnen Klassifizierungskriterien."
      />

      <Card className="relative overflow-hidden border-border/60 bg-card/80 backdrop-blur">
        <div className={cn("absolute inset-x-0 top-0 h-1", tone.bar)} />
        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-xl",
                tone.chip,
              )}
            >
              <tone.icon className="size-6" />
            </span>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">{tone.label}</h2>
              <p className="text-sm text-muted-foreground">
                {metCount} von {result.findings.length} Kriterien erreichen die
                Schwelle
              </p>
            </div>
          </div>

          <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
            {result.summary}
          </p>

          {/*
            Meldepflichtige Vorfälle führen unmittelbar weiter zu Schritt 03 –
            die Erstmeldung ist innerhalb weniger Stunden abzugeben
            (Art. 19 Abs. 4 Buchst. a DORA).
          */}
          {obligation.level !== "none" && (
            <div
              className={cn(
                "space-y-3 rounded-lg border p-4",
                obligation.level === "required"
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-warning/30 bg-warning/5",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl",
                    obligation.level === "required"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-warning/15 text-warning",
                  )}
                >
                  <SendHorizonal className="size-5" />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{obligation.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {obligation.explanation}
                  </p>
                </div>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5 shrink-0" />
                {REPORT_TYPE_BY_ID.initial.label}:{" "}
                {REPORT_TYPE_BY_ID.initial.deadline}.
              </p>
              <Link
                href="/meldung"
                className={cn(buttonVariants({ size: "lg" }), "w-full gap-1.5")}
              >
                Meldung an die BaFin vorbereiten
                <ArrowRight className="size-4" />
              </Link>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-semibold tracking-tight">
              Einzelkriterien
            </h3>
            <ul className="grid gap-3 lg:grid-cols-2">
              {result.findings.map((f) => {
                const crit = CRITERION_BY_ID[f.criterionId];
                return (
                  <li
                    key={f.criterionId}
                    className="rounded-lg border border-border/50 bg-muted/20 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{crit.label}</span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                          f.thresholdMet
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {f.thresholdMet ? "Schwelle erreicht" : "unkritisch"}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {f.assessment}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Ohne Meldepflicht bleibt die freiwillige Meldung als Angebot stehen. */}
      {obligation.level === "none" && (
        <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card/70 p-5 backdrop-blur sm:flex-row sm:items-center">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
            <SendHorizonal className="size-5" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold">{obligation.label}</p>
            <p className="text-sm text-muted-foreground">
              {obligation.explanation}
            </p>
          </div>
          <Link
            href="/meldung"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "shrink-0 gap-1.5",
            )}
          >
            Meldung ansehen
            <ArrowRight className="size-4" />
          </Link>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/severity"
          className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}
        >
          <ArrowLeft className="size-4" />
          Eingaben ändern
        </Link>
        <PdfDownloadButton
          filename={pdfFilename(["Einstufung"], new Date())}
          buildDocument={async () => {
            const { SeveritySummaryPdf } = await import(
              "@/lib/pdf/severity-summary"
            );
            return (
              <SeveritySummaryPdf
                result={result}
                snapshot={snapshot}
                profile={profile}
                generatedAt={new Date()}
              />
            );
          }}
        />
        <Button variant="ghost" onClick={startOver}>
          <RotateCcw className="size-4" />
          Neue Bewertung
        </Button>
      </div>
    </div>
  );
}
