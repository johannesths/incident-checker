"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ClipboardList,
  Clock,
  Loader2,
  Send,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { StepRow, type StepStatus } from "@/components/step-row";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CRITERION_BY_ID } from "@/lib/dora/criteria";
import {
  REPORT_TYPES,
  REPORT_TYPE_BY_ID,
  SIMULATION_NOTICE,
  getReportObligation,
  type ObligationLevel,
} from "@/lib/dora/reporting";
import {
  STORAGE_KEYS,
  saveSession,
  updateSession,
  useSessionValue,
} from "@/lib/session-store";
import type { ReportInput, ReportReceipt, SeverityResult } from "@/lib/schemas";

/** Im Formular erfasste Angaben (die Einstufung kommt aus Schritt 02). */
type ReportForm = Omit<
  ReportInput,
  "classification" | "criteriaMet" | "voluntary"
> & { voluntary: boolean };

const emptyForm: ReportForm = {
  reportType: "initial",
  institutionName: "",
  lei: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  incidentReference: "",
  detectedAt: "",
  occurredAt: "",
  description: "",
  previousSubmissionId: "",
  voluntary: false,
};

const MIN_DESCRIPTION_LENGTH = 10;
const LEI_PATTERN = /^[A-Z0-9]{20}$/;

const OBLIGATION_TONE: Record<
  ObligationLevel,
  { icon: typeof ShieldAlert; bar: string; chip: string }
> = {
  required: {
    icon: ShieldAlert,
    bar: "bg-destructive",
    chip: "bg-destructive/10 text-destructive",
  },
  unclear: {
    icon: ShieldQuestion,
    bar: "bg-warning",
    chip: "bg-warning/15 text-warning",
  },
  none: {
    icon: ShieldCheck,
    bar: "bg-success",
    chip: "bg-success/15 text-success",
  },
};

/* ---------------------------------------------------------------------------
 * Schritte der Meldung
 * ------------------------------------------------------------------------- */

type StepId = "type" | "institution" | "contact" | "incident" | "facts";

interface StepDef {
  id: StepId;
  title: string;
  article?: string;
  hint?: string;
  /** Kurzfassung der Angaben für die eingeklappte Ansicht. */
  summary: (f: ReportForm) => string;
  /**
   * Sind die Pflichtangaben vollständig? Anders als bei den
   * Klassifizierungskriterien ist hier kein Schritt entbehrlich – eine Meldung
   * ohne diese Angaben nimmt die Aufsicht nicht entgegen.
   */
  complete: (f: ReportForm) => boolean;
}

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatDateTime(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormat.format(date);
}

function join(parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" · ");
}

const STEPS: StepDef[] = [
  {
    id: "type",
    title: "Meldeart",
    article: "Art. 19 Abs. 4 DORA",
    hint: "Erst-, Zwischen- oder Abschlussmeldung. Folgemeldungen verweisen auf die Vorgangsnummer der vorherigen Meldung.",
    summary: (f) =>
      join([
        REPORT_TYPE_BY_ID[f.reportType].label,
        f.reportType !== "initial" &&
          f.previousSubmissionId &&
          `Bezug: ${f.previousSubmissionId}`,
      ]),
    complete: (f) =>
      f.reportType === "initial" || f.previousSubmissionId.trim().length > 0,
  },
  {
    id: "institution",
    title: "Meldendes Finanzunternehmen",
    hint: "Angaben zur Identifikation des Unternehmens gegenüber der Aufsicht.",
    summary: (f) => join([f.institutionName, f.lei]),
    complete: (f) =>
      f.institutionName.trim().length > 0 && LEI_PATTERN.test(f.lei),
  },
  {
    id: "contact",
    title: "Ansprechpartner",
    hint: "Kontakt für Rückfragen der Aufsicht zum gemeldeten Vorfall.",
    summary: (f) => join([f.contactName, f.contactEmail, f.contactPhone]),
    complete: (f) =>
      f.contactName.trim().length > 0 && /^\S+@\S+\.\S+$/.test(f.contactEmail),
  },
  {
    id: "incident",
    title: "Vorfall",
    hint: "Der Zeitpunkt der Kenntniserlangung ist Ausgangspunkt der 24-Stunden-Frist für die Erstmeldung.",
    summary: (f) =>
      join([
        f.incidentReference,
        f.detectedAt && `Kenntnis ${formatDateTime(f.detectedAt)}`,
        f.occurredAt && `Auftreten ${formatDateTime(f.occurredAt)}`,
      ]),
    complete: (f) =>
      f.incidentReference.trim().length > 0 && f.detectedAt.length > 0,
  },
  {
    id: "facts",
    title: "Sachverhalt",
    hint: "Darstellung des Vorfalls; aus Schritt 02 vorbelegt und hier ergänzbar.",
    summary: (f) => f.description.trim(),
    complete: (f) => f.description.trim().length >= MIN_DESCRIPTION_LENGTH,
  },
];

const initialStatus = Object.fromEntries(
  STEPS.map((s) => [s.id, "pending" as StepStatus]),
) as Record<StepId, StepStatus>;

function nextStepId(id: StepId): StepId | null {
  const index = STEPS.findIndex((s) => s.id === id);
  return STEPS[index + 1]?.id ?? null;
}

interface ReportDraft {
  form: ReportForm;
  stepStatus: Record<StepId, StepStatus>;
  /** Aktuell aufgeklappter Schritt; null = alle eingeklappt. */
  activeStep: StepId | null;
}

function initialDraft(description: string): ReportDraft {
  return {
    form: { ...emptyForm, description },
    stepStatus: initialStatus,
    activeStep: "type",
  };
}

/**
 * Ergänzt einen gespeicherten Stand um fehlende Felder. Eine frühere Fassung
 * dieser Seite legte das Formular flach ab (ohne Schritte); solche Stände
 * werden übernommen, statt die Seite scheitern zu lassen.
 */
function withDefaults(
  stored: (Partial<ReportDraft> & Partial<ReportForm>) | null | undefined,
  description: string,
): ReportDraft {
  const base = initialDraft(description);
  if (!stored) return base;
  const form = stored.form ?? (stored.reportType ? (stored as ReportForm) : null);
  return {
    form: { ...base.form, ...form },
    stepStatus: { ...initialStatus, ...stored.stepStatus },
    activeStep: stored.activeStep !== undefined ? stored.activeStep : base.activeStep,
  };
}

export default function ReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const result = useSessionValue<SeverityResult>(STORAGE_KEYS.severityResult);
  // Nur die Beschreibung wird aus Schritt 02 übernommen; der dortige Entwurf
  // wird ausschließlich lesend berührt.
  const severityDraft = useSessionValue<{ form?: { description?: string } }>(
    STORAGE_KEYS.severityDraft,
  );
  const prefillDescription = severityDraft?.form?.description ?? "";
  const stored = useSessionValue<Partial<ReportDraft> & Partial<ReportForm>>(
    STORAGE_KEYS.reportDraft,
  );
  const draft = withDefaults(stored, prefillDescription);
  const { form, stepStatus, activeStep } = draft;

  function patch(fn: (d: ReportDraft) => ReportDraft) {
    updateSession<Partial<ReportDraft> & Partial<ReportForm>>(
      STORAGE_KEYS.reportDraft,
      (current) => fn(withDefaults(current, prefillDescription)),
    );
  }

  function update<K extends keyof ReportForm>(key: K, value: ReportForm[K]) {
    patch((d) => ({ ...d, form: { ...d.form, [key]: value } }));
  }

  function toggleStep(id: StepId) {
    patch((d) => ({ ...d, activeStep: d.activeStep === id ? null : id }));
  }

  function completeStep(id: StepId) {
    patch((d) => ({
      ...d,
      stepStatus: { ...d.stepStatus, [id]: "done" },
      activeStep: nextStepId(id),
    }));
  }

  async function onSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!result) return;
    const incomplete = STEPS.find((s) => !s.complete(form));
    if (incomplete) {
      toast.error(`Bitte vervollständigen Sie: ${incomplete.title}.`);
      patch((d) => ({ ...d, activeStep: incomplete.id }));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          classification: result.classification,
          criteriaMet: result.findings
            .filter((f) => f.thresholdMet)
            .map((f) => f.criterionId),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Übermittlung fehlgeschlagen.");
      }
      saveSession(
        STORAGE_KEYS.reportReceipt,
        (await res.json()) as ReportReceipt,
      );
      router.push("/meldung/bestaetigung");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unbekannter Fehler.");
      setLoading(false);
    }
  }

  /* --- Felder je Schritt -------------------------------------------------- */

  function stepFields(id: StepId) {
    switch (id) {
      case "type":
        return (
          <>
            <div className="grid gap-2 sm:grid-cols-3">
              {REPORT_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  title={t.description}
                  onClick={() => update("reportType", t.id)}
                  className={cn(
                    "rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                    form.reportType === t.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 bg-background hover:border-primary/40 hover:bg-muted",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Frist: </span>
              {REPORT_TYPE_BY_ID[form.reportType].deadline} (
              {REPORT_TYPE_BY_ID[form.reportType].article})
            </p>
            {form.reportType !== "initial" && (
              <Field
                label="Vorgangsnummer der vorherigen Meldung"
                htmlFor="previousSubmissionId"
              >
                <Input
                  id="previousSubmissionId"
                  placeholder="z. B. SIM-20260810-ABC123"
                  value={form.previousSubmissionId}
                  onChange={(e) =>
                    update("previousSubmissionId", e.target.value)
                  }
                />
              </Field>
            )}
          </>
        );

      case "institution":
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name des Unternehmens" htmlFor="institutionName">
              <Input
                id="institutionName"
                value={form.institutionName}
                onChange={(e) => update("institutionName", e.target.value)}
              />
            </Field>
            <Field label="LEI (20 Zeichen)" htmlFor="lei">
              <Input
                id="lei"
                maxLength={20}
                placeholder="z. B. 529900T8BM49AURSDO55"
                value={form.lei}
                onChange={(e) =>
                  update("lei", e.target.value.toUpperCase().trim())
                }
              />
            </Field>
          </div>
        );

      case "contact":
        return (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Name" htmlFor="contactName">
              <Input
                id="contactName"
                value={form.contactName}
                onChange={(e) => update("contactName", e.target.value)}
              />
            </Field>
            <Field label="E-Mail" htmlFor="contactEmail">
              <Input
                id="contactEmail"
                type="email"
                value={form.contactEmail}
                onChange={(e) => update("contactEmail", e.target.value)}
              />
            </Field>
            <Field label="Telefon (optional)" htmlFor="contactPhone">
              <Input
                id="contactPhone"
                type="tel"
                value={form.contactPhone}
                onChange={(e) => update("contactPhone", e.target.value)}
              />
            </Field>
          </div>
        );

      case "incident":
        return (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Interne Vorfallreferenz" htmlFor="incidentReference">
              <Input
                id="incidentReference"
                placeholder="z. B. INC-2026-0042"
                value={form.incidentReference}
                onChange={(e) => update("incidentReference", e.target.value)}
              />
            </Field>
            <Field label="Kenntniserlangung" htmlFor="detectedAt">
              <Input
                id="detectedAt"
                type="datetime-local"
                value={form.detectedAt}
                onChange={(e) => update("detectedAt", e.target.value)}
              />
            </Field>
            <Field label="Auftreten (optional)" htmlFor="occurredAt">
              <Input
                id="occurredAt"
                type="datetime-local"
                value={form.occurredAt}
                onChange={(e) => update("occurredAt", e.target.value)}
              />
            </Field>
          </div>
        );

      case "facts":
        return (
          <Field label="Sachverhalt" htmlFor="description">
            <Textarea
              id="description"
              rows={6}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </Field>
        );
    }
  }

  /* --- Darstellung -------------------------------------------------------- */

  // undefined: Der Speicher wurde noch nicht gelesen (Hydration).
  if (result === undefined) return null;

  if (!result) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/70 bg-muted/20 p-10 text-center">
          <ClipboardList className="size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Für eine Meldung wird die Einstufung aus Schritt 02 benötigt.
            Bestimmen Sie zunächst den Schweregrad des Vorfalls.
          </p>
          <Link href="/severity" className={cn(buttonVariants({ size: "sm" }))}>
            Zur Schweregradbestimmung
          </Link>
        </div>
      </div>
    );
  }

  const obligation = getReportObligation(result.classification);
  const tone = OBLIGATION_TONE[obligation.level];
  const criteriaMet = result.findings.filter((f) => f.thresholdMet);
  // Ohne Meldepflicht ist nur die ausdrücklich freiwillige Meldung möglich.
  const blocked = obligation.level === "none" && !form.voluntary;
  const addressed = STEPS.filter((s) => stepStatus[s.id] !== "pending").length;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        step="Schritt 03"
        title="Meldung an die BaFin"
        desc="Erstellen Sie aus der Einstufung die Meldung nach Art. 19 DORA – Angabe für Angabe, wie bei der Schweregradbestimmung."
      />

      <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
        <div className="space-y-1 text-sm">
          <p className="font-medium">Keine echte Übermittlung</p>
          <p className="text-muted-foreground">{SIMULATION_NOTICE}</p>
        </div>
      </div>

      {/* Besteht überhaupt eine Meldepflicht? */}
      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card/70 p-5 backdrop-blur">
        <div className={cn("absolute inset-x-0 top-0 h-1", tone.bar)} />
        <div className="flex items-start gap-4">
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl",
              tone.chip,
            )}
          >
            <tone.icon className="size-5" />
          </span>
          <div className="space-y-1">
            <h2 className="font-semibold">{obligation.label}</h2>
            <p className="text-sm text-muted-foreground">
              {obligation.explanation}
            </p>
          </div>
        </div>

        {criteriaMet.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-border/60 pt-4">
            <p className="text-xs font-medium">
              Kriterien mit erreichter Schwelle (werden mitgemeldet)
            </p>
            <div className="flex flex-wrap gap-2">
              {criteriaMet.map((f) => (
                <span
                  key={f.criterionId}
                  className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive"
                >
                  {CRITERION_BY_ID[f.criterionId].label}
                </span>
              ))}
            </div>
          </div>
        )}

        {obligation.level === "none" && (
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
            <Button
              type="button"
              size="sm"
              variant={form.voluntary ? "outline" : "default"}
              onClick={() => update("voluntary", !form.voluntary)}
            >
              {form.voluntary
                ? "Freiwillige Meldung verwerfen"
                : "Trotzdem freiwillig melden"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Freiwillige Meldung erheblicher Cyberbedrohungen (Art. 19 Abs. 2
              DORA).
            </span>
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <ol className="space-y-3">
          {STEPS.map((step, index) => {
            const status = stepStatus[step.id];
            const open = activeStep === step.id;
            const isLast = index === STEPS.length - 1;
            const ready = step.complete(form);
            return (
              <StepRow
                key={step.id}
                marker={
                  status === "done" ? <Check className="size-5" /> : index + 1
                }
                status={status}
                title={step.title}
                article={step.article}
                open={open}
                summary={step.summary(form) || "Noch keine Angaben"}
                isLast={isLast}
                onToggle={() => toggleStep(step.id)}
              >
                {step.hint && (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {step.hint}
                  </p>
                )}
                {stepFields(step.id)}
                <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
                  <Button
                    type="button"
                    size="sm"
                    disabled={!ready}
                    onClick={() => completeStep(step.id)}
                  >
                    {isLast ? "Fertig" : "Weiter"}
                    <ArrowRight className="size-4" />
                  </Button>
                  {!ready && (
                    <span className="text-xs text-muted-foreground">
                      Pflichtangaben dieses Schritts sind noch unvollständig.
                    </span>
                  )}
                </div>
              </StepRow>
            );
          })}
        </ol>

        <div className="space-y-4 rounded-xl border border-border/60 bg-card/70 p-5 backdrop-blur">
          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold">Übermittlung</p>
              <p className="text-xs text-muted-foreground">
                {addressed} von {STEPS.length} Abschnitten bearbeitet
              </p>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(addressed / STEPS.length) * 100}%` }}
              />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              {REPORT_TYPE_BY_ID[form.reportType].label}:{" "}
              {REPORT_TYPE_BY_ID[form.reportType].deadline}.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link
              href="/severity/ergebnis"
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              Zurück zur Einstufung
            </Link>
            <Button
              type="submit"
              size="lg"
              disabled={loading || blocked}
              className="w-full sm:w-auto sm:min-w-64"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Meldung absenden (Simulation)
            </Button>
          </div>
          {blocked && (
            <p className="text-right text-xs text-muted-foreground">
              Ohne Meldepflicht ist die Übermittlung nur als ausdrücklich
              freiwillige Meldung möglich.
            </p>
          )}
        </div>
      </form>
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
