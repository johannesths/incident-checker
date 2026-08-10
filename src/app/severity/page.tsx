"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DATA_LOSS_DIMENSIONS,
  REPUTATION_CONDITIONS,
  GEO_IMPACT_AREAS,
  type DataLossDimension,
  type ReputationCondition,
  type GeoImpactArea,
} from "@/lib/dora/criteria";
import { CLASSIFICATION } from "@/lib/dora/presentation";
import { SEVERITY_SCENARIOS } from "@/lib/demo-data";
import {
  STORAGE_KEYS,
  clearSession,
  saveSession,
  updateSession,
  useSessionValue,
} from "@/lib/session-store";
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
  geoImpactAreas: GeoImpactArea[];
  dataLossDimensions: DataLossDimension[];
  /** null = Zusatzfrage noch nicht beantwortet. */
  dataLossAdverseImpact: boolean | null;
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
  geoImpactAreas: [],
  dataLossDimensions: [],
  dataLossAdverseImpact: null,
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

/**
 * Sind alle Vorfragen beantwortet? Erst dann geht es weiter – bei böswilligem
 * Zugriff einschließlich der Zusatzfrage nach möglichen Datenverlusten.
 */
function questionsComplete(
  answers: GateAnswers,
  dataLoss: boolean | null,
): boolean {
  if (GATE_QUESTIONS.some((q) => answers[q.key] === null)) return false;
  return !(answers.maliciousUnauthorizedAccess === true && dataLoss === null);
}

type Stage = "questions" | "form";

/** Im sessionStorage gesicherter Bearbeitungsstand. */
interface SeverityDraft {
  stage: Stage;
  gateAnswers: GateAnswers;
  dataLossAnswer: boolean | null;
  form: FormState;
}

const initialDraft: SeverityDraft = {
  stage: "questions",
  gateAnswers: noGateAnswers,
  dataLossAnswer: null,
  form: initial,
};

export default function SeverityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  // Der Bearbeitungsstand liegt im sessionStorage, damit der Rückweg von der
  // Ergebnisseite die Eingaben erhält.
  const draft =
    useSessionValue<SeverityDraft>(STORAGE_KEYS.severityDraft) ?? initialDraft;
  const { stage, gateAnswers, dataLossAnswer, form } = draft;

  function patch(fn: (d: SeverityDraft) => SeverityDraft) {
    updateSession<SeverityDraft>(
      STORAGE_KEYS.severityDraft,
      (current: SeverityDraft | null) => fn(current ?? initialDraft),
    );
  }

  function setStage(next: Stage) {
    patch((d) => ({ ...d, stage: next }));
  }

  function updateForm(fn: (f: FormState) => FormState) {
    patch((d) => ({ ...d, form: fn(d.form) }));
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    updateForm((f) => ({ ...f, [key]: value }));
  }

  function toggleGeoArea(id: GeoImpactArea) {
    updateForm((f) => ({
      ...f,
      geoImpactAreas: f.geoImpactAreas.includes(id)
        ? f.geoImpactAreas.filter((x) => x !== id)
        : [...f.geoImpactAreas, id],
    }));
  }

  function toggleReputation(id: ReputationCondition) {
    updateForm((f) => ({
      ...f,
      reputationalImpactConditions: f.reputationalImpactConditions.includes(id)
        ? f.reputationalImpactConditions.filter((x) => x !== id)
        : [...f.reputationalImpactConditions, id],
    }));
  }

  function toggleDataLoss(id: DataLossDimension) {
    updateForm((f) => {
      const dataLossDimensions = f.dataLossDimensions.includes(id)
        ? f.dataLossDimensions.filter((x) => x !== id)
        : [...f.dataLossDimensions, id];
      return {
        ...f,
        dataLossDimensions,
        // Ohne beeinträchtigte Schutzziele ist die Zusatzfrage nach den
        // nachteiligen Auswirkungen (Art. 9 Abs. 5 Buchst. a) gegenstandslos.
        dataLossAdverseImpact:
          dataLossDimensions.length > 0 ? f.dataLossAdverseImpact : null,
      };
    });
  }

  function reset() {
    clearSession(STORAGE_KEYS.severityDraft, STORAGE_KEYS.severityResult);
  }

  /** Stuft ein und wechselt anschließend auf die Ergebnisseite. */
  async function classify(body: FormState | Record<string, unknown>) {
    setLoading(true);
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
      saveSession(
        STORAGE_KEYS.severityResult,
        (await res.json()) as SeverityResult,
      );
      router.push("/severity/ergebnis");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unbekannter Fehler.");
      setLoading(false);
    }
  }

  // Vorfragen 1a–c: Tatbestände des Art. 6 RTS (Kritikalität der Dienste).
  function answerGate(key: GateKey, value: boolean) {
    patch((d) => {
      const answers = { ...d.gateAnswers, [key]: value };
      // Entfällt die Vorfrage c, entfällt auch die Zusatzfrage dazu.
      const nextDataLoss =
        key === "maliciousUnauthorizedAccess" ? null : d.dataLossAnswer;
      return {
        ...d,
        gateAnswers: answers,
        dataLossAnswer: nextDataLoss,
        form: {
          ...d.form,
          [key]: value,
          ...(key === "maliciousUnauthorizedAccess"
            ? { maliciousAccessDataLossPossible: false }
            : {}),
        },
        stage: questionsComplete(answers, nextDataLoss) ? "form" : d.stage,
      };
    });
  }

  // Vorfrage 2: Kann der böswillige Zugriff zu Datenverlusten führen?
  function answerDataLoss(value: boolean) {
    patch((d) => ({
      ...d,
      dataLossAnswer: value,
      form: { ...d.form, maliciousAccessDataLossPossible: value },
      // Bei "Ja" folgt die unmittelbare Einstufung, das Formular entfällt.
      stage:
        !value && questionsComplete(d.gateAnswers, value) ? "form" : d.stage,
    }));
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
    }
  }

  function loadScenario(data: FormState) {
    saveSession<SeverityDraft>(STORAGE_KEYS.severityDraft, {
      stage: "form",
      gateAnswers: {
        criticalFunctionAffected: data.criticalFunctionAffected,
        regulatedServicesAffected: data.regulatedServicesAffected,
        maliciousUnauthorizedAccess: data.maliciousUnauthorizedAccess,
      },
      dataLossAnswer: data.maliciousUnauthorizedAccess
        ? data.maliciousAccessDataLossPossible
        : null,
      form: data,
    });
  }

  async function onSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    // Unbeantwortete Zusatzfrage zählt als "Nein" (Schwelle nicht erreicht).
    await classify({
      ...form,
      dataLossAdverseImpact: form.dataLossAdverseImpact === true,
    });
  }

  // Steht bereits durch die Vorfragen fest, dass kein schwerwiegender Vorfall
  // vorliegt (kein Tatbestand des Art. 6 RTS erfüllt)?
  const ruledOutNonMajor = GATE_QUESTIONS.every(
    (q) => gateAnswers[q.key] === false,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        step="Schritt 02"
        title="Schweregrad bestimmen (DORA)"
        desc="Beantworten Sie zunächst die Vorfragen zur Kritikalität der betroffenen Dienste. Je nach Antwort erfolgt eine unmittelbare Einstufung oder die Erfassung der übrigen DORA-Klassifizierungskriterien. Das Ergebnis erscheint nach dem Absenden auf einer eigenen Seite."
      />

      {stage === "questions" ? (
        <Card className="mx-auto w-full max-w-3xl border-border/60 bg-card/70 backdrop-blur">
          <CardContent className="p-6 sm:p-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <Loader2 className="size-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Der Vorfall wird eingestuft …
                </p>
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>
      ) : (
        /* Ausführliche Erfassung der DORA-Kriterien */
        <Card className="border-border/60 bg-card/70 backdrop-blur">
          <CardContent className="space-y-5 p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="space-y-0.5 text-sm">
                <p className="font-medium">Vorfragen (Art. 6 RTS)</p>
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
                onClick={() => setStage("questions")}
              >
                <ArrowLeft className="size-4" />
                Ändern
              </Button>
            </div>

            {ruledOutNonMajor && (
              <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-success/5 p-4">
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl",
                    CLASSIFICATION.non_major.chip,
                  )}
                >
                  <ShieldCheck className="size-5" />
                </span>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">
                    Vorläufig: {CLASSIFICATION.non_major.label}
                  </p>
                  <p className="text-muted-foreground">
                    Kein Tatbestand des Kriteriums „Kritikalität der betroffenen
                    Dienste“ (Art. 6 RTS) erfüllt – ein schwerwiegender Vorfall
                    ist damit ausgeschlossen (Art. 8 Abs. 1 RTS). Erfassen Sie
                    bei Bedarf die übrigen Angaben zur Dokumentation und
                    bestätigen Sie mit „Schweregrad bestimmen“.
                  </p>
                </div>
              </div>
            )}

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

            <form onSubmit={onSubmit} className="space-y-4">
              <FormSection title="Vorfallbeschreibung">
                <Textarea
                  id="description"
                  required
                  rows={4}
                  placeholder="Was ist passiert?"
                  aria-label="Vorfallbeschreibung"
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                />
              </FormSection>

              <FormSection
                title="Kunden, Gegenparteien & Transaktionen"
                article="Art. 1, Art. 9 Abs. 1"
                hint="Schwelle erreicht ab > 10 % der Dienstnutzer, > 100.000 Kunden, > 30 % der Gegenparteien, > 10 % der täglichen Transaktionen (Anzahl oder Wert) oder bei relevanten Kunden/Gegenparteien. Schätzungen sind zulässig."
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Kunden (Anzahl)" htmlFor="clientsAffected">
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
                    label="Kunden (% der Dienstnutzer)"
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
                    label="Finanzielle Gegenparteien (%)"
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
                    label="Transaktionen (% der tägl. Ø-Anzahl)"
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
                    label="Transaktionswert (% des tägl. Ø-Werts)"
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
                </div>
                <TogglePill
                  active={form.relevantClientsAffected}
                  title="Kunden oder Gegenparteien, deren Beeinträchtigung die Geschäftsziele oder die Markteffizienz berührt (Art. 1 Abs. 3 RTS) – erreicht die Schwelle für sich genommen."
                  onClick={() =>
                    update(
                      "relevantClientsAffected",
                      !form.relevantClientsAffected,
                    )
                  }
                >
                  Relevante Kunden/Gegenparteien betroffen
                </TogglePill>
              </FormSection>

              <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
                <FormSection
                  title="Dauer & Ausfallzeit"
                  article="Art. 3, Art. 9 Abs. 3"
                  hint="Schwelle: Dauer über 24 Stunden oder Ausfallzeit über 2 Stunden bei IKT-Diensten kritischer/wichtiger Funktionen."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Dauer (Stunden)" htmlFor="durationHours">
                      <Input
                        id="durationHours"
                        type="number"
                        min={0}
                        value={form.durationHours}
                        onChange={(e) =>
                          update("durationHours", e.target.value)
                        }
                      />
                    </Field>
                    <Field
                      label="Ausfallzeit krit./wichtiger Dienste (Stunden)"
                      htmlFor="downtimeHours"
                    >
                      <Input
                        id="downtimeHours"
                        type="number"
                        min={0}
                        value={form.downtimeHours}
                        onChange={(e) =>
                          update("downtimeHours", e.target.value)
                        }
                      />
                    </Field>
                  </div>
                </FormSection>

                <FormSection
                  title="Geografische Ausbreitung"
                  article="Art. 4, Art. 9 Abs. 4"
                  hint="Schwelle: Auswirkungen in mindestens zwei Mitgliedstaaten, sofern dort Kunden/Gegenparteien, Gruppenunternehmen oder Marktinfrastrukturen erheblich betroffen sind."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Mitgliedstaaten mit Auswirkungen"
                      htmlFor="memberStatesAffected"
                    >
                      <Input
                        id="memberStatesAffected"
                        type="number"
                        min={0}
                        value={form.memberStatesAffected}
                        onChange={(e) => {
                          const value = e.target.value;
                          updateForm((f) => ({
                            ...f,
                            memberStatesAffected: value,
                            // Unter zwei Mitgliedstaaten ist die Zusatzfrage
                            // nach der Erheblichkeit (Art. 4) gegenstandslos.
                            geoImpactAreas:
                              Number(value) >= 2 ? f.geoImpactAreas : [],
                          }));
                        }}
                      />
                    </Field>
                  </div>
                  {Number(form.memberStatesAffected) >= 2 && (
                    <div className="space-y-2">
                      <Label>Erheblich betroffene Bereiche</Label>
                      <div className="flex flex-wrap gap-2">
                        {GEO_IMPACT_AREAS.map((a) => (
                          <TogglePill
                            key={a.id}
                            active={form.geoImpactAreas.includes(a.id)}
                            title={a.hint}
                            onClick={() => toggleGeoArea(a.id)}
                          >
                            {a.label}
                          </TogglePill>
                        ))}
                      </div>
                    </div>
                  )}
                </FormSection>
              </div>

              <FormSection
                title="Datenverluste"
                article="Art. 5, Art. 9 Abs. 5"
                hint="Schwelle: beeinträchtigtes Schutzziel mit nachteiligen Folgen für Geschäftsziele oder regulatorische Pflichten."
              >
                <div className="flex flex-wrap gap-2">
                  {DATA_LOSS_DIMENSIONS.map((d) => (
                    <TogglePill
                      key={d.id}
                      active={form.dataLossDimensions.includes(d.id)}
                      title={d.hint}
                      onClick={() => toggleDataLoss(d.id)}
                    >
                      {d.label}
                    </TogglePill>
                  ))}
                </div>
                {form.dataLossDimensions.length > 0 && (
                  <div className="space-y-3 rounded-lg border border-border/60 bg-background/60 p-3">
                    <p className="text-sm font-medium">
                      Hat oder wird die Beeinträchtigung nachteilige
                      Auswirkungen auf die Geschäftsziele oder die Erfüllung
                      regulatorischer Anforderungen haben?
                    </p>
                    <div className="flex gap-2 sm:max-w-sm">
                      <ChoiceButton
                        selected={form.dataLossAdverseImpact === true}
                        onClick={() => update("dataLossAdverseImpact", true)}
                      >
                        Ja
                      </ChoiceButton>
                      <ChoiceButton
                        selected={form.dataLossAdverseImpact === false}
                        onClick={() => update("dataLossAdverseImpact", false)}
                      >
                        Nein
                      </ChoiceButton>
                    </div>
                  </div>
                )}
              </FormSection>

              <FormSection
                title="Reputationsauswirkung"
                article="Art. 2, Art. 9 Abs. 2"
                hint="Schwelle erreicht, sobald mindestens eine Bedingung erfüllt ist – auch die zu erwartende Sichtbarkeit des Vorfalls zählt."
              >
                <div className="flex flex-wrap gap-2">
                  {REPUTATION_CONDITIONS.map((c) => (
                    <TogglePill
                      key={c.id}
                      active={form.reputationalImpactConditions.includes(c.id)}
                      title={c.hint}
                      onClick={() => toggleReputation(c.id)}
                    >
                      {c.label}
                    </TogglePill>
                  ))}
                </div>
              </FormSection>

              <FormSection
                title="Wirtschaftliche Auswirkung"
                article="Art. 7, Art. 9 Abs. 6"
                hint="Schwelle: Kosten und Verluste über 100.000 EUR – brutto, ohne Verrechnung von Rückflüssen; laufende Betriebskosten zählen nicht."
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field
                    label="Kosten und Verluste (EUR)"
                    htmlFor="economicImpactEur"
                  >
                    <Input
                      id="economicImpactEur"
                      type="number"
                      min={0}
                      placeholder="z. B. 250000"
                      value={form.economicImpactEur}
                      onChange={(e) =>
                        update("economicImpactEur", e.target.value)
                      }
                    />
                  </Field>
                </div>
              </FormSection>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={reset}
                  disabled={loading}
                >
                  <RotateCcw className="size-4" />
                  Neue Bewertung
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  size="lg"
                  className="w-full sm:w-auto sm:min-w-64"
                >
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Schweregrad bestimmen
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
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

/**
 * Abschnitt je DORA-Kriterium: Titel, RTS-Fundstelle und eine kompakte
 * Schwellen-Zusammenfassung – Details stehen in den Tooltips der Optionen.
 */
function FormSection({
  title,
  article,
  hint,
  children,
}: {
  title: string;
  article?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="h-full space-y-4 rounded-xl border border-border/50 bg-muted/20 p-4 sm:p-5">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {article && (
            <span className="shrink-0 rounded-full border border-border/60 bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {article} RTS
            </span>
          )}
        </div>
        {hint && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function TogglePill({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-left text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border/60 bg-background hover:border-primary/40 hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
