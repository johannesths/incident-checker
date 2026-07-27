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
import {
  CRITERION_BY_ID,
  DATA_LOSS_DIMENSIONS,
  REPUTATION_CONDITIONS,
  type DataLossDimension,
  type ReputationCondition,
} from "@/lib/dora/criteria";
import { SEVERITY_SCENARIOS } from "@/lib/demo-data";
import type { SeverityResult } from "@/lib/schemas";

interface FormState {
  description: string;
  clientsAffected: string;
  clientsAffectedPercent: string;
  counterpartsAffectedPercent: string;
  transactionsCountPercent: string;
  transactionsValuePercent: string;
  relevantClientsAffected: boolean;
  durationHours: string;
  downtimeHours: string;
  memberStatesAffected: string;
  dataLossDimensions: DataLossDimension[];
  dataLossAdverseImpact: boolean;
  criticalFunctionAffected: boolean;
  regulatedServicesAffected: boolean;
  maliciousUnauthorizedAccess: boolean;
  maliciousAccessDataLossPossible: boolean;
  reputationalImpactConditions: ReputationCondition[];
  economicImpactEur: string;
}

const initial: FormState = {
  description: "",
  clientsAffected: "",
  clientsAffectedPercent: "",
  counterpartsAffectedPercent: "",
  transactionsCountPercent: "",
  transactionsValuePercent: "",
  relevantClientsAffected: false,
  durationHours: "",
  downtimeHours: "",
  memberStatesAffected: "",
  dataLossDimensions: [],
  dataLossAdverseImpact: false,
  criticalFunctionAffected: false,
  regulatedServicesAffected: false,
  maliciousUnauthorizedAccess: false,
  maliciousAccessDataLossPossible: false,
  reputationalImpactConditions: [],
  economicImpactEur: "",
};

const INSTANT_DESCRIPTION =
  "Erfolgreicher böswilliger unbefugter Zugriff auf die Netzwerk- und Informationssysteme, der zu Datenverlusten führen kann.";

/**
 * Vorfragen zum Kriterium "Kritikalität der betroffenen Dienste" (Art. 6 RTS).
 * Der Vorfall kann nur dann schwerwiegend sein, wenn mindestens ein Tatbestand
 * erfüllt ist (Art. 8 Abs. 1 RTS).
 */
type GateKey =
  | "criticalFunctionAffected"
  | "regulatedServicesAffected"
  | "maliciousUnauthorizedAccess";

const GATE_QUESTIONS: { key: GateKey; letter: string; question: string }[] = [
  {
    key: "criticalFunctionAffected",
    letter: "a",
    question:
      "Sind IKT-Dienste oder Netzwerk- und Informationssysteme betroffen, die kritische oder wichtige Funktionen unterstützen?",
  },
  {
    key: "regulatedServicesAffected",
    letter: "b",
    question:
      "Sind Finanzdienstleistungen betroffen, die zulassungs- bzw. registrierungspflichtig sind oder von zuständigen Behörden beaufsichtigt werden?",
  },
  {
    key: "maliciousUnauthorizedAccess",
    letter: "c",
    question:
      "Liegt ein erfolgreicher böswilliger und unbefugter Zugriff auf die Netzwerk- und Informationssysteme vor?",
  },
];

const GATE_SUMMARY_LABEL: Record<GateKey, string> = {
  criticalFunctionAffected: "Kritische/wichtige Funktion",
  regulatedServicesAffected: "Regulierte Finanzdienstleistung",
  maliciousUnauthorizedAccess: "Böswilliger Zugriff",
};

type GateAnswers = Record<GateKey, boolean | null>;

const noGateAnswers: GateAnswers = {
  criticalFunctionAffected: null,
  regulatedServicesAffected: null,
  maliciousUnauthorizedAccess: null,
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

type Stage = "questions" | "form";

export default function SeverityPage() {
  const [stage, setStage] = useState<Stage>("questions");
  const [gateAnswers, setGateAnswers] = useState<GateAnswers>(noGateAnswers);
  const [dataLossAnswer, setDataLossAnswer] = useState<boolean | null>(null);
  const [form, setForm] = useState<FormState>(initial);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeverityResult | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleReputation(id: ReputationCondition) {
    setForm((f) => ({
      ...f,
      reputationalImpactConditions: f.reputationalImpactConditions.includes(id)
        ? f.reputationalImpactConditions.filter((x) => x !== id)
        : [...f.reputationalImpactConditions, id],
    }));
  }

  function toggleDataLoss(id: DataLossDimension) {
    setForm((f) => {
      const dataLossDimensions = f.dataLossDimensions.includes(id)
        ? f.dataLossDimensions.filter((x) => x !== id)
        : [...f.dataLossDimensions, id];
      return {
        ...f,
        dataLossDimensions,
        // Ohne beeinträchtigte Schutzziele ist die Zusatzfrage nach den
        // nachteiligen Auswirkungen (Art. 9 Abs. 5 Buchst. a) gegenstandslos.
        dataLossAdverseImpact:
          dataLossDimensions.length > 0 ? f.dataLossAdverseImpact : false,
      };
    });
  }

  function reset() {
    setStage("questions");
    setGateAnswers(noGateAnswers);
    setDataLossAnswer(null);
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

  /**
   * Sobald alle Vorfragen beantwortet sind, geht es weiter: Bei böswilligem
   * Zugriff mit möglichem Datenverlust erfolgt die unmittelbare Einstufung als
   * schwerwiegend (Art. 8 Abs. 1 Buchst. a RTS), andernfalls die Erfassung der
   * übrigen Kriterien.
   */
  function advanceIfComplete(answers: GateAnswers, dataLoss: boolean | null) {
    if (GATE_QUESTIONS.some((q) => answers[q.key] === null)) return;
    if (answers.maliciousUnauthorizedAccess === true && dataLoss === null) return;
    setStage("form");
  }

  // Vorfragen 1a–c: Tatbestände des Art. 6 RTS (Kritikalität der Dienste).
  function answerGate(key: GateKey, value: boolean) {
    const next = { ...gateAnswers, [key]: value };
    setGateAnswers(next);
    setResult(null);
    const nextDataLoss =
      key === "maliciousUnauthorizedAccess" ? null : dataLossAnswer;
    if (key === "maliciousUnauthorizedAccess") setDataLossAnswer(null);
    setForm((f) => ({
      ...f,
      [key]: value,
      ...(key === "maliciousUnauthorizedAccess"
        ? { maliciousAccessDataLossPossible: false }
        : {}),
    }));
    advanceIfComplete(next, nextDataLoss);
  }

  // Vorfrage 2: Kann der böswillige Zugriff zu Datenverlusten führen?
  function answerDataLoss(value: boolean) {
    setDataLossAnswer(value);
    setForm((f) => ({ ...f, maliciousAccessDataLossPossible: value }));
    if (value) {
      // Art. 6 Buchst. c + Art. 9 Abs. 5 Buchst. b: unmittelbare Einstufung
      // als schwerwiegend – unabhängig von den übrigen Vorfragen.
      void classify({
        description: INSTANT_DESCRIPTION,
        criticalFunctionAffected: gateAnswers.criticalFunctionAffected === true,
        regulatedServicesAffected: gateAnswers.regulatedServicesAffected === true,
        maliciousUnauthorizedAccess: true,
        maliciousAccessDataLossPossible: true,
      });
    } else {
      advanceIfComplete(gateAnswers, value);
    }
  }

  function loadScenario(data: FormState) {
    setForm(data);
    setGateAnswers({
      criticalFunctionAffected: data.criticalFunctionAffected,
      regulatedServicesAffected: data.regulatedServicesAffected,
      maliciousUnauthorizedAccess: data.maliciousUnauthorizedAccess,
    });
    setDataLossAnswer(
      data.maliciousUnauthorizedAccess
        ? data.maliciousAccessDataLossPossible
        : null,
    );
    setStage("form");
    setResult(null);
  }

  async function onSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    await classify(form);
  }

  const metCount = result?.findings.filter((f) => f.thresholdMet).length ?? 0;
  const tone = result ? CLASSIFICATION[result.classification] : null;
  const instantResult = stage === "questions" && (result !== null || loading);
  // Steht bereits durch die Vorfragen fest, dass kein schwerwiegender Vorfall
  // vorliegt (kein Tatbestand des Art. 6 RTS erfüllt)?
  const ruledOutNonMajor =
    GATE_QUESTIONS.every((q) => gateAnswers[q.key] === false) &&
    !result &&
    !loading;

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
                      Erfolgreicher böswilliger unbefugter Zugriff mit möglichem
                      Datenverlust – unmittelbare Einstufung (Art. 8 Abs. 1
                      Buchst. a RTS). Details siehe Ergebnis.
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
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      1. Kritikalität der betroffenen Dienste (Art. 6 RTS)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Nur wenn mindestens einer der folgenden Tatbestände
                      erfüllt ist, kann ein schwerwiegender Vorfall vorliegen
                      (Art. 8 Abs. 1 RTS).
                    </p>
                  </div>
                  {GATE_QUESTIONS.map((q) => (
                    <div key={q.key} className="space-y-2">
                      <p className="text-sm">
                        <span className="font-medium">{q.letter})</span>{" "}
                        {q.question}
                      </p>
                      <div className="flex gap-2">
                        <ChoiceButton
                          selected={gateAnswers[q.key] === true}
                          onClick={() => answerGate(q.key, true)}
                        >
                          Ja
                        </ChoiceButton>
                        <ChoiceButton
                          selected={gateAnswers[q.key] === false}
                          onClick={() => answerGate(q.key, false)}
                        >
                          Nein
                        </ChoiceButton>
                      </div>
                    </div>
                  ))}
                </div>

                {gateAnswers.maliciousUnauthorizedAccess === true && (
                  <div className="space-y-3 border-t border-border/60 pt-6">
                    <p className="text-sm font-medium">
                      2. Kann der böswillige unbefugte Zugriff zu Datenverlusten
                      führen?
                    </p>
                    <div className="flex gap-2">
                      <ChoiceButton
                        selected={dataLossAnswer === true}
                        onClick={() => answerDataLoss(true)}
                      >
                        Ja
                      </ChoiceButton>
                      <ChoiceButton
                        selected={dataLossAnswer === false}
                        onClick={() => answerDataLoss(false)}
                      >
                        Nein
                      </ChoiceButton>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Falls ja, wird der Vorfall unmittelbar als schwerwiegend
                      eingestuft (Art. 8 Abs. 1 Buchst. a RTS). Andernfalls
                      erfassen Sie die übrigen Kriterien.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Ausführliche Erfassung der DORA-Kriterien */
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                  <div className="space-y-0.5 text-sm">
                    <p className="font-medium">
                      Vorfragen (Art. 6 RTS)
                    </p>
                    <p className="text-muted-foreground">
                      {GATE_QUESTIONS.map(
                        (q) =>
                          `${GATE_SUMMARY_LABEL[q.key]}: ${form[q.key] ? "Ja" : "Nein"}`,
                      ).join(" · ")}
                      {form.maliciousUnauthorizedAccess &&
                        ` · Datenverlust möglich: ${
                          form.maliciousAccessDataLossPossible ? "Ja" : "Nein"
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
                      label="Betroffene Kunden (% der Nutzer des Dienstes)"
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
                      label="Betroffene finanzielle Gegenparteien (%)"
                      htmlFor="counterpartsAffectedPercent"
                    >
                      <Input
                        id="counterpartsAffectedPercent"
                        type="number"
                        min={0}
                        max={100}
                        placeholder="z. B. 35"
                        value={form.counterpartsAffectedPercent}
                        onChange={(e) =>
                          update("counterpartsAffectedPercent", e.target.value)
                        }
                      />
                    </Field>
                    <Field
                      label="Betroffene Transaktionen (% der tägl. Ø-Anzahl)"
                      htmlFor="transactionsCountPercent"
                    >
                      <Input
                        id="transactionsCountPercent"
                        type="number"
                        min={0}
                        placeholder="z. B. 15"
                        value={form.transactionsCountPercent}
                        onChange={(e) =>
                          update("transactionsCountPercent", e.target.value)
                        }
                      />
                    </Field>
                    <Field
                      label="Betroffener Transaktionswert (% des tägl. Ø-Werts)"
                      htmlFor="transactionsValuePercent"
                    >
                      <Input
                        id="transactionsValuePercent"
                        type="number"
                        min={0}
                        placeholder="z. B. 15"
                        value={form.transactionsValuePercent}
                        onChange={(e) =>
                          update("transactionsValuePercent", e.target.value)
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
                  <p className="text-xs text-muted-foreground">
                    Lassen sich tatsächliche Zahlen nicht ermitteln, sind
                    Schätzungen auf Basis vergleichbarer Referenzzeiträume
                    zulässig (Art. 9 Abs. 1 RTS).
                  </p>
                  <div className="space-y-2">
                    <Label>Relevante Kunden oder Gegenparteien</Label>
                    <button
                      type="button"
                      aria-pressed={form.relevantClientsAffected}
                      onClick={() =>
                        update(
                          "relevantClientsAffected",
                          !form.relevantClientsAffected,
                        )
                      }
                      className={cn(
                        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                        form.relevantClientsAffected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 bg-background hover:border-primary/40 hover:bg-muted",
                      )}
                    >
                      Als relevant identifizierte Kunden/Gegenparteien betroffen
                    </button>
                    <p className="text-xs text-muted-foreground">
                      Kunden oder Gegenparteien, deren Beeinträchtigung die
                      Geschäftsziele oder die Markteffizienz berührt (Art. 1
                      Abs. 3 RTS) – erreicht die Schwelle für sich genommen
                      (Art. 9 Abs. 1 Buchst. f).
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Datenverluste</Label>
                    <div className="flex flex-wrap gap-2">
                      {DATA_LOSS_DIMENSIONS.map((d) => {
                        const active = form.dataLossDimensions.includes(d.id);
                        return (
                          <button
                            key={d.id}
                            type="button"
                            title={d.hint}
                            aria-pressed={active}
                            onClick={() => toggleDataLoss(d.id)}
                            className={cn(
                              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                              active
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border/60 bg-background hover:border-primary/40 hover:bg-muted",
                            )}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Betroffene Schutzziele auswählen (Art. 5 RTS). Die
                      Schwelle ist erst erreicht, wenn die Beeinträchtigung
                      zudem nachteilige Auswirkungen auf die Geschäftsziele
                      oder die Erfüllung regulatorischer Anforderungen hat oder
                      haben wird (Art. 9 Abs. 5 Buchst. a RTS).
                    </p>
                    {form.dataLossDimensions.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <button
                          type="button"
                          aria-pressed={form.dataLossAdverseImpact}
                          onClick={() =>
                            update(
                              "dataLossAdverseImpact",
                              !form.dataLossAdverseImpact,
                            )
                          }
                          className={cn(
                            "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                            form.dataLossAdverseImpact
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border/60 bg-background hover:border-primary/40 hover:bg-muted",
                          )}
                        >
                          Nachteilige Auswirkungen auf Geschäftsziele oder
                          regulatorische Anforderungen
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Reputationsauswirkung</Label>
                    <div className="flex flex-wrap gap-2">
                      {REPUTATION_CONDITIONS.map((c) => {
                        const active =
                          form.reputationalImpactConditions.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            title={c.hint}
                            aria-pressed={active}
                            onClick={() => toggleReputation(c.id)}
                            className={cn(
                              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                              active
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border/60 bg-background hover:border-primary/40 hover:bg-muted",
                            )}
                          >
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Erfüllte Bedingungen des Art. 2 Abs. 1 RTS auswählen – die
                      Schwelle ist erreicht, sobald mindestens eine Bedingung
                      erfüllt ist (Art. 9 Abs. 2 RTS). Berücksichtigen Sie die
                      bereits erlangte oder zu erwartende Sichtbarkeit des
                      Vorfalls (Art. 2 Abs. 2 RTS).
                    </p>
                  </div>
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
                  Kein Tatbestand des Kriteriums „Kritikalität der betroffenen
                  Dienste“ (Art. 6 RTS) erfüllt – ein schwerwiegender Vorfall
                  ist damit ausgeschlossen (Art. 8 Abs. 1 RTS). Erfassen Sie
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
