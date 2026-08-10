"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  ShieldQuestion,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import {
  STORAGE_KEYS,
  clearSession,
  useSessionValue,
} from "@/lib/session-store";
import type { TriageResult } from "@/lib/schemas";

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
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">{tone.label}</h2>
              <p className="text-sm text-muted-foreground">
                {result.recommendation}
              </p>
            </div>
            <Badge variant="secondary" className="ml-auto shrink-0">
              Konfidenz {(result.confidence * 100).toFixed(0)} %
            </Badge>
          </div>

          <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Begründung: </span>
            {result.reasoning}
          </p>

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
