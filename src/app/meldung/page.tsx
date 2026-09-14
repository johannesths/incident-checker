"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Check,
  ClipboardList,
  Info,
  Loader2,
  Send,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  UserRound,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { StepRow, type StepStatus } from "@/components/step-row";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DATA_LOSS_DIMENSIONS,
  DORA_CRITERIA,
  REPUTATION_CONDITIONS,
  type DataLossDimension,
  type GeoImpactArea,
  type ReputationCondition,
} from "@/lib/dora/criteria";
import {
  REPORT_TYPES,
  REPORT_TYPE_BY_ID,
  SUBMISSION_KINDS,
  coversArticle,
  getReportObligation,
  initialReportDeadline,
  isFollowUp,
  type ObligationLevel,
  type ReportType,
  type SubmissionKind,
} from "@/lib/dora/reporting";
import {
  DETECTION_SOURCES,
  DURATION_BASES,
  EXTERNAL_ORIGINS,
  FIGURE_BASES,
  FUNCTIONAL_AREAS,
  IMPACT_TYPES,
  INCIDENT_ORIGINS,
  INCIDENT_TYPES,
  INFRASTRUCTURE_ANSWERS,
  MEMBER_STATES,
  NOTIFIED_AUTHORITIES,
  RESOLUTION_RISK_ANSWERS,
  ROOT_CAUSE_CATEGORIES,
  ROOT_CAUSE_TREE,
  THREAT_ACTIVITY_CHANGES,
  THREAT_STATUSES,
  THREAT_TECHNIQUES,
  rootCauseDetailId,
  type ContentArticle,
} from "@/lib/dora/report-fields";
import { checkReport, type ReportCheck } from "@/lib/dora/report-checks";
import {
  STORAGE_KEYS,
  saveSession,
  updateSession,
  useSessionValue,
} from "@/lib/session-store";
import {
  ENTITY_TYPES,
  type CompanyProfile,
  type EntityType,
} from "@/lib/company/profile";
import { useCompanyProfile } from "@/lib/company/store";
import { isValidLei, leiProblem } from "@/lib/lei";
import type {
  CyberThreatInput,
  ReportInput,
  ReportReceipt,
  SeverityResult,
} from "@/lib/schemas";

/**
 * Die erfassten Angaben decken beide Meldungen ab: die Meldung eines
 * schwerwiegenden Vorfalls (Art. 1 bis 4 der Delegierten Verordnung (EU)
 * 2025/301) und die freiwillige Meldung einer erheblichen Cyberbedrohung
 * (Art. 1 und 6). Was beide verlangen – die allgemeinen Angaben, der
 * Erkennungszeitpunkt, die Beschreibung, die Einstufungskriterien, die
 * benachrichtigten Behörden, die Kompromittierungsindikatoren und die
 * sonstigen Informationen – wird einmal erfasst.
 *
 * Die Einstufung aus Schritt 02 und die Angaben, die aus dem Unternehmensprofil
 * stammen, gehören nicht zum Formular und werden beim Absenden ergänzt.
 */
type FormFields = Omit<
  ReportInput & CyberThreatInput,
  "classification" | "competentAuthority" | "nis2EssentialEntity"
>;

type ReportForm = {
  [K in keyof FormFields]-?: Exclude<FormFields[K], undefined>;
};

const emptyForm: ReportForm = {
  // Art. 1 – Allgemeine Informationen
  reportType: "initial",
  entityName: "",
  entityLei: "",
  entityType: ENTITY_TYPES[0].id,
  submittingEntityName: "",
  submittingEntityCode: "",
  aggregatedEntityNames: "",
  aggregatedEntityLeis: "",
  primaryContactName: "",
  primaryContactEmail: "",
  primaryContactPhone: "",
  secondContactName: "",
  secondContactEmail: "",
  secondContactPhone: "",
  groupParentName: "",
  groupParentLei: "",
  reportingCurrency: "EUR",
  // Art. 2 – Erstmeldung
  incidentReferenceCode: "",
  detectedAt: "",
  classifiedAt: "",
  description: "",
  classificationCriteria: [],
  affectedMemberStates: [],
  detectionSource: null,
  incidentOrigin: null,
  originEntityDetails: "",
  businessContinuityActivated: false,
  reclassifiedAsNonMajor: false,
  reclassificationDetails: "",
  additionalInformation: "",
  // Art. 3 – Zwischenmeldung
  authorityReferenceCode: "",
  occurredAt: "",
  regularOperationsResumedAt: "",
  clientsAffected: "",
  clientsAffectedPercent: "",
  counterpartsAffected: "",
  counterpartsAffectedPercent: "",
  relevantClientsImpact: "",
  transactionsAffected: "",
  transactionsAffectedPercent: "",
  transactionsValue: "",
  figuresBasis: null,
  reputationalImpactConditions: [],
  reputationalImpactContext: "",
  durationHours: "",
  downtimeHours: "",
  durationBasis: null,
  memberStateImpactTypes: [],
  memberStateImpactDescription: "",
  dataLossDimensions: [],
  dataLossDescription: "",
  criticalServicesDescription: "",
  incidentTypes: [],
  incidentTypeOther: "",
  threatTechniques: [],
  threatTechniqueOther: "",
  functionalAreas: [],
  affectedProcesses: "",
  infrastructureAffected: null,
  infrastructureDescription: "",
  clientFinancialInterestAffected: false,
  notifiedAuthorities: [],
  notifiedAuthoritiesOther: "",
  temporaryMeasuresTaken: false,
  temporaryMeasuresDescription: "",
  indicatorsOfCompromise: "",
  // Art. 4 – Abschlussmeldung
  rootCauseCategories: [],
  rootCauseDetails: [],
  rootCauseFurther: [],
  rootCauseOther: "",
  rootCauseDescription: "",
  incidentResolvedAt: "",
  rootCauseAddressedAt: "",
  counterMeasures: "",
  resolutionRisk: null,
  resolutionAuthorityInformation: "",
  grossCostsAndLosses: "",
  financialRecoveries: "",
  economicImpactDescription: "",
  recurringIncidents: false,
  recurringIncidentCount: "",
  firstRecurringIncidentAt: "",
  // Art. 5 Abs. 3 – verspätete Übermittlung
  delayReason: "",
  // Art. 6 – Freiwillige Meldung erheblicher Cyberbedrohungen
  relevantTimestamps: "",
  potentialImpact: "",
  threatStatus: null,
  threatActivityChange: null,
  preventiveMeasures: "",
  notifiedFinancialEntities: "",
};

/** Die 23 Kategorien des Art. 2 Abs. 1 DORA als Auswahlliste. */
const ENTITY_TYPE_ITEMS = ENTITY_TYPES.map((t) => ({
  value: t.id,
  label: t.label,
}));

const MIN_DESCRIPTION_LENGTH = 10;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

/** Art. 1 Buchst. d: mehrere LEI, durch Semikolon getrennt. */
function leiListValid(value: string): boolean {
  if (value.trim() === "") return true;
  return value
    .split(";")
    .map((p) => p.trim())
    .every(isValidLei);
}

type FieldErrors = Partial<Record<keyof ReportForm, string>>;

/**
 * Beanstandungen an den allgemeinen Angaben, je Feld. Diese Angaben kommen aus
 * dem Unternehmensprofil; ohne den Hinweis am Feld bliebe unklar, welche von
 * ihnen den Schritt aufhält – etwa ein LEI mit der falschen Länge.
 */
function generalInformationErrors(f: ReportForm): FieldErrors {
  const errors: FieldErrors = {};
  if (!f.entityName.trim()) {
    errors.entityName = "Bitte geben Sie das Finanzunternehmen an.";
  }
  const entityLei = leiProblem(f.entityLei);
  if (entityLei) errors.entityLei = entityLei;
  const submitterLei = f.submittingEntityCode
    ? leiProblem(f.submittingEntityCode)
    : null;
  if (submitterLei) errors.submittingEntityCode = submitterLei;
  if (!leiListValid(f.aggregatedEntityLeis)) {
    errors.aggregatedEntityLeis =
      "Je Finanzunternehmen ein gültiger LEI, getrennt durch Semikolon.";
  }
  const parentLei = f.groupParentLei ? leiProblem(f.groupParentLei) : null;
  if (parentLei) errors.groupParentLei = parentLei;
  if (!CURRENCY_PATTERN.test(f.reportingCurrency)) {
    errors.reportingCurrency = "ISO-4217-Code aus drei Buchstaben, z. B. EUR.";
  }
  if (!f.primaryContactName.trim()) {
    errors.primaryContactName = "Bitte geben Sie eine verantwortliche Person an.";
  }
  if (!EMAIL_PATTERN.test(f.primaryContactEmail)) {
    errors.primaryContactEmail = "Bitte geben Sie eine gültige E-Mail-Adresse an.";
  }
  if (!f.primaryContactPhone.trim()) {
    errors.primaryContactPhone = "Bitte geben Sie eine Telefonnummer an.";
  }
  if (f.secondContactEmail && !EMAIL_PATTERN.test(f.secondContactEmail)) {
    errors.secondContactEmail = "Bitte geben Sie eine gültige E-Mail-Adresse an.";
  }
  return errors;
}

const ENTITY_FIELDS: (keyof ReportForm)[] = [
  "entityName",
  "entityLei",
  "submittingEntityCode",
  "aggregatedEntityLeis",
  "groupParentLei",
  "reportingCurrency",
];

const CONTACT_FIELDS: (keyof ReportForm)[] = [
  "primaryContactName",
  "primaryContactEmail",
  "primaryContactPhone",
  "secondContactEmail",
];

function noErrorsIn(fields: (keyof ReportForm)[], f: ReportForm): boolean {
  const errors = generalInformationErrors(f);
  return fields.every((field) => !errors[field]);
}

const OBLIGATION_TONE: Record<
  ObligationLevel,
  { icon: typeof ShieldAlert; bar: string; chip: string }
> = {
  required: {
    icon: ShieldAlert,
    bar: "bg-destructive",
    chip: "bg-destructive/10 text-destructive",
  },
  unclear: {
    icon: ShieldQuestion,
    bar: "bg-warning",
    chip: "bg-warning/15 text-warning",
  },
  none: {
    icon: ShieldCheck,
    bar: "bg-success",
    chip: "bg-success/15 text-success",
  },
};

/* ---------------------------------------------------------------------------
 * Schritte – ein Schritt je Gruppe zusammengehörender Angaben
 * ------------------------------------------------------------------------- */

type StepId =
  | "submission"
  | "entity"
  | "contacts"
  | "identification"
  | "description"
  | "criteria"
  | "detection"
  | "reclassification"
  | "timing"
  | "criteriaImpact"
  | "criteriaDurationGeo"
  | "criteriaDataCritical"
  | "nature"
  | "affected"
  | "authoritiesMeasures"
  | "causes"
  | "resolution"
  | "resolutionAuthorities"
  | "costs"
  | "recurring"
  | "threatTiming"
  | "threatDescription"
  | "threatImpact"
  | "threatCriteria"
  | "threatStatus"
  | "threatNotifications"
  | "threatIndicators";

interface StepDef {
  id: StepId;
  /** Artikel des RTS, dessen Inhalte dieser Schritt abdeckt. */
  article: ContentArticle;
  /** Meldungen, die diesen Schritt verlangen. */
  kinds: SubmissionKind[];
  title: string;
  /** Kurzfassung der Angaben für die eingeklappte Ansicht. */
  summary: (f: ReportForm) => string;
  /**
   * Sind die Pflichtangaben dieses Schritts vollständig? Schritte, die der RTS
   * nur "gegebenenfalls" oder "soweit verfügbar" verlangt, melden stets `true`.
   */
  complete: (f: ReportForm) => boolean;
}

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "short",
  timeStyle: "short",
});

const nf = new Intl.NumberFormat("de-DE");

function formatDateTime(value: string | Date): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime())
    ? String(value)
    : dateTimeFormat.format(date);
}

function join(parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" · ");
}

function num(value: string): string | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? nf.format(parsed) : value;
}

function labelsOf(
  items: readonly { id: string; label: string }[],
  ids: readonly string[],
): string[] {
  return items.filter((i) => ids.includes(i.id)).map((i) => i.label);
}

function labelOf(
  items: readonly { id: string; label: string }[],
  id: string | null,
): string | null {
  return items.find((i) => i.id === id)?.label ?? null;
}

/**
 * Ist die Frist für die Erstmeldung abgelaufen? Dann verlangt Art. 5 Abs. 3,
 * der Behörde die Gründe für die Verzögerung mitzuteilen.
 */
function initialDeadlinePassed(form: ReportForm, now: Date = new Date()): boolean {
  if (form.reportType !== "initial" || !form.detectedAt || !form.classifiedAt) {
    return false;
  }
  const detectedAt = new Date(form.detectedAt);
  const classifiedAt = new Date(form.classifiedAt);
  if (
    Number.isNaN(detectedAt.getTime()) ||
    Number.isNaN(classifiedAt.getTime())
  ) {
    return false;
  }
  return now > initialReportDeadline(detectedAt, classifiedAt).dueAt;
}

const BOTH: SubmissionKind[] = ["incident", "cyber_threat"];
const INCIDENT: SubmissionKind[] = ["incident"];
const THREAT: SubmissionKind[] = ["cyber_threat"];

const STEPS: StepDef[] = [
  {
    id: "submission",
    article: 1,
    kinds: BOTH,
    title: "Art der Meldung",
    summary: (f) =>
      join([
        REPORT_TYPE_BY_ID[f.reportType].label,
        isFollowUp(f.reportType) &&
          f.authorityReferenceCode &&
          `Referenzcode ${f.authorityReferenceCode}`,
      ]),
    complete: (f) =>
      !isFollowUp(f.reportType) || f.authorityReferenceCode.trim().length > 0,
  },
  {
    id: "entity",
    article: 1,
    kinds: BOTH,
    title: "Meldendes Finanzunternehmen",
    summary: (f) => join([f.entityName, f.entityLei, f.reportingCurrency]),
    complete: (f) => noErrorsIn(ENTITY_FIELDS, f),
  },
  {
    id: "contacts",
    article: 1,
    kinds: BOTH,
    title: "Verantwortliche für die Kommunikation mit der Behörde",
    summary: (f) =>
      join([f.primaryContactName, f.primaryContactEmail, f.secondContactName]),
    complete: (f) => noErrorsIn(CONTACT_FIELDS, f),
  },

  /* --- Art. 2: Erstmeldung ------------------------------------------------ */

  {
    id: "identification",
    article: 2,
    kinds: INCIDENT,
    title: "Referenzcode, Erkennung und Einstufung",
    summary: (f) =>
      join([
        f.incidentReferenceCode,
        f.detectedAt && `erkannt ${formatDateTime(f.detectedAt)}`,
        f.classifiedAt && `eingestuft ${formatDateTime(f.classifiedAt)}`,
      ]),
    complete: (f) =>
      f.incidentReferenceCode.trim().length > 0 &&
      f.detectedAt.length > 0 &&
      f.classifiedAt.length > 0,
  },
  {
    id: "description",
    article: 2,
    kinds: INCIDENT,
    title: "Beschreibung des Vorfalls",
    summary: (f) => f.description.trim(),
    complete: (f) => f.description.trim().length >= MIN_DESCRIPTION_LENGTH,
  },
  {
    id: "criteria",
    article: 2,
    kinds: INCIDENT,
    title: "Einstufungskriterien und betroffene Mitgliedstaaten",
    summary: (f) =>
      join([
        labelsOf(DORA_CRITERIA, f.classificationCriteria).join(", "),
        f.affectedMemberStates.length > 0 && f.affectedMemberStates.join(", "),
      ]),
    complete: (f) =>
      f.reclassifiedAsNonMajor || f.classificationCriteria.length > 0,
  },
  {
    id: "detection",
    article: 2,
    kinds: INCIDENT,
    title: "Erkennung, Ursprung und Geschäftsfortführung",
    summary: (f) =>
      join([
        labelOf(DETECTION_SOURCES, f.detectionSource) &&
          `erkannt durch ${labelOf(DETECTION_SOURCES, f.detectionSource)}`,
        labelOf(INCIDENT_ORIGINS, f.incidentOrigin),
        f.businessContinuityActivated && "Geschäftsfortführungsplan aktiviert",
      ]),
    complete: (f) => f.detectionSource !== null,
  },
  {
    id: "reclassification",
    article: 2,
    kinds: INCIDENT,
    title: "Neueinstufung als nicht schwerwiegend",
    summary: (f) =>
      f.reclassifiedAsNonMajor ? "als nicht schwerwiegend neu eingestuft" : "",
    complete: (f) =>
      !f.reclassifiedAsNonMajor || f.reclassificationDetails.trim().length > 0,
  },

  /* --- Art. 3: Zwischenmeldung -------------------------------------------- */

  {
    id: "timing",
    article: 3,
    kinds: INCIDENT,
    title: "Eintreten und Wiederaufnahme des Geschäftsbetriebs",
    summary: (f) =>
      join([
        f.occurredAt && `eingetreten ${formatDateTime(f.occurredAt)}`,
        f.regularOperationsResumedAt &&
          `wiederaufgenommen ${formatDateTime(f.regularOperationsResumedAt)}`,
      ]),
    complete: () => true,
  },
  {
    id: "criteriaImpact",
    article: 3,
    kinds: INCIDENT,
    title: "Betroffene Kunden, Gegenparteien, Transaktionen und Reputation",
    summary: (f) =>
      join([
        f.clientsAffected && `${num(f.clientsAffected)} Kunden`,
        f.counterpartsAffected &&
          `${num(f.counterpartsAffected)} Gegenparteien`,
        f.transactionsAffected &&
          `${num(f.transactionsAffected)} Transaktionen`,
        labelOf(FIGURE_BASES, f.figuresBasis),
        labelsOf(REPUTATION_CONDITIONS, f.reputationalImpactConditions).join(
          ", ",
        ),
      ]),
    complete: (f) => f.figuresBasis !== null,
  },
  {
    id: "criteriaDurationGeo",
    article: 3,
    kinds: INCIDENT,
    title: "Dauer, Ausfallzeit und Auswirkungen in den Mitgliedstaaten",
    summary: (f) =>
      join([
        f.durationHours && `Dauer ${num(f.durationHours)} h`,
        f.downtimeHours && `Ausfallzeit ${num(f.downtimeHours)} h`,
        labelsOf(IMPACT_TYPES, f.memberStateImpactTypes).join(", "),
      ]),
    complete: (f) => f.durationBasis !== null,
  },
  {
    id: "criteriaDataCritical",
    article: 3,
    kinds: INCIDENT,
    title: "Datenverluste und betroffene kritische Dienste",
    summary: (f) =>
      join([
        labelsOf(DATA_LOSS_DIMENSIONS, f.dataLossDimensions).join(", "),
        f.criticalServicesDescription.trim(),
      ]),
    complete: () => true,
  },
  {
    id: "nature",
    article: 3,
    kinds: INCIDENT,
    title: "Art des Vorfalls und Vorgehen des Angreifers",
    summary: (f) => labelsOf(INCIDENT_TYPES, f.incidentTypes).join(", "),
    complete: (f) =>
      f.incidentTypes.length > 0 &&
      (!f.incidentTypes.includes("other") ||
        f.incidentTypeOther.trim().length > 0) &&
      (!f.threatTechniques.includes("other") ||
        f.threatTechniqueOther.trim().length > 0),
  },
  {
    id: "affected",
    article: 3,
    kinds: INCIDENT,
    title: "Funktionsbereiche, Infrastruktur und Kundeninteressen",
    summary: (f) =>
      join([
        labelsOf(FUNCTIONAL_AREAS, f.functionalAreas).join(", "),
        labelOf(INFRASTRUCTURE_ANSWERS, f.infrastructureAffected) &&
          `Infrastruktur: ${labelOf(
            INFRASTRUCTURE_ANSWERS,
            f.infrastructureAffected,
          )}`,
      ]),
    complete: (f) => f.infrastructureAffected !== null,
  },
  {
    id: "authoritiesMeasures",
    article: 3,
    kinds: INCIDENT,
    title: "Andere Behörden, befristete Maßnahmen und Indikatoren",
    summary: (f) =>
      join([
        labelsOf(NOTIFIED_AUTHORITIES, f.notifiedAuthorities).join(", "),
        f.temporaryMeasuresTaken && "befristete Maßnahmen ergriffen",
      ]),
    complete: (f) =>
      f.notifiedAuthorities.length > 0 &&
      (!f.notifiedAuthorities.includes("other") ||
        f.notifiedAuthoritiesOther.trim().length > 0),
  },

  /* --- Art. 4: Abschlussmeldung ------------------------------------------- */

  {
    id: "causes",
    article: 4,
    kinds: INCIDENT,
    title: "Ursachen des Vorfalls",
    summary: (f) =>
      labelsOf(ROOT_CAUSE_CATEGORIES, f.rootCauseCategories).join(", "),
    complete: (f) =>
      f.rootCauseCategories.length > 0 &&
      f.rootCauseDetails.length > 0 &&
      f.rootCauseDescription.trim().length > 0,
  },
  {
    id: "resolution",
    article: 4,
    kinds: INCIDENT,
    title: "Behebung des Vorfalls",
    summary: (f) =>
      join([
        f.incidentResolvedAt &&
          `behoben ${formatDateTime(f.incidentResolvedAt)}`,
        f.counterMeasures.trim(),
      ]),
    complete: (f) =>
      f.counterMeasures.trim().length > 0 &&
      f.rootCauseAddressedAt.length > 0 &&
      f.incidentResolvedAt.length > 0,
  },
  {
    id: "resolutionAuthorities",
    article: 4,
    kinds: INCIDENT,
    title: "Für die Abwicklungsbehörden relevante Informationen",
    summary: (f) =>
      labelOf(RESOLUTION_RISK_ANSWERS, f.resolutionRisk)
        ? `Risiko für kritische Funktionen: ${labelOf(
            RESOLUTION_RISK_ANSWERS,
            f.resolutionRisk,
          )}`
        : "",
    complete: () => true,
  },
  {
    id: "costs",
    article: 4,
    kinds: INCIDENT,
    title: "Kosten, Verluste und finanzielle Wiedereinziehungen",
    summary: (f) =>
      f.grossCostsAndLosses
        ? `${num(f.grossCostsAndLosses)} ${f.reportingCurrency}`
        : "",
    complete: (f) => f.grossCostsAndLosses.trim().length > 0,
  },
  {
    id: "recurring",
    article: 4,
    kinds: INCIDENT,
    title: "Wiederholte Vorfälle",
    summary: (f) =>
      f.recurringIncidents
        ? join([
            "wiederholte Vorfälle",
            f.recurringIncidentCount && `${num(f.recurringIncidentCount)}×`,
          ])
        : "",
    complete: (f) => !f.recurringIncidents || f.firstRecurringIncidentAt !== "",
  },

  /* --- Art. 6: Freiwillige Meldung erheblicher Cyberbedrohungen ------------ */

  {
    id: "threatTiming",
    article: 6,
    kinds: THREAT,
    title: "Erkennung der Cyberbedrohung",
    summary: (f) =>
      f.detectedAt ? `erkannt ${formatDateTime(f.detectedAt)}` : "",
    complete: (f) => f.detectedAt.length > 0,
  },
  {
    id: "threatDescription",
    article: 6,
    kinds: THREAT,
    title: "Beschreibung der Cyberbedrohung",
    summary: (f) => f.description.trim(),
    complete: (f) => f.description.trim().length >= MIN_DESCRIPTION_LENGTH,
  },
  {
    id: "threatImpact",
    article: 6,
    kinds: THREAT,
    title: "Mögliche Auswirkungen",
    summary: (f) => f.potentialImpact.trim(),
    complete: (f) => f.potentialImpact.trim().length >= MIN_DESCRIPTION_LENGTH,
  },
  {
    id: "threatCriteria",
    article: 6,
    kinds: THREAT,
    title: "Kriterien, die eine Meldepflicht ausgelöst hätten",
    summary: (f) =>
      labelsOf(DORA_CRITERIA, f.classificationCriteria).join(", "),
    complete: (f) => f.classificationCriteria.length > 0,
  },
  {
    id: "threatStatus",
    article: 6,
    kinds: THREAT,
    title: "Status der Bedrohung und ergriffene Maßnahmen",
    summary: (f) =>
      join([
        labelOf(THREAT_STATUSES, f.threatStatus),
        labelOf(THREAT_ACTIVITY_CHANGES, f.threatActivityChange) &&
          `Aktivität ${labelOf(
            THREAT_ACTIVITY_CHANGES,
            f.threatActivityChange,
          )?.toLowerCase()}`,
      ]),
    complete: (f) => f.threatStatus !== null,
  },
  {
    id: "threatNotifications",
    article: 6,
    kinds: THREAT,
    title: "Benachrichtigte Behörden und Finanzunternehmen",
    summary: (f) =>
      join([
        labelsOf(NOTIFIED_AUTHORITIES, f.notifiedAuthorities).join(", "),
        f.notifiedFinancialEntities.trim(),
      ]),
    complete: (f) =>
      f.notifiedAuthorities.length > 0 &&
      (!f.notifiedAuthorities.includes("other") ||
        f.notifiedAuthoritiesOther.trim().length > 0),
  },
  {
    id: "threatIndicators",
    article: 6,
    kinds: THREAT,
    title: "Kompromittierungsindikatoren",
    summary: (f) => (f.indicatorsOfCompromise.trim() ? "erfasst" : ""),
    complete: () => true,
  },
];

const STEP_IDS = new Set<string>(STEPS.map((s) => s.id));

const initialStatus = Object.fromEntries(
  STEPS.map((s) => [s.id, "pending" as StepStatus]),
) as Record<StepId, StepStatus>;

/** Schritte, die diese Meldung verlangt. */
function stepsFor(kind: SubmissionKind, reportType: ReportType): StepDef[] {
  return STEPS.filter(
    (s) =>
      s.kinds.includes(kind) &&
      (kind !== "incident" || coversArticle(reportType, s.article)),
  );
}

function nextStepId(
  kind: SubmissionKind,
  reportType: ReportType,
  id: StepId,
): StepId | null {
  const steps = stepsFor(kind, reportType);
  const index = steps.findIndex((s) => s.id === id);
  return steps[index + 1]?.id ?? null;
}

interface ReportDraft {
  kind: SubmissionKind;
  form: ReportForm;
  /**
   * Die Vorbelegung aus dem Unternehmensprofil, wie sie in den Entwurf
   * geschrieben wurde. Ändert sich das Profil danach – etwa weil ein LEI
   * korrigiert wurde –, lässt sich daran erkennen, welche Felder noch die
   * alte Vorbelegung tragen und welche der Anwender selbst geändert hat.
   */
  profileSnapshot: Partial<ReportForm>;
  stepStatus: Record<StepId, StepStatus>;
  /** Aktuell aufgeklappter Schritt; null = alle eingeklappt. */
  activeStep: StepId | null;
}

/* ---------------------------------------------------------------------------
 * Vorbelegung aus Unternehmensprofil und Schritt 02
 * ------------------------------------------------------------------------- */

/**
 * Die allgemeinen Angaben nach Art. 1 sind bei jeder Meldung dieselben. Sie
 * bleiben im Formular änderbar – die Meldung kann etwa von einem
 * Drittdienstleister abgegeben werden.
 */
function formFromProfile(
  profile: CompanyProfile | undefined,
): Partial<ReportForm> {
  if (!profile) return {};
  return {
    entityName: profile.name,
    entityLei: profile.lei,
    entityType: profile.entityType,
    primaryContactName: profile.contactName,
    primaryContactEmail: profile.contactEmail,
    primaryContactPhone: profile.contactPhone,
    secondContactName: profile.secondContactName,
    secondContactEmail: profile.secondContactEmail,
    secondContactPhone: profile.secondContactPhone,
    groupParentName: profile.groupParentName,
    groupParentLei: profile.groupParentLei,
    reportingCurrency: profile.reportingCurrency,
    incidentReferenceCode: profile.incidentReferencePrefix,
  };
}

/** Der in Schritt 02 erfasste Stand, soweit er in die Meldung eingeht. */
interface SeverityEcho {
  form?: {
    description?: string;
    clientsAffected?: string;
    clientsAffectedPercent?: string;
    counterpartsAffectedPercent?: string;
    transactionsCountPercent?: string;
    relevantClientsAffected?: boolean;
    durationHours?: string;
    downtimeHours?: string;
    geoImpactAreas?: GeoImpactArea[];
    dataLossDimensions?: DataLossDimension[];
    reputationalImpactConditions?: ReputationCondition[];
    economicImpactEur?: string;
  };
}

/**
 * Die drei Bereiche des Kriteriums "Geografische Ausbreitung" aus Schritt 02
 * (Art. 4 Buchst. a–c DelVO (EU) 2024/1772) decken die sechs Auswirkungsarten
 * ab, die die Zwischenmeldung unterscheidet.
 */
const GEO_AREA_TO_IMPACT_TYPES: Record<
  GeoImpactArea,
  ReportForm["memberStateImpactTypes"]
> = {
  clients_counterparts: ["clients", "counterparts"],
  group_branches: ["branches", "group_entities"],
  fmi_third_parties: ["market_infrastructure", "third_parties"],
};

/**
 * Angaben, die in Schritt 02 bereits erhoben wurden. Sie belegen dieselben
 * Sachverhalte, die die Meldung nach Art. 3 Buchst. d verlangt – sie erneut
 * abzufragen wäre eine Fehlerquelle.
 */
function formFromSeverity(
  severity: SeverityEcho | null | undefined,
  result: SeverityResult | null | undefined,
): Partial<ReportForm> {
  const prefill: Partial<ReportForm> = {};
  if (result) {
    prefill.classificationCriteria = result.findings
      .filter((f) => f.thresholdMet)
      .map((f) => f.criterionId);
  }
  const f = severity?.form;
  if (!f) return prefill;
  return {
    ...prefill,
    description: f.description ?? "",
    clientsAffected: f.clientsAffected ?? "",
    clientsAffectedPercent: f.clientsAffectedPercent ?? "",
    counterpartsAffectedPercent: f.counterpartsAffectedPercent ?? "",
    transactionsAffectedPercent: f.transactionsCountPercent ?? "",
    durationHours: f.durationHours ?? "",
    downtimeHours: f.downtimeHours ?? "",
    dataLossDimensions: f.dataLossDimensions ?? [],
    reputationalImpactConditions: f.reputationalImpactConditions ?? [],
    memberStateImpactTypes: [
      ...new Set(
        (f.geoImpactAreas ?? []).flatMap(
          (area) => GEO_AREA_TO_IMPACT_TYPES[area] ?? [],
        ),
      ),
    ],
    grossCostsAndLosses: f.economicImpactEur ?? "",
  };
}

function initialDraft(
  prefill: Partial<ReportForm>,
  profile: CompanyProfile | undefined,
  kind: SubmissionKind,
): ReportDraft {
  const fromProfile = formFromProfile(profile);
  return {
    kind,
    form: { ...emptyForm, ...fromProfile, ...prefill },
    profileSnapshot: fromProfile,
    stepStatus: initialStatus,
    activeStep: "submission",
  };
}

/**
 * Ergänzt einen gespeicherten Stand um fehlende Felder. Stände aus früheren
 * Fassungen dieser Seite werden übernommen, statt die Seite scheitern zu
 * lassen; unbekannte Schrittkennungen fallen auf den ersten Schritt zurück.
 *
 * Felder, die aus dem Unternehmensprofil stammen, folgen dem Profil, solange
 * der Anwender sie nicht selbst geändert hat: Trägt der Entwurf noch den Wert,
 * mit dem er vorbelegt wurde, gilt der aktuelle Wert des Profils.
 */
function withDefaults(
  stored: Partial<ReportDraft> | null | undefined,
  prefill: Partial<ReportForm>,
  profile: CompanyProfile | undefined,
  kind: SubmissionKind,
): ReportDraft {
  const base = initialDraft(prefill, profile, kind);
  if (!stored) return base;
  const activeStep =
    stored.activeStep === null
      ? null
      : stored.activeStep && STEP_IDS.has(stored.activeStep)
        ? stored.activeStep
        : base.activeStep;

  const form: ReportForm = { ...base.form, ...stored.form };
  // Ein Entwurf ohne Momentaufnahme stammt aus einer früheren Fassung. Seine
  // Profilfelder gelten als unberührt – bis auf den Referenzcode, dessen
  // Vorbelegung nur ein Präfix ist und den der Anwender daher fast immer
  // selbst vervollständigt hat.
  const snapshot = stored.profileSnapshot;
  for (const key of Object.keys(base.profileSnapshot) as (keyof ReportForm)[]) {
    const untouched =
      snapshot === undefined
        ? key !== "incidentReferenceCode"
        : stored.form?.[key] === undefined ||
          stored.form[key] === snapshot[key];
    if (untouched) {
      (form as Record<keyof ReportForm, unknown>)[key] = base.profileSnapshot[key];
    }
  }

  return {
    kind: stored.kind ?? base.kind,
    form,
    profileSnapshot: base.profileSnapshot,
    stepStatus: { ...initialStatus, ...stored.stepStatus },
    activeStep,
  };
}

export default function ReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const result = useSessionValue<SeverityResult>(STORAGE_KEYS.severityResult);
  // Der Entwurf aus Schritt 02 wird ausschließlich lesend berührt.
  const severityDraft = useSessionValue<SeverityEcho>(
    STORAGE_KEYS.severityDraft,
  );
  const prefill = formFromSeverity(severityDraft, result);
  const profile = useCompanyProfile();
  const stored = useSessionValue<Partial<ReportDraft>>(STORAGE_KEYS.reportDraft);
  // Ohne Meldepflicht ist die freiwillige Meldung der naheliegende Weg.
  const defaultKind: SubmissionKind =
    result?.classification === "non_major" ? "cyber_threat" : "incident";
  const draft = withDefaults(stored, prefill, profile, defaultKind);
  const { kind, form, stepStatus, activeStep } = draft;

  function patch(fn: (d: ReportDraft) => ReportDraft) {
    updateSession<Partial<ReportDraft>>(STORAGE_KEYS.reportDraft, (current) =>
      fn(withDefaults(current, prefill, profile, defaultKind)),
    );
  }

  function update<K extends keyof ReportForm>(key: K, value: ReportForm[K]) {
    patch((d) => ({ ...d, form: { ...d.form, [key]: value } }));
  }

  /** Mehrfachauswahl umschalten. */
  function toggle<K extends keyof ReportForm>(
    key: K,
    id: ReportForm[K] extends (infer E)[] ? E : never,
  ) {
    patch((d) => {
      const list = d.form[key] as unknown as unknown[];
      const next = list.includes(id)
        ? list.filter((x) => x !== id)
        : [...list, id];
      return { ...d, form: { ...d.form, [key]: next as ReportForm[K] } };
    });
  }

  /** Angaben (erneut) aus dem Unternehmensprofil übernehmen. */
  function applyProfileFields(fields: Partial<ReportForm>) {
    patch((d) => ({ ...d, form: { ...d.form, ...fields } }));
  }

  function toggleStep(id: StepId) {
    patch((d) => ({ ...d, activeStep: d.activeStep === id ? null : id }));
  }

  function completeStep(id: StepId) {
    patch((d) => ({
      ...d,
      stepStatus: { ...d.stepStatus, [id]: "done" },
      activeStep: nextStepId(d.kind, d.form.reportType, id),
    }));
  }

  /**
   * Die Ursachen sind dreistufig einzustufen. Wird eine übergeordnete
   * Kategorie abgewählt, entfallen ihre Detail- und weitergehenden Ursachen;
   * dasselbe gilt eine Ebene tiefer.
   */
  function toggleRootCauseCategory(categoryId: string) {
    patch((d) => {
      const selected = d.form.rootCauseCategories as string[];
      const active = selected.includes(categoryId);
      const categories = active
        ? selected.filter((x) => x !== categoryId)
        : [...selected, categoryId];
      const keep = (id: string) => !id.startsWith(`${categoryId}.`);
      return {
        ...d,
        form: {
          ...d.form,
          rootCauseCategories: categories as ReportForm["rootCauseCategories"],
          rootCauseDetails: active
            ? d.form.rootCauseDetails.filter(keep)
            : d.form.rootCauseDetails,
          rootCauseFurther: active
            ? d.form.rootCauseFurther.filter(keep)
            : d.form.rootCauseFurther,
        },
      };
    });
  }

  function toggleRootCauseDetail(detailId: string) {
    patch((d) => {
      const active = d.form.rootCauseDetails.includes(detailId);
      return {
        ...d,
        form: {
          ...d.form,
          rootCauseDetails: active
            ? d.form.rootCauseDetails.filter((x) => x !== detailId)
            : [...d.form.rootCauseDetails, detailId],
          rootCauseFurther: active
            ? d.form.rootCauseFurther.filter(
                (x) => !x.startsWith(`${detailId}.`),
              )
            : d.form.rootCauseFurther,
        },
      };
    });
  }

  /** Die vollständige Meldung, wie sie an die Schnittstelle geht. */
  function toSubmission() {
    return {
      ...form,
      kind,
      classification: result?.classification ?? "indeterminate",
      competentAuthority: profile?.competentAuthority ?? "",
      nis2EssentialEntity: profile?.nis2EssentialEntity ?? false,
    };
  }

  async function onSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!result) return;
    const incomplete = stepsFor(kind, form.reportType).find(
      (s) => !s.complete(form),
    );
    if (incomplete) {
      toast.error(`Bitte vervollständigen Sie: ${incomplete.title}.`);
      patch((d) => ({ ...d, activeStep: incomplete.id }));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSubmission()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Übermittlung fehlgeschlagen.");
      }
      saveSession(
        STORAGE_KEYS.reportReceipt,
        (await res.json()) as ReportReceipt,
      );
      router.push("/meldung/bestaetigung");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unbekannter Fehler.");
      setLoading(false);
    }
  }

  /* --- Felder je Schritt -------------------------------------------------- */

  function stepFields(id: StepId) {
    const fieldErrors = generalInformationErrors(form);
    switch (id) {
      case "submission":
        return (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              {SUBMISSION_KINDS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => patch((d) => ({ ...d, kind: k.id }))}
                  className={cn(
                    "rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors",
                    kind === k.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 bg-background hover:border-primary/40 hover:bg-muted",
                  )}
                >
                  {k.label}
                </button>
              ))}
            </div>

            {kind === "incident" && (
              <>
                <div className="space-y-2">
                  <Label>
                    Art der Übermittlung
                  </Label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {REPORT_TYPES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => update("reportType", t.id)}
                        className={cn(
                          "rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                          form.reportType === t.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/60 bg-background hover:border-primary/40 hover:bg-muted",
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                {isFollowUp(form.reportType) && (
                  <Field
                    label="Von der zuständigen Behörde mitgeteilter Referenzcode"
                    htmlFor="authorityReferenceCode"
                  >
                    <Input
                      id="authorityReferenceCode"
                      value={form.authorityReferenceCode}
                      onChange={(e) =>
                        update("authorityReferenceCode", e.target.value)
                      }
                    />
                  </Field>
                )}
              </>
            )}
          </>
        );

      case "entity":
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Name des Finanzunternehmens"
                htmlFor="entityName"
                error={fieldErrors.entityName}
              >
                <Input
                  id="entityName"
                  aria-invalid={Boolean(fieldErrors.entityName)}
                  value={form.entityName}
                  onChange={(e) => update("entityName", e.target.value)}
                />
              </Field>
              <Field
                label="LEI-Code des Finanzunternehmens"
                htmlFor="entityLei"
                error={fieldErrors.entityLei}
              >
                <Input
                  id="entityLei"
                  aria-invalid={Boolean(fieldErrors.entityLei)}
                  maxLength={20}
                  placeholder="20 alphanumerische Zeichen"
                  value={form.entityLei}
                  onChange={(e) =>
                    update("entityLei", e.target.value.toUpperCase().trim())
                  }
                />
              </Field>
            </div>

            {profile &&
              (form.entityName !== profile.name ||
                form.entityLei !== profile.lei ||
                form.entityType !== profile.entityType ||
                form.groupParentName !== profile.groupParentName ||
                form.groupParentLei !== profile.groupParentLei ||
                form.reportingCurrency !== profile.reportingCurrency) && (
                <ProfileApplyButton
                  icon={Building2}
                  onClick={() =>
                    applyProfileFields({
                      entityName: profile.name,
                      entityLei: profile.lei,
                      entityType: profile.entityType,
                      groupParentName: profile.groupParentName,
                      groupParentLei: profile.groupParentLei,
                      reportingCurrency: profile.reportingCurrency,
                    })
                  }
                />
              )}

            <div className="space-y-2">
              <Label htmlFor="entityType">
                Art des Finanzunternehmens
              </Label>
              <Select
                items={ENTITY_TYPE_ITEMS}
                value={form.entityType}
                onValueChange={(value) =>
                  update("entityType", value as EntityType)
                }
              >
                <SelectTrigger id="entityType" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Name des übermittelnden Unternehmens"
                htmlFor="submittingEntityName"
              >
                <Input
                  id="submittingEntityName"
                  value={form.submittingEntityName}
                  onChange={(e) =>
                    update("submittingEntityName", e.target.value)
                  }
                />
              </Field>
              <Field
                label="Identifikationscode des übermittelnden Unternehmens"
                htmlFor="submittingEntityCode"
                error={fieldErrors.submittingEntityCode}
              >
                <Input
                  id="submittingEntityCode"
                  aria-invalid={Boolean(fieldErrors.submittingEntityCode)}
                  maxLength={20}
                  value={form.submittingEntityCode}
                  onChange={(e) =>
                    update(
                      "submittingEntityCode",
                      e.target.value.toUpperCase().trim(),
                    )
                  }
                />
              </Field>
              <Field
                label="Weitere Finanzunternehmen einer aggregierten Meldung"
                htmlFor="aggregatedEntityNames"
              >
                <Input
                  id="aggregatedEntityNames"
                  value={form.aggregatedEntityNames}
                  onChange={(e) =>
                    update("aggregatedEntityNames", e.target.value)
                  }
                />
              </Field>
              <Field
                label="Deren LEI-Codes"
                htmlFor="aggregatedEntityLeis"
                error={fieldErrors.aggregatedEntityLeis}
              >
                <Input
                  id="aggregatedEntityLeis"
                  aria-invalid={Boolean(fieldErrors.aggregatedEntityLeis)}
                  value={form.aggregatedEntityLeis}
                  onChange={(e) =>
                    update("aggregatedEntityLeis", e.target.value.toUpperCase())
                  }
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Mutterunternehmen der Gruppe"
                htmlFor="groupParentName"
              >
                <Input
                  id="groupParentName"
                  value={form.groupParentName}
                  onChange={(e) => update("groupParentName", e.target.value)}
                />
              </Field>
              <Field
                label="Dessen LEI-Code"
                htmlFor="groupParentLei"
                error={fieldErrors.groupParentLei}
              >
                <Input
                  id="groupParentLei"
                  aria-invalid={Boolean(fieldErrors.groupParentLei)}
                  maxLength={20}
                  value={form.groupParentLei}
                  onChange={(e) =>
                    update("groupParentLei", e.target.value.toUpperCase().trim())
                  }
                />
              </Field>
              <Field
                label="Währung monetärer Beträge"
                htmlFor="reportingCurrency"
                error={fieldErrors.reportingCurrency}
              >
                <Input
                  id="reportingCurrency"
                  aria-invalid={Boolean(fieldErrors.reportingCurrency)}
                  maxLength={3}
                  value={form.reportingCurrency}
                  onChange={(e) =>
                    update(
                      "reportingCurrency",
                      e.target.value.toUpperCase().trim(),
                    )
                  }
                />
              </Field>
            </div>
          </>
        );

      case "contacts":
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Name"
                htmlFor="primaryContactName"
                error={fieldErrors.primaryContactName}
              >
                <Input
                  id="primaryContactName"
                  aria-invalid={Boolean(fieldErrors.primaryContactName)}
                  value={form.primaryContactName}
                  onChange={(e) => update("primaryContactName", e.target.value)}
                />
              </Field>
              <Field
                label="E-Mail-Adresse"
                htmlFor="primaryContactEmail"
                error={fieldErrors.primaryContactEmail}
              >
                <Input
                  id="primaryContactEmail"
                  aria-invalid={Boolean(fieldErrors.primaryContactEmail)}
                  type="email"
                  value={form.primaryContactEmail}
                  onChange={(e) => update("primaryContactEmail", e.target.value)}
                />
              </Field>
              <Field
                label="Telefonnummer"
                htmlFor="primaryContactPhone"
                error={fieldErrors.primaryContactPhone}
              >
                <Input
                  id="primaryContactPhone"
                  aria-invalid={Boolean(fieldErrors.primaryContactPhone)}
                  type="tel"
                  placeholder="+49 69 12345678"
                  value={form.primaryContactPhone}
                  onChange={(e) => update("primaryContactPhone", e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Name der zweiten Person oder des Teams"
                htmlFor="secondContactName"
              >
                <Input
                  id="secondContactName"
                  value={form.secondContactName}
                  onChange={(e) => update("secondContactName", e.target.value)}
                />
              </Field>
              <Field
                label="E-Mail-Adresse"
                htmlFor="secondContactEmail"
                error={fieldErrors.secondContactEmail}
              >
                <Input
                  id="secondContactEmail"
                  aria-invalid={Boolean(fieldErrors.secondContactEmail)}
                  type="email"
                  value={form.secondContactEmail}
                  onChange={(e) => update("secondContactEmail", e.target.value)}
                />
              </Field>
              <Field
                label="Telefonnummer"
                htmlFor="secondContactPhone"
              >
                <Input
                  id="secondContactPhone"
                  type="tel"
                  value={form.secondContactPhone}
                  onChange={(e) => update("secondContactPhone", e.target.value)}
                />
              </Field>
            </div>
            {profile &&
              (form.primaryContactName !== profile.contactName ||
                form.primaryContactEmail !== profile.contactEmail ||
                form.primaryContactPhone !== profile.contactPhone) && (
                <ProfileApplyButton
                  icon={UserRound}
                  onClick={() =>
                    applyProfileFields({
                      primaryContactName: profile.contactName,
                      primaryContactEmail: profile.contactEmail,
                      primaryContactPhone: profile.contactPhone,
                      secondContactName: profile.secondContactName,
                      secondContactEmail: profile.secondContactEmail,
                      secondContactPhone: profile.secondContactPhone,
                    })
                  }
                />
              )}
          </>
        );

      case "identification":
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Referenzcode des Vorfalls"
                htmlFor="incidentReferenceCode"
              >
                <Input
                  id="incidentReferenceCode"
                  placeholder="z. B. INC-2026-0042"
                  value={form.incidentReferenceCode}
                  onChange={(e) =>
                    update("incidentReferenceCode", e.target.value)
                  }
                />
              </Field>
              <Field
                label="Erkennung des Vorfalls"
                htmlFor="detectedAt"
              >
                <Input
                  id="detectedAt"
                  type="datetime-local"
                  value={form.detectedAt}
                  onChange={(e) => update("detectedAt", e.target.value)}
                />
              </Field>
              <Field
                label="Einstufung als schwerwiegend"
                htmlFor="classifiedAt"
              >
                <Input
                  id="classifiedAt"
                  type="datetime-local"
                  value={form.classifiedAt}
                  onChange={(e) => update("classifiedAt", e.target.value)}
                />
              </Field>
            </div>
            <DeadlineNote form={form} />
            {initialDeadlinePassed(form) && (
              <Field
                label="Gründe für die verspätete Übermittlung"
                htmlFor="delayReason"
              >
                <Textarea
                  id="delayReason"
                  rows={3}
                  value={form.delayReason}
                  onChange={(e) => update("delayReason", e.target.value)}
                />
              </Field>
            )}
          </>
        );

      case "description":
        return (
          <>
            <Field
              label="Beschreibung des IKT-bezogenen Vorfalls"
              htmlFor="description"
            >
              <Textarea
                id="description"
                rows={7}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </Field>
            <Field
              label="Sonstige zweckdienliche Informationen"
              htmlFor="additionalInformation"
            >
              <Textarea
                id="additionalInformation"
                rows={4}
                value={form.additionalInformation}
                onChange={(e) =>
                  update("additionalInformation", e.target.value)
                }
              />
            </Field>
          </>
        );

      case "criteria":
        return (
          <>
            <div className="space-y-2">
              <Label>
                Kriterien, auf deren
                Grundlage der Vorfall als schwerwiegend eingestuft wurde
              </Label>
              <div className="flex flex-wrap gap-2">
                {DORA_CRITERIA.map((c) => (
                  <TogglePill
                    key={c.id}
                    active={form.classificationCriteria.includes(c.id)}
                    onClick={() => toggle("classificationCriteria", c.id)}
                  >
                    {c.label}
                  </TogglePill>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                Betroffene Mitgliedstaaten
              </Label>
              <div className="flex flex-wrap gap-2">
                {MEMBER_STATES.map((s) => (
                  <TogglePill
                    key={s.id}
                    active={form.affectedMemberStates.includes(s.id)}
                    onClick={() => toggle("affectedMemberStates", s.id)}
                  >
                    <span className="font-mono text-xs text-muted-foreground">
                      {s.id}
                    </span>{" "}
                    {s.label}
                  </TogglePill>
                ))}
              </div>
            </div>
          </>
        );

      case "detection":
        return (
          <>
            <div className="space-y-2">
              <Label>
                Wie wurde der Vorfall
                erkannt?
              </Label>
              <div className="flex flex-wrap gap-2">
                {DETECTION_SOURCES.map((s) => (
                  <TogglePill
                    key={s.id}
                    active={form.detectionSource === s.id}
                    onClick={() => update("detectionSource", s.id)}
                  >
                    {s.label}
                  </TogglePill>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                Ursprung des Vorfalls
              </Label>
              <div className="flex flex-wrap gap-2">
                {INCIDENT_ORIGINS.map((o) => (
                  <TogglePill
                    key={o.id}
                    active={form.incidentOrigin === o.id}
                    onClick={() => update("incidentOrigin", o.id)}
                  >
                    {o.label}
                  </TogglePill>
                ))}
              </div>
            </div>
            {form.incidentOrigin !== null &&
              EXTERNAL_ORIGINS.includes(form.incidentOrigin) && (
                <Field
                  label="Bezeichnung des Dritten"
                  htmlFor="originEntityDetails"
                >
                  <Textarea
                    id="originEntityDetails"
                    rows={3}
                    value={form.originEntityDetails}
                    onChange={(e) =>
                      update("originEntityDetails", e.target.value)
                    }
                  />
                </Field>
              )}
            <YesNo
              question="Wurde ein Geschäftsfortführungsplan aktiviert?"
              value={form.businessContinuityActivated}
              onChange={(v) => update("businessContinuityActivated", v)}
            />
          </>
        );

      case "reclassification":
        return (
          <>
            <YesNo
              question="Wird der Vorfall als nicht schwerwiegend neu eingestuft?"
              value={form.reclassifiedAsNonMajor}
              onChange={(v) => update("reclassifiedAsNonMajor", v)}
            />
            {form.reclassifiedAsNonMajor && (
              <Field
                label="Gründe der Neueinstufung"
                htmlFor="reclassificationDetails"
              >
                <Textarea
                  id="reclassificationDetails"
                  rows={4}
                  value={form.reclassificationDetails}
                  onChange={(e) =>
                    update("reclassificationDetails", e.target.value)
                  }
                />
              </Field>
            )}
          </>
        );

      case "timing":
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Eintreten des Vorfalls"
              htmlFor="occurredAt"
            >
              <Input
                id="occurredAt"
                type="datetime-local"
                value={form.occurredAt}
                onChange={(e) => update("occurredAt", e.target.value)}
              />
            </Field>
            <Field
              label="Wiederaufnahme des regulären Geschäftsbetriebs"
              htmlFor="regularOperationsResumedAt"
            >
              <Input
                id="regularOperationsResumedAt"
                type="datetime-local"
                value={form.regularOperationsResumedAt}
                onChange={(e) =>
                  update("regularOperationsResumedAt", e.target.value)
                }
              />
            </Field>
          </div>
        );

      case "criteriaImpact":
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Betroffene Kunden (Anzahl)"
                htmlFor="clientsAffected"
              >
                <Input
                  id="clientsAffected"
                  type="number"
                  min={0}
                  value={form.clientsAffected}
                  onChange={(e) => update("clientsAffected", e.target.value)}
                />
              </Field>
              <Field
                label="Betroffene Kunden (% der Dienstnutzer)"
                htmlFor="clientsAffectedPercent"
              >
                <Input
                  id="clientsAffectedPercent"
                  type="number"
                  min={0}
                  max={100}
                  value={form.clientsAffectedPercent}
                  onChange={(e) =>
                    update("clientsAffectedPercent", e.target.value)
                  }
                />
              </Field>
              <Field
                label="Betroffene Gegenparteien (Anzahl)"
                htmlFor="counterpartsAffected"
              >
                <Input
                  id="counterpartsAffected"
                  type="number"
                  min={0}
                  value={form.counterpartsAffected}
                  onChange={(e) =>
                    update("counterpartsAffected", e.target.value)
                  }
                />
              </Field>
              <Field
                label="Betroffene Gegenparteien (%)"
                htmlFor="counterpartsAffectedPercent"
              >
                <Input
                  id="counterpartsAffectedPercent"
                  type="number"
                  min={0}
                  max={100}
                  value={form.counterpartsAffectedPercent}
                  onChange={(e) =>
                    update("counterpartsAffectedPercent", e.target.value)
                  }
                />
              </Field>
              <Field
                label="Betroffene Transaktionen (Anzahl)"
                htmlFor="transactionsAffected"
              >
                <Input
                  id="transactionsAffected"
                  type="number"
                  min={0}
                  value={form.transactionsAffected}
                  onChange={(e) =>
                    update("transactionsAffected", e.target.value)
                  }
                />
              </Field>
              <Field
                label="Betroffene Transaktionen (%)"
                htmlFor="transactionsAffectedPercent"
              >
                <Input
                  id="transactionsAffectedPercent"
                  type="number"
                  min={0}
                  max={100}
                  value={form.transactionsAffectedPercent}
                  onChange={(e) =>
                    update("transactionsAffectedPercent", e.target.value)
                  }
                />
              </Field>
              <Field
                label={`Wert der betroffenen Transaktionen (${form.reportingCurrency})`}
                htmlFor="transactionsValue"
              >
                <Input
                  id="transactionsValue"
                  type="number"
                  min={0}
                  value={form.transactionsValue}
                  onChange={(e) => update("transactionsValue", e.target.value)}
                />
              </Field>
            </div>
            <Field
              label="Auswirkungen auf relevante Kunden oder Gegenparteien"
              htmlFor="relevantClientsImpact"
            >
              <Textarea
                id="relevantClientsImpact"
                rows={3}
                value={form.relevantClientsImpact}
                onChange={(e) => update("relevantClientsImpact", e.target.value)}
              />
            </Field>
            <div className="space-y-2">
              <Label>
                Sind diese Werte ermittelt
                oder geschätzt?
              </Label>
              <div className="flex flex-wrap gap-2">
                {FIGURE_BASES.map((b) => (
                  <TogglePill
                    key={b.id}
                    active={form.figuresBasis === b.id}
                    onClick={() => update("figuresBasis", b.id)}
                  >
                    {b.label}
                  </TogglePill>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                Reputationsschaden
              </Label>
              <div className="flex flex-wrap gap-2">
                {REPUTATION_CONDITIONS.map((c) => (
                  <TogglePill
                    key={c.id}
                    active={form.reputationalImpactConditions.includes(c.id)}
                    onClick={() => toggle("reputationalImpactConditions", c.id)}
                  >
                    {c.label}
                  </TogglePill>
                ))}
              </div>
            </div>
            <Field
              label="Erläuterung des Reputationsschadens"
              htmlFor="reputationalImpactContext"
            >
              <Textarea
                id="reputationalImpactContext"
                rows={3}
                value={form.reputationalImpactContext}
                onChange={(e) =>
                  update("reputationalImpactContext", e.target.value)
                }
              />
            </Field>
          </>
        );

      case "criteriaDurationGeo":
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Dauer des Vorfalls (Stunden)"
                htmlFor="durationHours"
              >
                <Input
                  id="durationHours"
                  type="number"
                  min={0}
                  value={form.durationHours}
                  onChange={(e) => update("durationHours", e.target.value)}
                />
              </Field>
              <Field
                label="Ausfallzeit des Dienstes (Stunden)"
                htmlFor="downtimeHours"
              >
                <Input
                  id="downtimeHours"
                  type="number"
                  min={0}
                  value={form.downtimeHours}
                  onChange={(e) => update("downtimeHours", e.target.value)}
                />
              </Field>
            </div>
            <div className="space-y-2">
              <Label>
                Sind Dauer und Ausfallzeit
                ermittelt oder geschätzt?
              </Label>
              <div className="flex flex-wrap gap-2">
                {DURATION_BASES.map((b) => (
                  <TogglePill
                    key={b.id}
                    active={form.durationBasis === b.id}
                    onClick={() =>
                      update(
                        "durationBasis",
                        b.id as ReportForm["durationBasis"],
                      )
                    }
                  >
                    {b.label}
                  </TogglePill>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                Bereiche, in denen sich der
                Vorfall in den Mitgliedstaaten auswirkt
              </Label>
              <div className="flex flex-wrap gap-2">
                {IMPACT_TYPES.map((t) => (
                  <TogglePill
                    key={t.id}
                    active={form.memberStateImpactTypes.includes(t.id)}
                    onClick={() => toggle("memberStateImpactTypes", t.id)}
                  >
                    {t.label}
                  </TogglePill>
                ))}
              </div>
            </div>
            <Field
              label="Beschreibung der Auswirkungen je Mitgliedstaat"
              htmlFor="memberStateImpactDescription"
            >
              <Textarea
                id="memberStateImpactDescription"
                rows={4}
                value={form.memberStateImpactDescription}
                onChange={(e) =>
                  update("memberStateImpactDescription", e.target.value)
                }
              />
            </Field>
          </>
        );

      case "criteriaDataCritical":
        return (
          <>
            <div className="space-y-2">
              <Label>
                Betroffene Schutzziele der
                Daten
              </Label>
              <div className="flex flex-wrap gap-2">
                {DATA_LOSS_DIMENSIONS.map((d) => (
                  <TogglePill
                    key={d.id}
                    active={form.dataLossDimensions.includes(d.id)}
                    onClick={() => toggle("dataLossDimensions", d.id)}
                  >
                    {d.label}
                  </TogglePill>
                ))}
              </div>
            </div>
            <Field
              label="Beschreibung der Datenverluste"
              htmlFor="dataLossDescription"
            >
              <Textarea
                id="dataLossDescription"
                rows={4}
                value={form.dataLossDescription}
                onChange={(e) => update("dataLossDescription", e.target.value)}
              />
            </Field>
            <Field
              label="Betroffene kritische Dienste"
              htmlFor="criticalServicesDescription"
            >
              <Textarea
                id="criticalServicesDescription"
                rows={4}
                value={form.criticalServicesDescription}
                onChange={(e) =>
                  update("criticalServicesDescription", e.target.value)
                }
              />
            </Field>
          </>
        );

      case "nature":
        return (
          <>
            <div className="space-y-2">
              <Label>
                Art des IKT-bezogenen
                Vorfalls
              </Label>
              <div className="flex flex-wrap gap-2">
                {INCIDENT_TYPES.map((t) => (
                  <TogglePill
                    key={t.id}
                    active={form.incidentTypes.includes(t.id)}
                    onClick={() => toggle("incidentTypes", t.id)}
                  >
                    {t.label}
                  </TogglePill>
                ))}
              </div>
            </div>
            {form.incidentTypes.includes("other") && (
              <Field
                label="Sonstige Art des Vorfalls"
                htmlFor="incidentTypeOther"
              >
                <Input
                  id="incidentTypeOther"
                  value={form.incidentTypeOther}
                  onChange={(e) => update("incidentTypeOther", e.target.value)}
                />
              </Field>
            )}
            <div className="space-y-2">
              <Label>
                Vom Angreifer artikulierte
                Bedrohungen und eingesetzte Techniken
              </Label>
              <div className="flex flex-wrap gap-2">
                {THREAT_TECHNIQUES.map((t) => (
                  <TogglePill
                    key={t.id}
                    active={form.threatTechniques.includes(t.id)}
                    onClick={() => toggle("threatTechniques", t.id)}
                  >
                    {t.label}
                  </TogglePill>
                ))}
              </div>
            </div>
            {form.threatTechniques.includes("other") && (
              <Field
                label="Sonstige Technik"
                htmlFor="threatTechniqueOther"
              >
                <Input
                  id="threatTechniqueOther"
                  value={form.threatTechniqueOther}
                  onChange={(e) =>
                    update("threatTechniqueOther", e.target.value)
                  }
                />
              </Field>
            )}
          </>
        );

      case "affected":
        return (
          <>
            <div className="space-y-2">
              <Label>
                Betroffene Funktionsbereiche
              </Label>
              <div className="flex flex-wrap gap-2">
                {FUNCTIONAL_AREAS.map((a) => (
                  <TogglePill
                    key={a.id}
                    active={form.functionalAreas.includes(a.id)}
                    onClick={() => toggle("functionalAreas", a.id)}
                  >
                    {a.label}
                  </TogglePill>
                ))}
              </div>
            </div>
            <Field
              label="Betroffene Geschäftsprozesse"
              htmlFor="affectedProcesses"
            >
              <Textarea
                id="affectedProcesses"
                rows={3}
                value={form.affectedProcesses}
                onChange={(e) => update("affectedProcesses", e.target.value)}
              />
            </Field>
            <div className="space-y-2">
              <Label>
                Sind Infrastrukturkomponenten
                betroffen, die Geschäftsprozesse unterstützen?
              </Label>
              <div className="flex flex-wrap gap-2">
                {INFRASTRUCTURE_ANSWERS.map((a) => (
                  <TogglePill
                    key={a.id}
                    active={form.infrastructureAffected === a.id}
                    onClick={() => update("infrastructureAffected", a.id)}
                  >
                    {a.label}
                  </TogglePill>
                ))}
              </div>
            </div>
            {form.infrastructureAffected === "yes" && (
              <Field
                label="Beschreibung der betroffenen Infrastrukturkomponenten"
                htmlFor="infrastructureDescription"
              >
                <Textarea
                  id="infrastructureDescription"
                  rows={4}
                  value={form.infrastructureDescription}
                  onChange={(e) =>
                    update("infrastructureDescription", e.target.value)
                  }
                />
              </Field>
            )}
            <YesNo
              question="Wirkt sich der Vorfall auf die finanziellen Interessen von Kunden aus?"
              value={form.clientFinancialInterestAffected}
              onChange={(v) => update("clientFinancialInterestAffected", v)}
            />
          </>
        );

      case "authoritiesMeasures":
        return (
          <>
            <AuthoritiesPicker
              form={form}
              onToggle={(id) => toggle("notifiedAuthorities", id)}
              onOther={(v) => update("notifiedAuthoritiesOther", v)}
            />
            <YesNo
              question="Wurden befristete Maßnahmen ergriffen oder sind sie geplant?"
              value={form.temporaryMeasuresTaken}
              onChange={(v) => update("temporaryMeasuresTaken", v)}
            />
            <Field
              label="Beschreibung der befristeten Maßnahmen"
              htmlFor="temporaryMeasuresDescription"
            >
              <Textarea
                id="temporaryMeasuresDescription"
                rows={4}
                value={form.temporaryMeasuresDescription}
                onChange={(e) =>
                  update("temporaryMeasuresDescription", e.target.value)
                }
              />
            </Field>
            <Field
              label="Kompromittierungsindikatoren"
              htmlFor="indicatorsOfCompromise"
            >
              <Textarea
                id="indicatorsOfCompromise"
                rows={4}
                value={form.indicatorsOfCompromise}
                onChange={(e) =>
                  update("indicatorsOfCompromise", e.target.value)
                }
              />
            </Field>
          </>
        );

      case "causes":
        return (
          <>
            <div className="space-y-2">
              <Label>
                Übergeordnete Einstufung der
                Ursachen
              </Label>
              <div className="flex flex-wrap gap-2">
                {ROOT_CAUSE_CATEGORIES.map((c) => (
                  <TogglePill
                    key={c.id}
                    active={form.rootCauseCategories.includes(c.id)}
                    onClick={() => toggleRootCauseCategory(c.id)}
                  >
                    {c.label}
                  </TogglePill>
                ))}
              </div>
            </div>

            {ROOT_CAUSE_TREE.filter((c) =>
              (form.rootCauseCategories as string[]).includes(c.id),
            ).map((category) => (
              <div
                key={category.id}
                className="space-y-3 rounded-lg border border-border/60 bg-background/60 p-3"
              >
                <Label>
                  Detaillierte Ursachen –{" "}
                  {category.label}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {category.details.map((detail) => {
                    const detailId = rootCauseDetailId(category.id, detail.id);
                    return (
                      <TogglePill
                        key={detailId}
                        active={form.rootCauseDetails.includes(detailId)}
                        onClick={() => toggleRootCauseDetail(detailId)}
                      >
                        {detail.label}
                      </TogglePill>
                    );
                  })}
                </div>
                {category.details
                  .filter(
                    (detail) =>
                      detail.further &&
                      form.rootCauseDetails.includes(
                        rootCauseDetailId(category.id, detail.id),
                      ),
                  )
                  .map((detail) => {
                    const detailId = rootCauseDetailId(category.id, detail.id);
                    return (
                      <div key={detailId} className="space-y-2 pl-3">
                        <Label>
                          Weitergehende
                          Einstufung – {detail.label}
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {(detail.further ?? []).map((f) => {
                            const furtherId = `${detailId}.${f.id}`;
                            return (
                              <TogglePill
                                key={furtherId}
                                active={form.rootCauseFurther.includes(
                                  furtherId,
                                )}
                                onClick={() =>
                                  toggle("rootCauseFurther", furtherId)
                                }
                              >
                                {f.label}
                              </TogglePill>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ))}

            {form.rootCauseDetails.some((id) => id.endsWith(".other")) && (
              <Field
                label="Sonstige Art der Ursache"
                htmlFor="rootCauseOther"
              >
                <Input
                  id="rootCauseOther"
                  value={form.rootCauseOther}
                  onChange={(e) => update("rootCauseOther", e.target.value)}
                />
              </Field>
            )}

            <Field
              label="Angaben zu den Ursachen des Vorfalls"
              htmlFor="rootCauseDescription"
            >
              <Textarea
                id="rootCauseDescription"
                rows={5}
                value={form.rootCauseDescription}
                onChange={(e) => update("rootCauseDescription", e.target.value)}
              />
            </Field>
          </>
        );

      case "resolution":
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Behebung des Vorfalls"
                htmlFor="incidentResolvedAt"
              >
                <Input
                  id="incidentResolvedAt"
                  type="datetime-local"
                  value={form.incidentResolvedAt}
                  onChange={(e) => update("incidentResolvedAt", e.target.value)}
                />
              </Field>
              <Field
                label="Beseitigung der zugrunde liegenden Ursache"
                htmlFor="rootCauseAddressedAt"
              >
                <Input
                  id="rootCauseAddressedAt"
                  type="datetime-local"
                  value={form.rootCauseAddressedAt}
                  onChange={(e) =>
                    update("rootCauseAddressedAt", e.target.value)
                  }
                />
              </Field>
            </div>
            <Field
              label="Angaben dazu, wie dem Vorfall entgegengewirkt wurde"
              htmlFor="counterMeasures"
            >
              <Textarea
                id="counterMeasures"
                rows={5}
                value={form.counterMeasures}
                onChange={(e) => update("counterMeasures", e.target.value)}
              />
            </Field>
          </>
        );

      case "resolutionAuthorities":
        return (
          <>
            <div className="space-y-2">
              <Label>
                Stellt der Vorfall ein Risiko
                für kritische Funktionen dar?
              </Label>
              <div className="flex flex-wrap gap-2">
                {RESOLUTION_RISK_ANSWERS.map((a) => (
                  <TogglePill
                    key={a.id}
                    active={form.resolutionRisk === a.id}
                    onClick={() => update("resolutionRisk", a.id)}
                  >
                    {a.label}
                  </TogglePill>
                ))}
              </div>
            </div>
            <Field
              label="Für die Abwicklungsbehörden relevante Informationen"
              htmlFor="resolutionAuthorityInformation"
            >
              <Textarea
                id="resolutionAuthorityInformation"
                rows={4}
                value={form.resolutionAuthorityInformation}
                onChange={(e) =>
                  update("resolutionAuthorityInformation", e.target.value)
                }
              />
            </Field>
          </>
        );

      case "costs":
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={`Direkte und indirekte Kosten und Verluste (${form.reportingCurrency})`}
                htmlFor="grossCostsAndLosses"
              >
                <Input
                  id="grossCostsAndLosses"
                  type="number"
                  min={0}
                  value={form.grossCostsAndLosses}
                  onChange={(e) => update("grossCostsAndLosses", e.target.value)}
                />
              </Field>
              <Field
                label={`Finanzielle Wiedereinziehungen (${form.reportingCurrency})`}
                htmlFor="financialRecoveries"
              >
                <Input
                  id="financialRecoveries"
                  type="number"
                  min={0}
                  value={form.financialRecoveries}
                  onChange={(e) => update("financialRecoveries", e.target.value)}
                />
              </Field>
            </div>
            <Field
              label="Erläuterung der Kosten und Verluste"
              htmlFor="economicImpactDescription"
            >
              <Textarea
                id="economicImpactDescription"
                rows={4}
                value={form.economicImpactDescription}
                onChange={(e) =>
                  update("economicImpactDescription", e.target.value)
                }
              />
            </Field>
          </>
        );

      case "recurring":
        return (
          <>
            <YesNo
              question="Haben sich nicht schwerwiegende Vorfälle wiederholt und sind zusammen als schwerwiegender Vorfall zu betrachten?"
              value={form.recurringIncidents}
              onChange={(v) => update("recurringIncidents", v)}
            />
            {form.recurringIncidents && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Anzahl der wiederholten Vorfälle"
                  htmlFor="recurringIncidentCount"
                >
                  <Input
                    id="recurringIncidentCount"
                    type="number"
                    min={0}
                    value={form.recurringIncidentCount}
                    onChange={(e) =>
                      update("recurringIncidentCount", e.target.value)
                    }
                  />
                </Field>
                <Field
                  label="Eintreten des ersten Vorfalls"
                  htmlFor="firstRecurringIncidentAt"
                >
                  <Input
                    id="firstRecurringIncidentAt"
                    type="datetime-local"
                    value={form.firstRecurringIncidentAt}
                    onChange={(e) =>
                      update("firstRecurringIncidentAt", e.target.value)
                    }
                  />
                </Field>
              </div>
            )}
          </>
        );

      /* --- Art. 6 ---------------------------------------------------------- */

      case "threatTiming":
        return (
          <>
            <Field
              label="Erkennung der erheblichen Cyberbedrohung"
              htmlFor="detectedAt"
            >
              <Input
                id="detectedAt"
                type="datetime-local"
                value={form.detectedAt}
                onChange={(e) => update("detectedAt", e.target.value)}
              />
            </Field>
            <Field
              label="Sonstige relevante Zeitstempel"
              htmlFor="relevantTimestamps"
            >
              <Textarea
                id="relevantTimestamps"
                rows={3}
                value={form.relevantTimestamps}
                onChange={(e) => update("relevantTimestamps", e.target.value)}
              />
            </Field>
          </>
        );

      case "threatDescription":
        return (
          <>
            <Field
              label="Beschreibung der erheblichen Cyberbedrohung"
              htmlFor="description"
            >
              <Textarea
                id="description"
                rows={6}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </Field>
            <Field
              label="Sonstige zweckdienliche Informationen"
              htmlFor="additionalInformation"
            >
              <Textarea
                id="additionalInformation"
                rows={3}
                value={form.additionalInformation}
                onChange={(e) =>
                  update("additionalInformation", e.target.value)
                }
              />
            </Field>
          </>
        );

      case "threatImpact":
        return (
          <Field
            label="Mögliche Auswirkungen der Cyberbedrohung"
            htmlFor="potentialImpact"
          >
            <Textarea
              id="potentialImpact"
              rows={5}
              value={form.potentialImpact}
              onChange={(e) => update("potentialImpact", e.target.value)}
            />
          </Field>
        );

      case "threatCriteria":
        return (
          <div className="space-y-2">
            <Label>
              Kriterien, die die Meldung
              eines schwerwiegenden Vorfalls ausgelöst hätten
            </Label>
            <div className="flex flex-wrap gap-2">
              {DORA_CRITERIA.map((c) => (
                <TogglePill
                  key={c.id}
                  active={form.classificationCriteria.includes(c.id)}
                  onClick={() => toggle("classificationCriteria", c.id)}
                >
                  {c.label}
                </TogglePill>
              ))}
            </div>
          </div>
        );

      case "threatStatus":
        return (
          <>
            <div className="space-y-2">
              <Label>
                Status der Cyberbedrohung
              </Label>
              <div className="flex flex-wrap gap-2">
                {THREAT_STATUSES.map((s) => (
                  <TogglePill
                    key={s.id}
                    active={form.threatStatus === s.id}
                    onClick={() => update("threatStatus", s.id)}
                  >
                    {s.label}
                  </TogglePill>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                Hat sich die
                Bedrohungsaktivität verändert?
              </Label>
              <div className="flex flex-wrap gap-2">
                {THREAT_ACTIVITY_CHANGES.map((c) => (
                  <TogglePill
                    key={c.id}
                    active={form.threatActivityChange === c.id}
                    onClick={() => update("threatActivityChange", c.id)}
                  >
                    {c.label}
                  </TogglePill>
                ))}
              </div>
            </div>
            <Field
              label="Maßnahmen zur Verhinderung des Eintretens"
              htmlFor="preventiveMeasures"
            >
              <Textarea
                id="preventiveMeasures"
                rows={4}
                value={form.preventiveMeasures}
                onChange={(e) => update("preventiveMeasures", e.target.value)}
              />
            </Field>
          </>
        );

      case "threatNotifications":
        return (
          <>
            <AuthoritiesPicker
              form={form}
              onToggle={(id) => toggle("notifiedAuthorities", id)}
              onOther={(v) => update("notifiedAuthoritiesOther", v)}
            />
            <Field
              label="Benachrichtigte andere Finanzunternehmen"
              htmlFor="notifiedFinancialEntities"
            >
              <Textarea
                id="notifiedFinancialEntities"
                rows={3}
                value={form.notifiedFinancialEntities}
                onChange={(e) =>
                  update("notifiedFinancialEntities", e.target.value)
                }
              />
            </Field>
          </>
        );

      case "threatIndicators":
        return (
          <Field
            label="Kompromittierungsindikatoren"
            htmlFor="indicatorsOfCompromise"
          >
            <Textarea
              id="indicatorsOfCompromise"
              rows={4}
              value={form.indicatorsOfCompromise}
              onChange={(e) => update("indicatorsOfCompromise", e.target.value)}
            />
          </Field>
        );
    }
  }

  /* --- Darstellung -------------------------------------------------------- */

  // undefined: Der Speicher wurde noch nicht gelesen (Hydration).
  if (result === undefined) return null;

  if (!result) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/70 bg-muted/20 p-10 text-center">
          <ClipboardList className="size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Für eine Meldung wird die Einstufung aus Schritt 02 benötigt.
            Bestimmen Sie zunächst den Schweregrad des Vorfalls.
          </p>
          <Link href="/severity" className={cn(buttonVariants({ size: "sm" }))}>
            Zur Schweregradbestimmung
          </Link>
        </div>
      </div>
    );
  }

  const obligation = getReportObligation(result.classification);
  const tone = OBLIGATION_TONE[obligation.level];
  // Ohne Meldepflicht geht die Vorfallmeldung nur als Neueinstufung eines
  // bereits gemeldeten Vorfalls (Art. 2 Buchst. i).
  const blocked =
    kind === "incident" &&
    obligation.level === "none" &&
    !form.reclassifiedAsNonMajor;
  const activeSteps = stepsFor(kind, form.reportType);
  const addressed = activeSteps.filter(
    (s) => stepStatus[s.id] !== "pending",
  ).length;
  const checks = kind === "incident" ? checkReport(toSubmission()) : [];
  const errors = checks.filter((c) => c.severity === "error");

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader step="Schritt 03" title="Meldung an die BaFin" />

      {/* Besteht überhaupt eine Meldepflicht? */}
      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card/70 p-5 backdrop-blur">
        <div className={cn("absolute inset-x-0 top-0 h-1", tone.bar)} />
        <div className="flex items-start gap-4">
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl",
              tone.chip,
            )}
          >
            <tone.icon className="size-5" />
          </span>
          <div className="space-y-1">
            <h2 className="font-semibold">{obligation.label}</h2>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <ol className="space-y-3">
          {activeSteps.map((step, index) => {
            const status = stepStatus[step.id];
            const open = activeStep === step.id;
            const isLast = index === activeSteps.length - 1;
            const ready = step.complete(form);
            return (
              <StepRow
                key={step.id}
                marker={
                  status === "done" ? <Check className="size-5" /> : index + 1
                }
                status={status}
                title={step.title}
                open={open}
                summary={step.summary(form) || "Noch keine Angaben"}
                isLast={isLast}
                onToggle={() => toggleStep(step.id)}
              >
                {stepFields(step.id)}
                <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
                  <Button
                    type="button"
                    size="sm"
                    disabled={!ready}
                    onClick={() => completeStep(step.id)}
                  >
                    {isLast ? "Fertig" : "Weiter"}
                    <ArrowRight className="size-4" />
                  </Button>
                  {!ready && (
                    <span className="text-xs text-muted-foreground">
                      Pflichtangaben dieses Schritts sind noch unvollständig.
                    </span>
                  )}
                </div>
              </StepRow>
            );
          })}
        </ol>

        <div className="space-y-4 rounded-xl border border-border/60 bg-card/70 p-5 backdrop-blur">
          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold">Übermittlung</p>
              <p className="text-xs text-muted-foreground">
                {addressed} von {activeSteps.length} Abschnitten bearbeitet
              </p>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(addressed / activeSteps.length) * 100}%` }}
              />
            </div>
          </div>

          {checks.length > 0 && <CheckList checks={checks} />}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link
              href="/severity/ergebnis"
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              Zurück zur Einstufung
            </Link>
            <Button
              type="submit"
              size="lg"
              disabled={loading || blocked || errors.length > 0}
              className="w-full sm:w-auto sm:min-w-64"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Meldung absenden
            </Button>
          </div>
          {blocked && (
            <p className="text-right text-xs text-muted-foreground">
              Ohne Meldepflicht nur als Neueinstufung.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Bausteine
 * ------------------------------------------------------------------------- */

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/**
 * Fälligkeit der Erstmeldung nach Art. 5. Sie steht neben den beiden
 * Zeitpunkten, aus denen sie sich errechnet, und verlangt bei Überschreitung
 * die Gründe für die Verzögerung (Art. 5 Abs. 3).
 */
function DeadlineNote({ form }: { form: ReportForm }) {
  if (form.reportType !== "initial" || !form.detectedAt || !form.classifiedAt) {
    return null;
  }
  const detectedAt = new Date(form.detectedAt);
  const classifiedAt = new Date(form.classifiedAt);
  if (Number.isNaN(detectedAt.getTime()) || Number.isNaN(classifiedAt.getTime())) {
    return null;
  }
  const deadline = initialReportDeadline(detectedAt, classifiedAt);
  return (
    <p className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">
        Fällig bis {formatDateTime(deadline.dueAt)}
      </span>{" "}
      – {deadline.basis}
    </p>
  );
}

/** Behörden nach Art. 3 Buchst. j bzw. Art. 6 Buchst. h. */
function AuthoritiesPicker({
  form,
  onToggle,
  onOther,
}: {
  form: ReportForm;
  onToggle: (id: ReportForm["notifiedAuthorities"][number]) => void;
  onOther: (value: string) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label>
          Welche Behörden wurden informiert?
        </Label>
        <div className="flex flex-wrap gap-2">
          {NOTIFIED_AUTHORITIES.map((a) => (
            <TogglePill
              key={a.id}
              active={form.notifiedAuthorities.includes(a.id)}
              onClick={() => onToggle(a.id)}
            >
              {a.label}
            </TogglePill>
          ))}
        </div>
      </div>
      {form.notifiedAuthorities.includes("other") && (
        <Field
          label="Welche weitere Behörde?"
          htmlFor="notifiedAuthoritiesOther"
        >
          <Input
            id="notifiedAuthoritiesOther"
            value={form.notifiedAuthoritiesOther}
            onChange={(e) => onOther(e.target.value)}
          />
        </Field>
      )}
    </>
  );
}

function TogglePill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-left text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border/60 bg-background hover:border-primary/40 hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function YesNo({
  question,
  value,
  onChange,
}: {
  question: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        {question}
      </p>
      <div className="flex gap-2 sm:max-w-sm">
        <ChoiceButton selected={value} onClick={() => onChange(true)}>
          Ja
        </ChoiceButton>
        <ChoiceButton selected={!value} onClick={() => onChange(false)}>
          Nein
        </ChoiceButton>
      </div>
    </div>
  );
}

function ChoiceButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
        selected
          ? "border-primary bg-primary/10 text-primary"
          : "border-border/60 bg-background hover:border-primary/40 hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Befunde der Plausibilitätsprüfung. Widersprüche verhindern die Übermittlung,
 * Hinweise nicht – beides steht unmittelbar über dem Absendeknopf, damit vor
 * dem Absenden erkennbar ist, was die Aufsicht beanstanden würde.
 */
function CheckList({ checks }: { checks: ReportCheck[] }) {
  const errors = checks.filter((c) => c.severity === "error");
  const warnings = checks.filter((c) => c.severity === "warning");
  return (
    <div className="space-y-2 border-t border-border/60 pt-4">
      <p className="text-xs font-medium">
        Prüfung der Angaben:{" "}
        {errors.length === 0
          ? "keine Widersprüche"
          : `${errors.length} Widerspruch${errors.length === 1 ? "" : "e"}`}
        {warnings.length > 0 &&
          `, ${warnings.length} Hinweis${warnings.length === 1 ? "" : "e"}`}
      </p>
      <ul className="space-y-2">
        {[...errors, ...warnings].map((check) => (
          <li
            key={check.id}
            className={cn(
              "flex items-start gap-2 rounded-lg border p-3 text-xs",
              check.severity === "error"
                ? "border-destructive/40 bg-destructive/5"
                : "border-warning/40 bg-warning/10",
            )}
          >
            {check.severity === "error" ? (
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
            ) : (
              <Info className="mt-0.5 size-3.5 shrink-0 text-warning" />
            )}
            <span className="text-muted-foreground">{check.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Erscheint nur, wenn die erfassten Angaben vom Profil abweichen – etwa nach
 * einer Änderung in den Einstellungen oder einer versehentlichen Überschreibung.
 */
function ProfileApplyButton({
  icon: Icon,
  onClick,
}: {
  icon: typeof Building2;
  onClick: () => void;
}) {
  return (
    <Button type="button" size="sm" variant="ghost" onClick={onClick}>
      <Icon className="size-4" />
      Aus Unternehmensprofil übernehmen
    </Button>
  );
}
