"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";
import { TRIAGE_SCENARIOS } from "@/lib/demo-data";
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
        headers: { "Content-Type": "application/json" },
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

      <Card className="border-border/60 bg-card/70 backdrop-blur">
        <CardContent className="p-6 sm:p-8">
          <DemoBar onLoad={setForm} />
          <form onSubmit={onSubmit} className="space-y-6">
            <Field label="Beschreibung" htmlFor="description">
              <Textarea
                id="description"
                required
                rows={8}
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
                  placeholder="z. B. Online-Banking"
                  value={form.affectedSystem}
                  onChange={(e) => update("affectedSystem", e.target.value)}
                />
              </Field>
              <Field label="Gemeldet von (optional)" htmlFor="reportedBy">
                <Input
                  id="reportedBy"
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
