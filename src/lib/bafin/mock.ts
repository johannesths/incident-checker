import type { ReportType } from "@/lib/dora/reporting";
import type { ReportDeadline, ReportInput, ReportReceipt } from "@/lib/schemas";
import type { ReportingService } from "./types";

/**
 * Platzhalter-Implementierung der Meldeschnittstelle.
 *
 * Sie übermittelt NICHTS. Die Meldung wird ausschließlich lokal quittiert,
 * damit der vollständige Ablauf – einschließlich Vorgangsnummer und der
 * anschließenden Fristen – bereits jetzt geprüft werden kann. Der zurückgegebene
 * Status ist deshalb dauerhaft "simulated".
 */

const HOUR_MS = 60 * 60 * 1000;

const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function submissionId(now: Date): string {
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  }
  return `MLD-${date}-${suffix}`;
}

function addMonth(date: Date): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  return next;
}

/**
 * Fristen, die nach der abgegebenen Meldung noch laufen (Art. 19 Abs. 4 DORA).
 * Nach der Abschlussmeldung ist der Meldezyklus beendet.
 */
function nextDeadlines(reportType: ReportType, submittedAt: Date): ReportDeadline[] {
  switch (reportType) {
    case "initial":
      return [
        {
          reportType: "intermediate",
          dueAt: new Date(submittedAt.getTime() + 72 * HOUR_MS).toISOString(),
          basis: "Art. 19 Abs. 4 Buchst. b DORA – 72 Stunden nach der Erstmeldung",
        },
      ];
    case "intermediate":
      return [
        {
          reportType: "final",
          dueAt: addMonth(submittedAt).toISOString(),
          basis:
            "Art. 19 Abs. 4 Buchst. c DORA – ein Monat nach der Zwischenmeldung",
        },
      ];
    case "final":
      return [];
  }
}

export class MockBafinReportingService implements ReportingService {
  async submit(input: ReportInput): Promise<ReportReceipt> {
    const submittedAt = new Date();
    return {
      submissionId: submissionId(submittedAt),
      submittedAt: submittedAt.toISOString(),
      reportType: input.reportType,
      status: "simulated",
      channel: "Elektronische Meldung an die BaFin",
      nextDeadlines: nextDeadlines(input.reportType, submittedAt),
      institutionName: input.institutionName,
      competentAuthority: input.competentAuthority,
      incidentReference: input.incidentReference,
    };
  }
}
