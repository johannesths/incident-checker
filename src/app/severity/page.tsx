"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Loader2,
  ListChecks,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CRITERION_BY_ID } from "@/lib/dora/criteria";
import { SEVERITY_SCENARIOS } from "@/lib/demo-data";
import type { SeverityResult } from "@/lib/schemas";

interface FormState {
  description: string;
  clientsAffected: string;
  clientsAffectedPercent: string;
  transactionsAffected: string;
  durationHours: string;
  downtimeHours: string;
  memberStatesAffected: string;
  dataLosses: string;
  criticalServicesAffected: boolean;
  maliciousUnauthorizedAccess: boolean;
  reputationalImpact: string;
  economicImpactEur: string;
}

const initial: FormState = {
  description: "",
  clientsAffected: "",
  clientsAffectedPercent: "",
  transactionsAffected: "",
  durationHours: "",
  downtimeHours: "",
  memberStatesAffected: "",
  dataLosses: "",
  criticalServicesAffected: false,
  maliciousUnauthorizedAccess: false,
  reputationalImpact: "",
  economicImpactEur: "",
};

const INSTANT_DESCRIPTION =
  "Böswilliger unbefugter Zugriff auf die Netzwerk- und Informationssysteme mit möglichem Datenverlust bei betroffener kritischer Funktion.";

const CLASSIFICATION: Record<
  SeverityResult["classification"],
  { label: string; icon: typeof ShieldAlert; bar: string; chip: string }
> = {
  major: {
    label: "Schwerwiegender Vorfall",
    icon: ShieldAlert,
    bar: "bg-destructive",
    chip: "bg-destructive/10 text-destructive",
  },
  non_major: {
    label: "Kein schwerwiegender Vorfall",
    icon: ShieldCheck,
    bar: "bg-success",
    chip: "bg-success/15 text-success",
  },
  indeterminate: {
    label: "Nicht eindeutig bestimmbar",
    icon: ShieldQuestion,
    bar: "bg-warning",
    chip: "bg-warning/15 text-warning",
  },
};

type Stage = "questions" | "form";

export default function SeverityPage() {
  const [stage, setStage] = useState<Stage>("questions");
  const [criticalAnswer, setCriticalAnswer] = useState<boolean | null>(null);
  const [maliciousAnswer, setMaliciousAnswer] = useState<boolean | null>(null);
  const [form, setForm] = useState<FormState>(initial);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeverityResult | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function reset() {
    setStage("questions");
    setCriticalAnswer(null);
    setMaliciousAnswer(null);
    setForm(initial);
    setResult(null);
  }

  async function classify(body: FormState | Record<string, unknown>) {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/severity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Anfrage fehlgeschlagen.");
      }
      setResult((await res.json()) as SeverityResult);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  }

  // Vorfrage 1: Kritische oder wichtige Funktion betroffen?
  function answerCritical(value: boolean) {
    setCriticalAnswer(value);
    setMaliciousAnswer(null);
    setResult(null);
    setForm((f) => ({
      ...f,
      criticalServicesAffected: value,
      maliciousUnauthorizedAccess: false,
    }));
    // Ohne kritische Funktion direkt zur ausführlichen Erfassung.
    if (!value) setStage("form");
  }

  // Vorfrage 2: Böswilliger unbefugter Zugriff mit möglichem Datenverlust?
  function answerMalicious(value: boolean) {
    setMaliciousAnswer(value);
    setForm((f) => ({ ...f, maliciousUnauthorizedAccess: value }));
    if (value) {
      // Unmittelbare Einstufung als schwerwiegender Vorfall.
      void classify({
        description: INSTANT_DESCRIPTION,
        criticalServicesAffected: true,
        maliciousUnauthorizedAccess: true,
      });
    } else {
      setStage("form");
    }
  }

  function loadScenario(data: FormState) {
    setForm(data);
    setCriticalAnswer(data.criticalServicesAffected);
    setMaliciousAnswer(data.maliciousUnauthorizedAccess);
    setStage("form");
    setResult(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await classify(form);
  }

  const metCount = result?.findings.filter((f) => f.thresholdMet).length ?? 0;
  const tone = result ? CLASSIFICATION[result.classification] : null;
  const instantResult = stage === "questions" && (result !== null || loading);
  // Steht bereits durch die Vorfragen fest, dass kein schwerwiegender Vorfall
  // vorliegt (keine kritische/wichtige Funktion betroffen)?
  const ruledOutNonMajor = criticalAnswer === false && !result && !loading;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <span className="text-xs font-medium uppercase tracking-wider text-primary">
          Schritt 02
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">
          Schweregrad bestimmen (DORA)
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Beantworten Sie zunächst zwei Vorfragen. Je nach Antwort erfolgt eine
          unmittelbare Einstufung oder die Erfassung der
          DORA-Klassifizierungskriterien.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/60 bg-card/70 backdrop-blur">
          <CardContent className="p-6">
            {stage === "questions" && instantResult ? (
              /* Unmittelbare Einstufung über die Vorfragen */
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                    {loading ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <ShieldAlert className="size-5" />
                    )}
                  </span>
                  <div className="space-y-0.5">
                    <h3 className="font-semibold">
                      {loading
                        ? "Wird eingestuft …"
                        : "Schwerwiegender Vorfall"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Böswilliger unbefugter Zugriff mit möglichem Datenverlust
                      bei betroffener kritischer Funktion – unmittelbare
                      Einstufung. Details siehe Ergebnis.
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={reset} disabled={loading}>
                  <RotateCcw className="size-4" />
                  Neue Bewertung
                </Button>
              </div>
            ) : stage === "questions" ? (
              /* Vorfragen */
              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-sm font-medium">
                    1. Ist eine kritische oder wichtige Funktion betroffen?
                  </p>
                  <div className="flex gap-2">
                    <ChoiceButton
                      selected={criticalAnswer === true}
                      onClick={() => answerCritical(true)}
                    >
                      Ja
                    </ChoiceButton>
                    <ChoiceButton
                      selected={criticalAnswer === false}
                      onClick={() => answerCritical(false)}
                    >
                      Nein
                    </ChoiceButton>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ohne Betroffenheit einer kritischen oder wichtigen Funktion
                    liegt nie ein schwerwiegender Vorfall vor.
                  </p>
                </div>

                {criticalAnswer === true && (
                  <div className="space-y-3 border-t border-border/60 pt-6">
                    <p className="text-sm font-medium">
                      2. Handelt es sich um einen böswilligen unbefugten Zugriff
                      auf die Netzwerk- und Informationssysteme, der zu
                      Datenverlusten führen kann?
                    </p>
                    <div className="flex gap-2">
                      <ChoiceButton
                        selected={maliciousAnswer === true}
                        onClick={() => answerMalicious(true)}
                      >
                        Ja
                      </ChoiceButton>
                      <ChoiceButton
                        selected={maliciousAnswer === false}
                        onClick={() => answerMalicious(false)}
                      >
                        Nein
                      </ChoiceButton>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Falls ja, wird der Vorfall unmittelbar als schwerwiegend
                      eingestuft. Andernfalls erfassen Sie die übrigen Kriterien.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Ausführliche Erfassung der DORA-Kriterien */
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                  <div className="space-y-0.5 text-sm">
                    <p className="font-medium">Vorfragen</p>
                    <p className="text-muted-foreground">
                      Kritische/wichtige Funktion:{" "}
                      {form.criticalServicesAffected ? "Ja" : "Nein"}
                      {form.criticalServicesAffected &&
                        ` · Böswilliger Zugriff: ${
                          form.maliciousUnauthorizedAccess ? "Ja" : "Nein"
                        }`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStage("questions");
                      setResult(null);
                    }}
                  >
                    <ArrowLeft className="size-4" />
                    Ändern
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                    <Sparkles className="size-3.5" />
                    Beispiel laden
                  </span>
                  {SEVERITY_SCENARIOS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      title={s.hint}
                      onClick={() => loadScenario(s.data)}
                      className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-medium transition-colors hover:border-primary/50 hover:bg-muted"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <form onSubmit={onSubmit} className="space-y-5">
                  <Field label="Vorfallbeschreibung" htmlFor="description">
                    <Textarea
                      id="description"
                      required
                      rows={3}
                      value={form.description}
                      onChange={(e) => update("description", e.target.value)}
                    />
                  </Field>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                      label="Betroffene Kunden (Anzahl)"
                      htmlFor="clientsAffected"
                    >
                      <Input
                        id="clientsAffected"
                        type="number"
                        min={0}
                        placeholder="z. B. 120000"
                        value={form.clientsAffected}
                        onChange={(e) =>
                          update("clientsAffected", e.target.value)
                        }
                      />
                    </Field>
                    <Field
                      label="Betroffene Kunden (%)"
                      htmlFor="clientsAffectedPercent"
                    >
                      <Input
                        id="clientsAffectedPercent"
                        type="number"
                        min={0}
                        max={100}
                        placeholder="z. B. 20"
                        value={form.clientsAffectedPercent}
                        onChange={(e) =>
                          update("clientsAffectedPercent", e.target.value)
                        }
                      />
                    </Field>
                    <Field
                      label="Betroffene Transaktionen (Anzahl)"
                      htmlFor="transactionsAffected"
                    >
                      <Input
                        id="transactionsAffected"
                        type="number"
                        min={0}
                        placeholder="z. B. 35000"
                        value={form.transactionsAffected}
                        onChange={(e) =>
                          update("transactionsAffected", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Dauer (Stunden)" htmlFor="durationHours">
                      <Input
                        id="durationHours"
                        type="number"
                        min={0}
                        value={form.durationHours}
                        onChange={(e) => update("durationHours", e.target.value)}
                      />
                    </Field>
                    <Field label="Ausfallzeit (Stunden)" htmlFor="downtimeHours">
                      <Input
                        id="downtimeHours"
                        type="number"
                        min={0}
                        value={form.downtimeHours}
                        onChange={(e) => update("downtimeHours", e.target.value)}
                      />
                    </Field>
                    <Field
                      label="Betroffene Mitgliedstaaten"
                      htmlFor="memberStatesAffected"
                    >
                      <Input
                        id="memberStatesAffected"
                        type="number"
                        min={0}
                        value={form.memberStatesAffected}
                        onChange={(e) =>
                          update("memberStatesAffected", e.target.value)
                        }
                      />
                    </Field>
                    <Field
                      label="Wirtschaftl. Schaden (EUR)"
                      htmlFor="economicImpactEur"
                    >
                      <Input
                        id="economicImpactEur"
                        type="number"
                        min={0}
                        value={form.economicImpactEur}
                        onChange={(e) =>
                          update("economicImpactEur", e.target.value)
                        }
                      />
                    </Field>
                  </div>
                  <Field label="Datenverluste" htmlFor="dataLosses">
                    <Input
                      id="dataLosses"
                      placeholder="Verfügbarkeit / Integrität / Authentizität / Vertraulichkeit"
                      value={form.dataLosses}
                      onChange={(e) => update("dataLosses", e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Reputationsauswirkung"
                    htmlFor="reputationalImpact"
                  >
                    <Input
                      id="reputationalImpact"
                      placeholder="z. B. Medienberichte, Beschwerden"
                      value={form.reputationalImpact}
                      onChange={(e) =>
                        update("reputationalImpact", e.target.value)
                      }
                    />
                  </Field>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full"
                    size="lg"
                  >
                    {loading && <Loader2 className="size-4 animate-spin" />}
                    Schweregrad bestimmen
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          {!result && !ruledOutNonMajor && (
            <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 p-8 text-center">
              <ListChecks className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Das Ergebnis erscheint hier nach der Einstufung.
              </p>
            </div>
          )}

          {ruledOutNonMajor && (
            <Card className="relative overflow-hidden border-border/60 bg-card/80 backdrop-blur">
              <div
                className={cn(
                  "absolute inset-x-0 top-0 h-1",
                  CLASSIFICATION.non_major.bar,
                )}
              />
              <CardContent className="space-y-4 p-6">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex size-10 items-center justify-center rounded-xl",
                      CLASSIFICATION.non_major.chip,
                    )}
                  >
                    <ShieldCheck className="size-5" />
                  </span>
                  <div className="space-y-0.5">
                    <h3 className="font-semibold">
                      {CLASSIFICATION.non_major.label}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Vorläufige Einstufung anhand der Vorfragen
                    </p>
                  </div>
                </div>
                <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                  Keine kritische oder wichtige Funktion betroffen – ein
                  schwerwiegender Vorfall ist damit ausgeschlossen. Erfassen Sie
                  bei Bedarf die übrigen Angaben zur Dokumentation und bestätigen
                  Sie mit „Schweregrad bestimmen“.
                </p>
              </CardContent>
            </Card>
          )}

          {result && tone && (
            <Card className="relative overflow-hidden border-border/60 bg-card/80 backdrop-blur">
              <div className={cn("absolute inset-x-0 top-0 h-1", tone.bar)} />
              <CardContent className="space-y-5 p-6">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex size-10 items-center justify-center rounded-xl",
                      tone.chip,
                    )}
                  >
                    <tone.icon className="size-5" />
                  </span>
                  <div className="space-y-0.5">
                    <h3 className="font-semibold">{tone.label}</h3>
                    <p className="text-sm text-muted-foreground">
                      {metCount} von {result.findings.length} Kriterien erreichen
                      die Schwelle
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-auto">
                    {(result.confidence * 100).toFixed(0)} %
                  </Badge>
                </div>

                <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                  {result.summary}
                </p>

                <ul className="space-y-2.5">
                  {result.findings.map((f) => {
                    const crit = CRITERION_BY_ID[f.criterionId];
                    return (
                      <li
                        key={f.criterionId}
                        className="rounded-lg border border-border/50 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">
                            {crit.label}
                          </span>
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
                        <p className="mt-1 text-xs text-muted-foreground">
                          {f.assessment}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ChoiceButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
        selected
          ? "border-primary bg-primary/10 text-primary"
          : "border-border/60 bg-background hover:border-primary/40 hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
