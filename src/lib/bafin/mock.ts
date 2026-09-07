import {
  HOURS_AFTER_INITIAL_REPORT,
  extendOverWeekend,
  weekendExtensionAvailable,
  type ReportType,
} from "@/lib/dora/reporting";
import type { ReportDeadline, ReportReceipt, SubmissionInput } from "@/lib/schemas";
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
 * Verschiebt eine Fälligkeit, die auf ein Wochenende fällt, auf 12.00 Uhr des
 * folgenden Arbeitstages (Art. 5 Abs. 4 des RTS) – soweit dem Unternehmen
 * diese Erleichterung für die betreffende Meldung offensteht (Abs. 5).
 */
function applyWeekendRule(
  deadline: ReportDeadline,
  entity: { entityType: string; nis2EssentialEntity: boolean },
): ReportDeadline {
  if (!weekendExtensionAvailable(deadline.reportType, entity)) return deadline;
  const extended = extendOverWeekend(new Date(deadline.dueAt));
  if (!extended) return deadline;
  return {
    reportType: deadline.reportType,
    dueAt: extended.dueAt.toISOString(),
    basis: `${deadline.basis}; ${extended.basis}`,
  };
}

/**
 * Fristen, die nach der abgegebenen Meldung noch laufen (Art. 5 Abs. 1 des
 * RTS). Nach der Abschlussmeldung ist der Meldezyklus beendet.
 */
function nextDeadlines(
  reportType: ReportType,
  submittedAt: Date,
): ReportDeadline[] {
  switch (reportType) {
    case "initial":
      return [
        {
          reportType: "intermediate",
          dueAt: new Date(
            submittedAt.getTime() + HOURS_AFTER_INITIAL_REPORT * HOUR_MS,
          ).toISOString(),
          basis: `${HOURS_AFTER_INITIAL_REPORT} Stunden nach Übermittlung der Erstmeldung, auch ohne Änderung des Sachstands`,
        },
      ];
    case "intermediate":
      return [
        {
          reportType: "final",
          dueAt: addMonth(submittedAt).toISOString(),
          basis:
            "ein Monat nach Übermittlung der Zwischenmeldung bzw. der letzten aktualisierten Zwischenmeldung",
        },
      ];
    case "final":
      return [];
  }
}

export class MockBafinReportingService implements ReportingService {
  async submit(input: SubmissionInput): Promise<ReportReceipt> {
    const submittedAt = new Date();
    const entity = {
      entityType: input.entityType,
      // Nur die Vorfallmeldung kennt Folgefristen; für die Einordnung nach
      // Art. 5 Abs. 5 zählt die Einstufung des Unternehmens.
      nis2EssentialEntity: input.nis2EssentialEntity ?? false,
    };
    const deadlines =
      input.kind === "incident"
        ? nextDeadlines(input.reportType, submittedAt).map((d) =>
            applyWeekendRule(d, entity),
          )
        : [];

    return {
      submissionId: submissionId(submittedAt),
      submittedAt: submittedAt.toISOString(),
      kind: input.kind,
      reportType: input.kind === "incident" ? input.reportType : null,
      status: "simulated",
      channel: "Elektronische Meldung an die zuständige Behörde",
      nextDeadlines: deadlines,
      entityName: input.entityName,
      competentAuthority: input.competentAuthority,
      incidentReferenceCode:
        input.kind === "incident" ? input.incidentReferenceCode : "",
    };
  }
}
