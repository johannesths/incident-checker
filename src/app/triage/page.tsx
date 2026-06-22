"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Loader2,
  ShieldQuestion,
  Sparkles,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TRIAGE_SCENARIOS } from "@/lib/demo-data";
import type { TriageInput, TriageResult } from "@/lib/schemas";

export default function TriagePage() {
  const [form, setForm] = useState<TriageInput>({
    description: "",
    affectedSystem: "",
    reportedBy: "",
    symptoms: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);

  function update<K extends keyof TriageInput>(key: K, value: TriageInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Anfrage fehlgeschlagen.");
      }
      setResult((await res.json()) as TriageResult);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  }

  const tone = !result
    ? null
    : result.isIncident
      ? {
          icon: AlertTriangle,
          label: "Möglicher IKT-Vorfall",
          bar: "bg-destructive",
          chip: "bg-destructive/10 text-destructive",
        }
      : result.confidence < 0.5
        ? {
            icon: HelpCircle,
            label: "Einordnung unklar",
            bar: "bg-warning",
            chip: "bg-warning/15 text-warning",
          }
        : {
            icon: CheckCircle2,
            label: "Kein IKT-Vorfall",
            bar: "bg-success",
            chip: "bg-success/15 text-success",
          };

  return (
    <div className="space-y-8">
      <PageHeader
        step="Schritt 01"
        title="Triage"
        desc="Erfassen Sie das mögliche Ereignis. Die Anwendung schätzt ein, ob ein IKT-Vorfall vorliegt."
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/60 bg-card/70 backdrop-blur">
          <CardContent className="p-6">
            <DemoBar
              onLoad={(data) => {
                setForm(data);
                setResult(null);
              }}
            />
            <form onSubmit={onSubmit} className="space-y-5">
              <Field label="Beschreibung" htmlFor="description">
                <Textarea
                  id="description"
                  required
                  rows={5}
                  placeholder="Was ist passiert?"
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Betroffenes System / Dienst" htmlFor="affectedSystem">
                  <Input
                    id="affectedSystem"
                    required
                    placeholder="z. B. Online-Banking"
                    value={form.affectedSystem}
                    onChange={(e) => update("affectedSystem", e.target.value)}
                  />
                </Field>
                <Field label="Gemeldet von" htmlFor="reportedBy">
                  <Input
                    id="reportedBy"
                    required
                    placeholder="Name / Abteilung"
                    value={form.reportedBy}
                    onChange={(e) => update("reportedBy", e.target.value)}
                  />
                </Field>
              </div>
              <Field
                label="Symptome / Auswirkungen (optional)"
                htmlFor="symptoms"
              >
                <Textarea
                  id="symptoms"
                  rows={3}
                  placeholder="Beobachtete Auswirkungen"
                  value={form.symptoms}
                  onChange={(e) => update("symptoms", e.target.value)}
                />
              </Field>
              <Button type="submit" disabled={loading} className="w-full" size="lg">
                {loading && <Loader2 className="size-4 animate-spin" />}
                Einschätzung anfordern
              </Button>
            </form>
          </CardContent>
        </Card>

        <div>
          {!result && (
            <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 p-8 text-center">
              <ShieldQuestion className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Das Ergebnis erscheint hier nach dem Absenden.
              </p>
            </div>
          )}

          {result && tone && (
            <Card className="relative overflow-hidden border-border/60 bg-card/80 backdrop-blur">
              <div className={cn("absolute inset-x-0 top-0 h-1", tone.bar)} />
              <CardContent className="space-y-4 p-6">
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
                      {result.recommendation}
                    </p>
                  </div>
                </div>
                <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Begründung: </span>
                  {result.reasoning}
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">
                    Konfidenz {(result.confidence * 100).toFixed(0)} %
                  </Badge>
                  {result.isIncident && (
                    <Link
                      href="/severity"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "gap-1.5",
                      )}
                    >
                      Schweregrad bestimmen
                      <ArrowRight className="size-4" />
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function DemoBar({ onLoad }: { onLoad: (data: TriageInput) => void }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
        <Sparkles className="size-3.5" />
        Beispiel laden
      </span>
      {TRIAGE_SCENARIOS.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onLoad(s.data)}
          title={s.hint}
          className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-medium transition-colors hover:border-primary/50 hover:bg-muted"
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

function PageHeader({
  step,
  title,
  desc,
}: {
  step: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="space-y-2">
      <span className="text-xs font-medium uppercase tracking-wider text-primary">
        {step}
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-2xl text-sm text-muted-foreground">{desc}</p>
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
