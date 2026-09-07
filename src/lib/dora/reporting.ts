/**
 * Meldung schwerwiegender IKT-bezogener Vorfälle an die zuständige Behörde
 * (in Deutschland die BaFin), Art. 19 DORA (VO (EU) 2022/2554).
 *
 * Meldearten und Fristen folgen der Delegierten Verordnung (EU) 2025/301
 * (RTS zu Art. 20 Buchst. a DORA): Art. 1 Buchst. a benennt die drei Arten
 * der Übermittlung, Art. 5 die Fristen.
 *
 * HINWEIS: Wie die Klassifizierungskriterien ist die Regelbasis explizit und
 * auditierbar hinterlegt und vor dem Produktiveinsatz gegen den aktuellen
 * Verordnungstext zu verifizieren.
 */

import type { ContentArticle } from "./report-fields";

/**
 * Art der Übermittlung (Art. 1 Buchst. a). Die Rückstufung eines Vorfalls auf
 * "nicht schwerwiegend" ist keine eigene Art, sondern eine Angabe innerhalb
 * der Meldung (Art. 2 Buchst. i).
 */
export type ReportType = "initial" | "intermediate" | "final";

/**
 * Zwei Meldungen mit unterschiedlichem Inhalt: die Meldung eines
 * schwerwiegenden Vorfalls (Art. 19 Abs. 1 DORA, Inhalt nach Art. 1 bis 4 des
 * RTS) und die freiwillige Meldung einer erheblichen Cyberbedrohung
 * (Art. 19 Abs. 2 DORA, Inhalt nach Art. 6 des RTS).
 */
export type SubmissionKind = "incident" | "cyber_threat";

export interface SubmissionKindDef {
  id: SubmissionKind;
  label: string;
  article: string;
  description: string;
}

export const SUBMISSION_KINDS: SubmissionKindDef[] = [
  {
    id: "incident",
    label: "Meldung eines schwerwiegenden Vorfalls",
    article: "Art. 19 Abs. 1 DORA",
    description:
      "Pflichtmeldung eines als schwerwiegend eingestuften IKT-bezogenen Vorfalls, als Erst-, Zwischen- oder Abschlussmeldung.",
  },
  {
    id: "cyber_threat",
    label: "Freiwillige Meldung einer erheblichen Cyberbedrohung",
    article: "Art. 19 Abs. 2 DORA",
    description:
      "Freiwillige Meldung einer als erheblich eingestuften Cyberbedrohung. Sie hat einen eigenen, kürzeren Inhalt (Art. 6 des RTS).",
  },
];

export const SUBMISSION_KIND_BY_ID: Record<SubmissionKind, SubmissionKindDef> =
  Object.fromEntries(SUBMISSION_KINDS.map((k) => [k.id, k])) as Record<
    SubmissionKind,
    SubmissionKindDef
  >;

export interface ReportTypeDef {
  id: ReportType;
  label: string;
  /** Frist in Klartext. */
  deadline: string;
  /** Fundstelle der Frist. */
  article: string;
  description: string;
  /**
   * Artikel des RTS, deren Inhalte diese Meldung umfasst.
   *
   * Die Meldungen sind nicht kumulativ: Art. 1 nennt die allgemeinen
   * Informationen ausdrücklich für alle drei Meldungen, die Art. 2, 3 und 4
   * dagegen jeweils die spezifischen Informationen genau einer von ihnen. Eine
   * Abschlussmeldung wiederholt daher weder den Sachverhalt der Erstmeldung
   * noch die Angaben der Zwischenmeldung.
   */
  articles: ContentArticle[];
}

export const REPORT_TYPES: ReportTypeDef[] = [
  {
    id: "initial",
    label: "Erstmeldung",
    deadline:
      "so früh wie möglich, in jedem Fall binnen 4 Stunden nach der Einstufung als schwerwiegend und spätestens 24 Stunden nach Kenntniserlangung",
    article: "Art. 5 Abs. 1 Buchst. a",
    description:
      "Erste Unterrichtung der Behörde über den eingestuften Vorfall mit den zu diesem Zeitpunkt verfügbaren Angaben.",
    articles: [1, 2],
  },
  {
    id: "intermediate",
    label: "Zwischenmeldung",
    deadline:
      "spätestens 72 Stunden nach Übermittlung der Erstmeldung – auch wenn sich Status oder Handhabung des Vorfalls nicht geändert haben",
    article: "Art. 5 Abs. 1 Buchst. b",
    description:
      "Ausführlichere Angaben zum Vorfall. Aktualisierte Zwischenmeldungen sind unverzüglich zu übermitteln, jedenfalls sobald der reguläre Geschäftsbetrieb wiederaufgenommen wurde.",
    articles: [1, 3],
  },
  {
    id: "final",
    label: "Abschlussmeldung",
    deadline:
      "spätestens einen Monat nach Übermittlung der Zwischenmeldung bzw. der letzten aktualisierten Zwischenmeldung",
    article: "Art. 5 Abs. 1 Buchst. c",
    description:
      "Abschließende Meldung nach Abschluss der Ursachenanalyse, einschließlich der tatsächlichen Auswirkungen.",
    articles: [1, 4],
  },
];

export const REPORT_TYPE_BY_ID: Record<ReportType, ReportTypeDef> =
  Object.fromEntries(REPORT_TYPES.map((t) => [t.id, t])) as Record<
    ReportType,
    ReportTypeDef
  >;

/** Umfasst diese Meldung die Inhalte des genannten RTS-Artikels? */
export function coversArticle(
  reportType: ReportType,
  article: ContentArticle,
): boolean {
  return REPORT_TYPE_BY_ID[reportType].articles.includes(article);
}

/**
 * Meldungen, die auf eine bereits abgegebene Erstmeldung Bezug nehmen. Sie
 * führen den Referenzcode, den die zuständige Behörde mitgeteilt hat
 * (Art. 3 Buchst. a).
 */
export function isFollowUp(reportType: ReportType): boolean {
  return reportType !== "initial";
}

/* ---------------------------------------------------------------------------
 * Fristen (Art. 5)
 * ------------------------------------------------------------------------- */

const HOUR_MS = 60 * 60 * 1000;

/** Art. 5 Abs. 1 Buchst. a: 4 Stunden nach der Einstufung als schwerwiegend. */
export const HOURS_AFTER_CLASSIFICATION = 4;

/** Art. 5 Abs. 1 Buchst. a: 24 Stunden nach Kenntniserlangung. */
export const HOURS_AFTER_DETECTION = 24;

/** Art. 5 Abs. 1 Buchst. b: 72 Stunden nach der Erstmeldung. */
export const HOURS_AFTER_INITIAL_REPORT = 72;

export interface Deadline {
  dueAt: Date;
  /** Fundstelle und Rechenweg in Klartext. */
  basis: string;
}

/**
 * Fälligkeit der Erstmeldung (Art. 5 Abs. 1 Buchst. a und Abs. 2).
 *
 * Im Regelfall gilt die frühere der beiden Grenzen. Wurde der Vorfall erst
 * später als 24 Stunden nach der Kenntniserlangung als schwerwiegend
 * eingestuft, tritt die 24-Stunden-Grenze zurück und es bleiben 4 Stunden ab
 * der Einstufung (Abs. 2).
 */
export function initialReportDeadline(
  detectedAt: Date,
  classifiedAt: Date,
): Deadline {
  const afterClassification = new Date(
    classifiedAt.getTime() + HOURS_AFTER_CLASSIFICATION * HOUR_MS,
  );
  const afterDetection = new Date(
    detectedAt.getTime() + HOURS_AFTER_DETECTION * HOUR_MS,
  );
  if (classifiedAt.getTime() > afterDetection.getTime()) {
    return {
      dueAt: afterClassification,
      basis: `${HOURS_AFTER_CLASSIFICATION} Stunden nach der Einstufung, da diese später als ${HOURS_AFTER_DETECTION} Stunden nach der Kenntniserlangung erfolgt ist`,
    };
  }
  return afterClassification <= afterDetection
    ? {
        dueAt: afterClassification,
        basis: `${HOURS_AFTER_CLASSIFICATION} Stunden nach der Einstufung als schwerwiegend`,
      }
    : {
        dueAt: afterDetection,
        basis: `${HOURS_AFTER_DETECTION} Stunden nach der Kenntniserlangung`,
      };
}

/**
 * Art. 5 Abs. 4: Fällt eine Frist auf ein Wochenende oder einen Feiertag im
 * Mitgliedstaat des meldenden Unternehmens, darf bis 12.00 Uhr des
 * darauffolgenden Arbeitstages übermittelt werden.
 *
 * Feiertage sind hier nicht hinterlegt – sie sind je Mitgliedstaat und Jahr
 * verschieden. Berücksichtigt wird das Wochenende; auf die Feiertage weist
 * die Oberfläche hin.
 */
export function extendOverWeekend(dueAt: Date): Deadline | null {
  const day = dueAt.getDay();
  if (day !== 0 && day !== 6) return null;
  const next = new Date(dueAt);
  next.setDate(next.getDate() + (day === 6 ? 2 : 1));
  next.setHours(12, 0, 0, 0);
  return {
    dueAt: next,
    basis: "12.00 Uhr des auf das Wochenende folgenden Arbeitstages",
  };
}

/**
 * Art. 5 Abs. 5: Für Erst- und Zwischenmeldungen von Kreditinstituten,
 * zentralen Gegenparteien, Betreibern von Handelsplätzen und Unternehmen, die
 * nach Art. 3 der Richtlinie (EU) 2022/2555 als wesentlich oder wichtig
 * eingestuft sind, greift die Wochenendregelung nicht. Nach Abs. 6 kann die
 * zuständige Behörde dies auf weitere bedeutende Unternehmen erstrecken.
 */
export function weekendExtensionAvailable(
  reportType: ReportType,
  entity: { entityType: string; nis2EssentialEntity: boolean },
): boolean {
  if (reportType === "final") return true;
  if (entity.nis2EssentialEntity) return false;
  return !["credit_institution", "ccp", "trading_venue"].includes(
    entity.entityType,
  );
}

/* ---------------------------------------------------------------------------
 * Meldepflicht
 * ------------------------------------------------------------------------- */

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
          "Der Vorfall ist nicht schwerwiegend und damit nicht meldepflichtig. Wurde er bereits als schwerwiegend gemeldet, ist die Neueinstufung in der Meldung anzugeben (Art. 2 Buchst. i); im Übrigen bleibt die freiwillige Meldung einer erheblichen Cyberbedrohung möglich (Art. 19 Abs. 2 DORA).",
      };
  }
}
