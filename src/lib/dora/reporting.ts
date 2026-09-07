/**
 * Meldung schwerwiegender IKT-bezogener Vorfälle an die zuständige Behörde
 * (in Deutschland die BaFin), Art. 19 DORA (VO (EU) 2022/2554).
 *
 * HINWEIS: Fristen und Meldearten sind – wie die Klassifizierungskriterien –
 * als explizite, auditierbare Regelbasis hinterlegt und vor dem
 * Produktiveinsatz gegen den aktuellen Verordnungstext, die zugehörigen
 * technischen Standards und die Vorgaben der BaFin zu verifizieren.
 */

import type { ReportSection } from "./report-fields";

/**
 * Meldungstyp – Feld 1.1 des Meldeformulars (Anhang I ITS). Die Rückstufung
 * eines bereits gemeldeten Vorfalls auf "nicht schwerwiegend" ist dort ein
 * eigener Meldungstyp (Art. 5 ITS), kein gesonderter Vorgang.
 */
export type ReportType =
  | "initial"
  | "intermediate"
  | "final"
  | "reclassification";

export interface ReportTypeDef {
  id: ReportType;
  label: string;
  /** Frist in Klartext. */
  deadline: string;
  /** Fundstelle der Frist. */
  article: string;
  description: string;
  /**
   * Abschnitte des Meldeformulars, die dieser Meldungstyp umfasst. Das
   * Formular ist kumulativ: Die Zwischenmeldung wiederholt die Angaben der
   * Erstmeldung und ergänzt Abschnitt 3, die Abschlussmeldung zusätzlich
   * Abschnitt 4.
   */
  sections: ReportSection[];
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
    sections: [1, 2],
  },
  {
    id: "intermediate",
    label: "Zwischenmeldung",
    deadline: "spätestens 72 Stunden nach der Erstmeldung",
    article: "Art. 19 Abs. 4 Buchst. b DORA",
    description:
      "Aktualisierung des Sachstands, sobald sich die Lage wesentlich ändert oder die regulären Tätigkeiten wieder aufgenommen wurden.",
    sections: [1, 2, 3],
  },
  {
    id: "final",
    label: "Abschlussmeldung",
    deadline: "spätestens einen Monat nach der letzten Zwischenmeldung",
    article: "Art. 19 Abs. 4 Buchst. c DORA",
    description:
      "Abschließender Bericht nach Abschluss der Ursachenanalyse, einschließlich der tatsächlichen Auswirkungen.",
    sections: [1, 2, 3, 4],
  },
  {
    id: "reclassification",
    label: "Rückstufung",
    deadline: "unverzüglich nach der Neubewertung",
    article: "Art. 5 der Durchführungsverordnung (EU) 2025/302",
    description:
      "Ein bereits gemeldeter Vorfall erfüllt die Einstufungskriterien nicht mehr und wird auf „nicht schwerwiegend“ zurückgestuft. Die Gründe sind in Feld 2.10 darzulegen.",
    sections: [1, 2],
  },
];

export const REPORT_TYPE_BY_ID: Record<ReportType, ReportTypeDef> =
  Object.fromEntries(REPORT_TYPES.map((t) => [t.id, t])) as Record<
    ReportType,
    ReportTypeDef
  >;

/** Umfasst dieser Meldungstyp den genannten Abschnitt des Meldeformulars? */
export function coversSection(
  reportType: ReportType,
  section: ReportSection,
): boolean {
  return REPORT_TYPE_BY_ID[reportType].sections.includes(section);
}

/**
 * Meldungstypen, die auf eine bereits abgegebene Erstmeldung Bezug nehmen
 * (Feld 1.1 Buchst. b). Sie verlangen die von der Behörde vergebene
 * Vorgangsnummer in Feld 3.1.
 */
export function isFollowUp(reportType: ReportType): boolean {
  return reportType !== "initial";
}

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
          "Der Vorfall ist nicht schwerwiegend und damit nicht meldepflichtig. Wurde er bereits gemeldet, ist er als Rückstufung nachzumelden (Art. 5 der Durchführungsverordnung (EU) 2025/302); im Übrigen bleibt die freiwillige Meldung erheblicher Cyberbedrohungen möglich (Art. 19 Abs. 2 DORA).",
      };
  }
}
