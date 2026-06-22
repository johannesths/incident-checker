"use client";

import { useState } from "react";
import {
  Loader2,
  ListChecks,
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
  reputationalImpact: "",
  economicImpactEur: "",
};

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

export default function SeverityPage() {
  const [form, setForm] = useState<FormState>(initial);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeverityResult | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/severity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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

  const metCount = result?.findings.filter((f) => f.thresholdMet).length ?? 0;
  const tone = result ? CLASSIFICATION[result.classification] : null;

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
          Ergänzen Sie Angaben zu den DORA-Klassifizierungskriterien. Die
          Bewertung erfolgt transparent je Einzelkriterium.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/60 bg-card/70 backdrop-blur">
          <CardContent className="p-6">
            <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                <Sparkles className="size-3.5" />
                Beispiel laden
              </span>
              {SEVERITY_SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  title={s.hint}
                  onClick={() => {
                    setForm(s.data);
                    setResult(null);
                  }}
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
                <Field label="Betroffene Kunden (Anzahl)" htmlFor="clientsAffected">
                  <Input
                    id="clientsAffected"
                    type="number"
                    min={0}
                    placeholder="z. B. 120000"
                    value={form.clientsAffected}
                    onChange={(e) => update("clientsAffected", e.target.value)}
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
                    onChange={(e) => update("economicImpactEur", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Datenverluste" htmlFor="dataLosses">
                <Input
                  id="dataLosses"
                  placeholder="Verfügbarkeit / Integrität / Vertraulichkeit"
                  value={form.dataLosses}
                  onChange={(e) => update("dataLosses", e.target.value)}
                />
              </Field>
              <Field label="Reputationsauswirkung" htmlFor="reputationalImpact">
                <Input
                  id="reputationalImpact"
                  placeholder="z. B. Medienberichte, Beschwerden"
                  value={form.reputationalImpact}
                  onChange={(e) => update("reputationalImpact", e.target.value)}
                />
              </Field>
              <label className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={form.criticalServicesAffected}
                  onChange={(e) =>
                    update("criticalServicesAffected", e.target.checked)
                  }
                />
                Kritische oder wichtige Funktion betroffen
              </label>
              <Button type="submit" disabled={loading} className="w-full" size="lg">
                {loading && <Loader2 className="size-4 animate-spin" />}
                Schweregrad bestimmen
              </Button>
            </form>
          </CardContent>
        </Card>

        <div>
          {!result && (
            <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 p-8 text-center">
              <ListChecks className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Das Ergebnis erscheint hier nach dem Absenden.
              </p>
            </div>
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
