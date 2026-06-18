"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, HelpCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Vorfall beschreiben</CardTitle>
          <CardDescription>
            Erfassen Sie das mögliche Ereignis. Die Anwendung schätzt ein, ob ein
            IKT-Vorfall vorliegt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                required
                rows={5}
                placeholder="Was ist passiert?"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="affectedSystem">Betroffenes System / Dienst</Label>
              <Input
                id="affectedSystem"
                required
                placeholder="z. B. Online-Banking, E-Mail"
                value={form.affectedSystem}
                onChange={(e) => update("affectedSystem", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportedBy">Gemeldet von</Label>
              <Input
                id="reportedBy"
                required
                placeholder="Name / Abteilung"
                value={form.reportedBy}
                onChange={(e) => update("reportedBy", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symptoms">Symptome / Auswirkungen (optional)</Label>
              <Textarea
                id="symptoms"
                rows={3}
                placeholder="Beobachtete Auswirkungen"
                value={form.symptoms}
                onChange={(e) => update("symptoms", e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="size-4 animate-spin" />}
              Einschätzung anfordern
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {!result && (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Das Ergebnis erscheint hier nach dem Absenden.
            </CardContent>
          </Card>
        )}

        {result && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                {result.isIncident ? (
                  <AlertTriangle className="size-5 text-destructive" />
                ) : result.confidence < 0.5 ? (
                  <HelpCircle className="size-5 text-muted-foreground" />
                ) : (
                  <CheckCircle2 className="size-5 text-green-600" />
                )}
                <CardTitle>
                  {result.isIncident
                    ? "Möglicher IKT-Vorfall"
                    : "Kein IKT-Vorfall"}
                </CardTitle>
              </div>
              <CardDescription>{result.recommendation}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="font-medium">Begründung: </span>
                {result.reasoning}
              </div>
              <Badge variant="secondary">
                Konfidenz: {(result.confidence * 100).toFixed(0)} %
              </Badge>
              {result.isIncident && (
                <div className="pt-2">
                  <Link
                    href="/severity"
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Weiter zur Schweregradbestimmung
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
