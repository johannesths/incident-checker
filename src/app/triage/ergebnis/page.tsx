"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  MessageCircleQuestion,
  RotateCcw,
  ShieldAlert,
  ShieldQuestion,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { claudeModelLabel } from "@/lib/ai/models";
import {
  STORAGE_KEYS,
  clearSession,
  useSessionValue,
} from "@/lib/session-store";
import type { TriageResult } from "@/lib/schemas";

/** Herkunft der Einschätzung in einem Wort – Ergebnisse älterer Fassungen tragen keine. */
function sourceLabel(result: TriageResult): string | null {
  if (result.source === "claude") {
    return result.model ? claudeModelLabel(result.model) : "Claude";
  }
  if (result.source === "rules") return "regelbasiert";
  return null;
}

function toneFor(result: TriageResult) {
  if (result.isIncident) {
    return {
      icon: AlertTriangle,
      label: "Möglicher IKT-bezogener Vorfall",
      bar: "bg-destructive",
      chip: "bg-destructive/10 text-destructive",
    };
  }
  if (result.confidence < 0.5) {
    return {
      icon: HelpCircle,
      label: "Einordnung unklar",
      bar: "bg-warning",
      chip: "bg-warning/15 text-warning",
    };
  }
  return {
    icon: CheckCircle2,
    label: "Kein IKT-bezogener Vorfall",
    bar: "bg-success",
    chip: "bg-success/15 text-success",
  };
}

export default function TriageResultPage() {
  const router = useRouter();
  const result = useSessionValue<TriageResult>(STORAGE_KEYS.triageResult);

  function startOver() {
    clearSession(STORAGE_KEYS.triageDraft, STORAGE_KEYS.triageResult);
    router.push("/triage");
  }

  // undefined: Der Speicher wurde noch nicht gelesen (Hydration).
  if (result === undefined) return null;

  if (!result) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/70 bg-muted/20 p-10 text-center">
          <ShieldQuestion className="size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Es liegt kein Triage-Ergebnis vor. Füllen Sie zunächst das Formular
            aus.
          </p>
          <Link href="/triage" className={cn(buttonVariants({ size: "sm" }))}>
            Zur Triage
          </Link>
        </div>
      </div>
    );
  }

  const tone = toneFor(result);
  const source = sourceLabel(result);
  const openQuestions = result.openQuestions ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        step="Schritt 01 · Ergebnis"
        title="Einschätzung der Triage"
        desc="Ergebnis der Erstbewertung des gemeldeten Ereignisses."
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
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{tone.label}</h2>
                {source && (
                  <span className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    Einschätzung: {source}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {result.recommendation}
              </p>
            </div>
          </div>

          <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Begründung: </span>
            {result.reasoning}
          </p>

          {/*
            Anweisungen an ein KI-System im Meldungstext sind bei Texten Dritter
            selbst ein Befund – die Oberfläche zeigt ihn, statt ihn im Fließtext
            der Begründung zu lassen.
          */}
          {result.manipulationDetected && (
            <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" />
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">
                  Hinweis auf Manipulation:{" "}
                </span>
                Der Meldungstext enthält Anweisungen an ein KI-System oder
                Versuche, das Ergebnis vorzugeben. Sie wurden nicht befolgt;
                prüfen Sie die Herkunft des Textes.
              </p>
            </div>
          )}

          {openQuestions.length > 0 && (
            <div className="space-y-2 rounded-lg border border-border/60 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <MessageCircleQuestion className="size-4 text-muted-foreground" />
                Rückfragen an den Melder
              </div>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {openQuestions.map((question, index) => (
                  <li key={index}>{question}</li>
                ))}
              </ul>
            </div>
          )}

          {result.isIncident && (
            <Link
              href="/severity"
              className={cn(buttonVariants({ size: "lg" }), "w-full gap-1.5")}
            >
              Schweregrad bestimmen
              <ArrowRight className="size-4" />
            </Link>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/triage"
          className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}
        >
          <ArrowLeft className="size-4" />
          Eingaben ändern
        </Link>
        <Button variant="ghost" onClick={startOver}>
          <RotateCcw className="size-4" />
          Neue Triage
        </Button>
      </div>
    </div>
  );
}
