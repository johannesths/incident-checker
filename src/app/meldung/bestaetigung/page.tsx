"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileCheck2,
  RotateCcw,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { REPORT_TYPE_BY_ID } from "@/lib/dora/reporting";
import {
  STORAGE_KEYS,
  clearSession,
  useSessionValue,
} from "@/lib/session-store";
import type { ReportReceipt } from "@/lib/schemas";

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : dateTimeFormat.format(date);
}

export default function ReportConfirmationPage() {
  const router = useRouter();
  const receipt = useSessionValue<ReportReceipt>(STORAGE_KEYS.reportReceipt);

  function startOver() {
    clearSession(STORAGE_KEYS.reportDraft, STORAGE_KEYS.reportReceipt);
    router.push("/meldung");
  }

  // undefined: Der Speicher wurde noch nicht gelesen (Hydration).
  if (receipt === undefined) return null;

  if (!receipt) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/70 bg-muted/20 p-10 text-center">
          <FileCheck2 className="size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Es liegt keine abgesendete Meldung vor.
          </p>
          <Link href="/meldung" className={cn(buttonVariants({ size: "sm" }))}>
            Zur Meldung
          </Link>
        </div>
      </div>
    );
  }

  const reportType = REPORT_TYPE_BY_ID[receipt.reportType];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <PageHeader
        step="Schritt 03 · Bestätigung"
        title="Meldung erfasst"
        desc="Quittung der (simulierten) Übermittlung an die zuständige Behörde."
      />

      <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
        <div className="space-y-1 text-sm">
          <p className="font-medium">
            Diese Meldung wurde nicht an die BaFin übermittelt
          </p>
          <p className="text-muted-foreground">{receipt.notice}</p>
        </div>
      </div>

      <Card className="relative overflow-hidden border-border/60 bg-card/80 backdrop-blur">
        <div className="absolute inset-x-0 top-0 h-1 bg-success" />
        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
              <CheckCircle2 className="size-6" />
            </span>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">{reportType.label}</h2>
              <p className="text-sm text-muted-foreground">
                {reportType.description}
              </p>
            </div>
            <Badge variant="secondary" className="ml-auto shrink-0">
              Simuliert
            </Badge>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label="Vorgangsnummer">
              <span className="font-mono">{receipt.submissionId}</span>
            </Detail>
            <Detail label="Zeitpunkt">
              {formatDateTime(receipt.submittedAt)}
            </Detail>
            <Detail label="Finanzunternehmen">{receipt.institutionName}</Detail>
            <Detail label="Interne Vorfallreferenz">
              {receipt.incidentReference}
            </Detail>
            <Detail label="Übertragungsweg">{receipt.channel}</Detail>
          </dl>

          <div className="space-y-3 border-t border-border/60 pt-5">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold tracking-tight">
                Weitere Fristen
              </h3>
            </div>
            {receipt.nextDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Mit der Abschlussmeldung ist der Meldezyklus für diesen Vorfall
                beendet.
              </p>
            ) : (
              <ul className="space-y-2">
                {receipt.nextDeadlines.map((deadline) => (
                  <li
                    key={deadline.reportType}
                    className="rounded-lg border border-border/50 bg-muted/20 p-3"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-medium">
                        {REPORT_TYPE_BY_ID[deadline.reportType].label}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        fällig bis {formatDateTime(deadline.dueAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {deadline.basis}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/meldung"
          className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}
        >
          <ArrowLeft className="size-4" />
          Angaben ändern
        </Link>
        <Button variant="ghost" onClick={startOver}>
          <RotateCcw className="size-4" />
          Neue Meldung
        </Button>
      </div>
    </div>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}
