"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ListChecks, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { CRITERION_BY_ID } from "@/lib/dora/criteria";
import { CLASSIFICATION } from "@/lib/dora/presentation";
import {
  STORAGE_KEYS,
  clearSession,
  useSessionValue,
} from "@/lib/session-store";
import type { SeverityResult } from "@/lib/schemas";

export default function SeverityResultPage() {
  const router = useRouter();
  const result = useSessionValue<SeverityResult>(STORAGE_KEYS.severityResult);

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
            <Badge variant="secondary" className="ml-auto shrink-0">
              Konfidenz {(result.confidence * 100).toFixed(0)} %
            </Badge>
          </div>

          <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
            {result.summary}
          </p>

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

      <div className="flex flex-wrap gap-3">
        <Link
          href="/severity"
          className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}
        >
          <ArrowLeft className="size-4" />
          Eingaben ändern
        </Link>
        <Button variant="ghost" onClick={startOver}>
          <RotateCcw className="size-4" />
          Neue Bewertung
        </Button>
      </div>
    </div>
  );
}
