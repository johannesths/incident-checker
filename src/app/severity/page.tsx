"use client";

import { useState } from "react";
import { Loader2, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { CRITERION_BY_ID } from "@/lib/dora/criteria";
import type { SeverityResult } from "@/lib/schemas";

interface FormState {
  description: string;
  clientsAffected: string;
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
  transactionsAffected: "",
  durationHours: "",
  downtimeHours: "",
  memberStatesAffected: "",
  dataLosses: "",
  criticalServicesAffected: false,
  reputationalImpact: "",
  economicImpactEur: "",
};

const CLASSIFICATION_LABEL: Record<SeverityResult["classification"], string> = {
  major: "Schwerwiegender Vorfall",
  non_major: "Kein schwerwiegender Vorfall",
  indeterminate: "Nicht eindeutig bestimmbar",
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

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Schweregrad bestimmen (DORA)</CardTitle>
          <CardDescription>
            Ergänzen Sie Angaben zu den DORA-Klassifizierungskriterien.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Vorfallbeschreibung</Label>
              <Textarea
                id="description"
                required
                rows={3}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clientsAffected">Betroffene Kunden</Label>
                <Input
                  id="clientsAffected"
                  placeholder="Anzahl / Anteil"
                  value={form.clientsAffected}
                  onChange={(e) => update("clientsAffected", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transactionsAffected">Betroffene Transaktionen</Label>
                <Input
                  id="transactionsAffected"
                  placeholder="Anzahl / Wert"
                  value={form.transactionsAffected}
                  onChange={(e) => update("transactionsAffected", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationHours">Dauer (Stunden)</Label>
                <Input
                  id="durationHours"
                  type="number"
                  min={0}
                  value={form.durationHours}
                  onChange={(e) => update("durationHours", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="downtimeHours">Ausfallzeit (Stunden)</Label>
                <Input
                  id="downtimeHours"
                  type="number"
                  min={0}
                  value={form.downtimeHours}
                  onChange={(e) => update("downtimeHours", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memberStatesAffected">Betroffene Mitgliedstaaten</Label>
                <Input
                  id="memberStatesAffected"
                  type="number"
                  min={0}
                  value={form.memberStatesAffected}
                  onChange={(e) => update("memberStatesAffected", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="economicImpactEur">Wirtschaftl. Schaden (EUR)</Label>
                <Input
                  id="economicImpactEur"
                  type="number"
                  min={0}
                  value={form.economicImpactEur}
                  onChange={(e) => update("economicImpactEur", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataLosses">Datenverluste</Label>
              <Input
                id="dataLosses"
                placeholder="Verfügbarkeit / Integrität / Vertraulichkeit"
                value={form.dataLosses}
                onChange={(e) => update("dataLosses", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reputationalImpact">Reputationsauswirkung</Label>
              <Input
                id="reputationalImpact"
                placeholder="z. B. Medienberichte, Beschwerden"
                value={form.reputationalImpact}
                onChange={(e) => update("reputationalImpact", e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={form.criticalServicesAffected}
                onChange={(e) =>
                  update("criticalServicesAffected", e.target.checked)
                }
              />
              Kritische oder wichtige Funktion betroffen
            </label>
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="size-4 animate-spin" />}
              Schweregrad bestimmen
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
                {result.classification === "major" ? (
                  <ShieldAlert className="size-5 text-destructive" />
                ) : result.classification === "non_major" ? (
                  <ShieldCheck className="size-5 text-green-600" />
                ) : (
                  <ShieldQuestion className="size-5 text-muted-foreground" />
                )}
                <CardTitle>{CLASSIFICATION_LABEL[result.classification]}</CardTitle>
              </div>
              <CardDescription>{result.summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Badge variant="secondary">
                Konfidenz: {(result.confidence * 100).toFixed(0)} %
              </Badge>
              <Separator />
              <ul className="space-y-3">
                {result.findings.map((f) => (
                  <li key={f.criterionId} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {CRITERION_BY_ID[f.criterionId].label}
                      </span>
                      <Badge variant={f.thresholdMet ? "destructive" : "outline"}>
                        {f.thresholdMet ? "Schwelle erreicht" : "unkritisch"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{f.assessment}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
