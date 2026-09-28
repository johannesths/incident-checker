"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Info, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";
import { TRIAGE_SCENARIOS } from "@/lib/demo-data";
import {
  DEFAULT_CLAUDE_MODEL,
  claudeModelLabel,
  type AiAvailability,
} from "@/lib/ai/models";
import {
  activeAnthropicApiKey,
  aiRequestHeaders,
} from "@/lib/credentials/credentials";
import { useCredentials } from "@/lib/credentials/store";
import {
  STORAGE_KEYS,
  saveSession,
  updateSession,
  useSessionValue,
} from "@/lib/session-store";
import type { TriageInput, TriageResult } from "@/lib/schemas";

const emptyForm: TriageInput = {
  description: "",
  affectedSystem: "",
  reportedBy: "",
  symptoms: "",
};

export default function TriagePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  // Der Entwurf liegt im sessionStorage, damit der Rückweg von der
  // Ergebnisseite die Eingaben erhält.
  const form = useSessionValue<TriageInput>(STORAGE_KEYS.triageDraft) ?? emptyForm;
  // Schlüssel und Modellwahl gehen als Kopfzeilen mit; ohne gültigen Schlüssel
  // bewertet der Server regelbasiert – es sei denn, er hat selbst einen.
  const credentials = useCredentials();
  const apiKey = credentials ? activeAnthropicApiKey(credentials) : null;
  const availability = useAiAvailability();

  function setForm(next: TriageInput) {
    saveSession(STORAGE_KEYS.triageDraft, next);
  }

  function update<K extends keyof TriageInput>(key: K, value: TriageInput[K]) {
    updateSession<TriageInput>(STORAGE_KEYS.triageDraft, (f) => ({
      ...(f ?? emptyForm),
      [key]: value,
    }));
  }

  async function onSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(credentials ? aiRequestHeaders(credentials) : {}),
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Anfrage fehlgeschlagen.");
      }
      saveSession(STORAGE_KEYS.triageResult, (await res.json()) as TriageResult);
      router.push("/triage/ergebnis");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unbekannter Fehler.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        step="Schritt 01"
        title="Triage"
        desc="Erfassen Sie das mögliche Ereignis. Die Anwendung schätzt ein, ob ein IKT-bezogener Vorfall vorliegt. Das Ergebnis erscheint nach dem Absenden auf einer eigenen Seite."
      />

      {credentials && availability && (
        <EngineNotice
          engine={
            apiKey ? "own-key" : availability.serverKey ? "server-key" : "rules"
          }
          model={claudeModelLabel(credentials.anthropicModel)}
        />
      )}

      <Card className="border-border/60 bg-card/70 backdrop-blur">
        <CardContent className="p-6 sm:p-8">
          <DemoBar onLoad={setForm} />
          <form onSubmit={onSubmit} className="space-y-6">
            <Field label="Beschreibung" htmlFor="description">
              <Textarea
                id="description"
                required
                rows={8}
                maxLength={10_000}
                placeholder="Was ist passiert?"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </Field>
            <div className="grid gap-6 lg:grid-cols-2">
              <Field label="Betroffenes System / Dienst" htmlFor="affectedSystem">
                <Input
                  id="affectedSystem"
                  required
                  maxLength={500}
                  placeholder="z. B. Online-Banking"
                  value={form.affectedSystem}
                  onChange={(e) => update("affectedSystem", e.target.value)}
                />
              </Field>
              <Field label="Gemeldet von (optional)" htmlFor="reportedBy">
                <Input
                  id="reportedBy"
                  maxLength={500}
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
                rows={5}
                maxLength={5_000}
                placeholder="Beobachtete Auswirkungen"
                value={form.symptoms}
                onChange={(e) => update("symptoms", e.target.value)}
              />
            </Field>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={loading}
                size="lg"
                className="w-full sm:w-auto sm:min-w-64"
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                Einschätzung anfordern
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

const NO_SERVER_KEY: AiAvailability = {
  serverKey: false,
  defaultModel: DEFAULT_CLAUDE_MODEL,
};

/**
 * Fragt den Server, ob er ohne Schlüssel aus dem Browser bewerten kann. Erst
 * mit der Antwort stimmt der Hinweis in jedem Fall; bis dahin fehlt er.
 */
function useAiAvailability(): AiAvailability | null {
  const [availability, setAvailability] = useState<AiAvailability | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/triage")
      .then((res) => (res.ok ? (res.json() as Promise<AiAvailability>) : null))
      .then((data) => {
        if (!cancelled) setAvailability(data ?? NO_SERVER_KEY);
      })
      .catch(() => {
        if (!cancelled) setAvailability(NO_SERVER_KEY);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return availability;
}

/**
 * Womit die Einschätzung entsteht. Ohne Schlüssel soll niemand eine
 * regelbasierte Antwort für eine KI-Bewertung halten – und umgekehrt soll
 * sichtbar sein, dass die Meldung an die Claude-API geht, auch wenn der
 * Schlüssel dafür nicht aus diesem Browser, sondern vom Server stammt.
 */
function EngineNotice({
  engine,
  model,
}: {
  engine: "own-key" | "server-key" | "rules";
  model: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
      <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      {engine !== "rules" ? (
        <p className="text-muted-foreground">
          Die Einschätzung erstellt{" "}
          <span className="font-medium text-foreground">{model}</span>
          {engine === "server-key" && " mit dem Schlüssel des Unternehmens"}.
          Die Angaben werden dafür an die Claude-API übermittelt; das Modell
          bereitet die Entscheidung vor, es trifft sie nicht.
        </p>
      ) : (
        <p className="text-muted-foreground">
          Ohne Claude-API-Schlüssel bewertet die Anwendung regelbasiert nach
          Stichworten.{" "}
          <Link
            href="/einstellungen"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Schlüssel hinterlegen
          </Link>
        </p>
      )}
    </div>
  );
}

function DemoBar({ onLoad }: { onLoad: (data: TriageInput) => void }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
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
