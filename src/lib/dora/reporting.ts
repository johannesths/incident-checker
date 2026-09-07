/**
 * Meldung schwerwiegender IKT-bezogener Vorfälle an die zuständige Behörde
 * (in Deutschland die BaFin), Art. 19 DORA (VO (EU) 2022/2554).
 *
 * HINWEIS: Fristen und Meldearten sind – wie die Klassifizierungskriterien –
 * als explizite, auditierbare Regelbasis hinterlegt und vor dem
 * Produktiveinsatz gegen den aktuellen Verordnungstext, die zugehörigen
 * technischen Standards und die Vorgaben der BaFin zu verifizieren.
 */

export type ReportType = "initial" | "intermediate" | "final";

export interface ReportTypeDef {
  id: ReportType;
  label: string;
  /** Frist in Klartext. */
  deadline: string;
  /** Fundstelle der Frist. */
  article: string;
  description: string;
}

export const REPORT_TYPES: ReportTypeDef[] = [
  {
    id: "initial",
    label: "Erstmeldung",
    deadline:
      "spätestens 4 Stunden nach Einstufung als schwerwiegend, jedenfalls binnen 24 Stunden nach Kenntniserlangung",
    article: "Art. 19 Abs. 4 Buchst. a DORA",
    description:
      "Erste Unterrichtung der Behörde über den eingestuften Vorfall mit den zu diesem Zeitpunkt verfügbaren Angaben.",
  },
  {
    id: "intermediate",
    label: "Zwischenmeldung",
    deadline: "spätestens 72 Stunden nach der Erstmeldung",
    article: "Art. 19 Abs. 4 Buchst. b DORA",
    description:
      "Aktualisierung des Sachstands, sobald sich die Lage wesentlich ändert oder die regulären Tätigkeiten wieder aufgenommen wurden.",
  },
  {
    id: "final",
    label: "Abschlussmeldung",
    deadline: "spätestens einen Monat nach der letzten Zwischenmeldung",
    article: "Art. 19 Abs. 4 Buchst. c DORA",
    description:
      "Abschließender Bericht nach Abschluss der Ursachenanalyse, einschließlich der tatsächlichen Auswirkungen.",
  },
];

export const REPORT_TYPE_BY_ID: Record<ReportType, ReportTypeDef> =
  Object.fromEntries(REPORT_TYPES.map((t) => [t.id, t])) as Record<
    ReportType,
    ReportTypeDef
  >;

/** Einstufung aus der Schweregradbestimmung (vgl. severityResultSchema). */
type Classification = "major" | "non_major" | "indeterminate";

export type ObligationLevel = "required" | "unclear" | "none";

export interface ReportObligation {
  level: ObligationLevel;
  label: string;
  explanation: string;
}

/**
 * Besteht eine Meldepflicht? Meldepflichtig sind schwerwiegende Vorfälle
 * (Art. 19 Abs. 1 DORA). Bei nicht schwerwiegenden Vorfällen bleibt die
 * freiwillige Meldung erheblicher Cyberbedrohungen möglich (Art. 19 Abs. 2).
 */
export function getReportObligation(
  classification: Classification,
): ReportObligation {
  switch (classification) {
    case "major":
      return {
        level: "required",
        label: "Meldepflicht besteht",
        explanation:
          "Der Vorfall wurde als schwerwiegend eingestuft und ist der zuständigen Behörde zu melden (Art. 19 Abs. 1 DORA).",
      };
    case "indeterminate":
      return {
        level: "unclear",
        label: "Meldepflicht nicht abschließend bestimmbar",
        explanation:
          "Die Einstufung ist nicht eindeutig. Klären Sie die offenen Angaben; im Zweifel ist die Meldung fristwahrend abzugeben (Art. 19 Abs. 4 DORA).",
      };
    case "non_major":
      return {
        level: "none",
        label: "Keine Meldepflicht",
        explanation:
          "Der Vorfall ist nicht schwerwiegend und damit nicht meldepflichtig. Eine freiwillige Meldung erheblicher Cyberbedrohungen bleibt möglich (Art. 19 Abs. 2 DORA).",
      };
  }
}
