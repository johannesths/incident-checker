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
  Clock,
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
import { PageHeader } from "@/components/page-header";
import { StepRow, type StepStatus } from "@/components/step-row";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CRITERION_BY_ID,
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
  coversSection,
  getReportObligation,
  isFollowUp,
  type ObligationLevel,
} from "@/lib/dora/reporting";
import {
  DETECTION_SOURCES,
  DURATION_BASES,
  FIGURE_BASES,
  FUNCTIONAL_AREAS,
  IMPACT_TYPES,
  INCIDENT_TYPES,
  INFRASTRUCTURE_ANSWERS,
  MEMBER_STATES,
  NOTIFIED_AUTHORITIES,
  RESOLUTION_RISK_ANSWERS,
  REPORT_SECTIONS,
  ROOT_CAUSE_CATEGORIES,
  ROOT_CAUSE_TREE,
  THREAT_TECHNIQUES,
  rootCauseDetailId,
  type ReportSection,
} from "@/lib/dora/report-fields";
import { checkReport, type ReportCheck } from "@/lib/dora/report-checks";
import {
  STORAGE_KEYS,
  saveSession,
  updateSession,
  useSessionValue,
} from "@/lib/session-store";
import { ENTITY_TYPES, type CompanyProfile } from "@/lib/company/profile";
import { useCompanyProfile } from "@/lib/company/store";
import type { ReportInput, ReportReceipt, SeverityResult } from "@/lib/schemas";

/**
 * Die im Formular erfassten Angaben entsprechen eins zu eins den Feldern des
 * amtlichen Meldeformulars (siehe reportInputSchema und @/lib/dora/report-fields).
 * Nur die Einstufung aus Schritt 02 und die zuständige Behörde kommen von
 * außerhalb des Formulars und werden beim Absenden ergänzt.
 */
type ReportForm = {
  [K in keyof Omit<
    ReportInput,
    "classification" | "competentAuthority"
  >]-?: Exclude<ReportInput[K], undefined>;
};

const emptyForm: ReportForm = {
  // 1 Allgemeine Informationen
  reportType: "initial",
  submittingEntityName: "",
  submittingEntityCode: "",
  entityType: ENTITY_TYPES[0].id,
  nationalScopeOnly: false,
  affectedEntityNames: "",
  affectedEntityLeis: "",
  primaryContactName: "",
  primaryContactEmail: "",
  primaryContactPhone: "",
  secondContactName: "",
  secondContactEmail: "",
  secondContactPhone: "",
  ultimateParentName: "",
  ultimateParentLei: "",
  reportingCurrency: "EUR",
  // 2 Erstmeldung
  incidentReference: "",
  detectedAt: "",
  classifiedAt: "",
  description: "",
  classificationCriteria: [],
  affectedMemberStates: [],
  detectionSource: null,
  originatesFromThirdParty: false,
  thirdPartyDetails: "",
  businessContinuityActivated: false,
  additionalInformation: "",
  // 3 Zwischenmeldung
  bafinIncidentId: "",
  occurredAt: "",
  servicesRestoredAt: "",
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
  // 4 Abschlussmeldung
  rootCauseCategories: [],
  rootCauseDetails: [],
  rootCauseFurther: [],
  rootCauseOther: "",
  rootCauseDescription: "",
  resolutionSummary: "",
  rootCauseAddressedAt: "",
  incidentResolvedAt: "",
  resolutionDelayReason: "",
  resolutionRisk: null,
  resolutionAuthorityInformation: "",
  economicImpactDescription: "",
  grossCostsAndLosses: "",
  financialRecoveries: "",
  recurringIncidents: false,
  recurringIncidentCount: "",
  firstRecurringIncidentAt: "",
  voluntary: false,
};

const MIN_DESCRIPTION_LENGTH = 10;
const LEI_PATTERN = /^[A-Z0-9]{20}$/;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

/** Feld 1.6: ein oder mehrere LEI, durch Semikolon getrennt. */
function leiListValid(value: string): boolean {
  const parts = value
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 0 && parts.every((p) => LEI_PATTERN.test(p));
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
 * Schritte – ein Schritt je Feldgruppe des Meldeformulars
 * ------------------------------------------------------------------------- */

type StepId =
  | "type"
  | "entity"
  | "contacts"
  | "identification"
  | "facts"
  | "criteria"
  | "origin"
  | "timeline"
  | "figures"
  | "reputation"
  | "geography"
  | "dataLoss"
  | "nature"
  | "affected"
  | "measures"
  | "rootCause"
  | "resolution"
  | "resolutionRisk"
  | "economic"
  | "recurring";

interface StepDef {
  id: StepId;
  /** Abschnitt des Meldeformulars; bestimmt, bei welchem Meldungstyp der Schritt erscheint. */
  section: ReportSection;
  title: string;
  /** Feldnummern des Meldeformulars, die dieser Schritt abdeckt. */
  fields: string;
  hint?: string;
  /** Kurzfassung der Angaben für die eingeklappte Ansicht. */
  summary: (f: ReportForm) => string;
  /**
   * Sind die Pflichtangaben dieses Schritts vollständig? Optionale Schritte
   * melden stets `true` – ohne sie nimmt die Aufsicht die Meldung an.
   */
  complete: (f: ReportForm) => boolean;
}

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "short",
  timeStyle: "short",
});

const nf = new Intl.NumberFormat("de-DE");

function formatDateTime(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormat.format(date);
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

/** Feld 3.15/3.16: Der ITS erwartet die Angabe in Tagen, Stunden und Minuten. */
function asDaysHoursMinutes(value: string): string | null {
  const hours = Number(value);
  if (value.trim() === "" || !Number.isFinite(hours) || hours < 0) return null;
  const totalMinutes = Math.round(hours * 60);
  const days = Math.floor(totalMinutes / (24 * 60));
  const remainingHours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  return `${days} Tage, ${remainingHours} Stunden, ${minutes} Minuten`;
}

const STEPS: StepDef[] = [
  {
    id: "type",
    section: 1,
    title: "Meldungstyp",
    fields: "1.1, 3.1",
    hint: "Erst-, Zwischen- oder Abschlussmeldung – oder die Rückstufung eines bereits gemeldeten Vorfalls. Jede Folgemeldung verweist auf die Vorgangsnummer, die die Behörde mit der Erstmeldung vergeben hat.",
    summary: (f) =>
      join([
        REPORT_TYPE_BY_ID[f.reportType].label,
        isFollowUp(f.reportType) &&
          f.bafinIncidentId &&
          `Incident ID ${f.bafinIncidentId}`,
      ]),
    complete: (f) =>
      !isFollowUp(f.reportType) || f.bafinIncidentId.trim().length > 0,
  },
  {
    id: "entity",
    section: 1,
    title: "Einreichendes und betroffenes Unternehmen",
    fields: "1.2–1.6, 1.13–1.15",
    hint: "Das einreichende Unternehmen ist nicht zwingend das betroffene: Meldet ein Drittdienstleister oder eine andere Konzerneinheit, weichen die Angaben voneinander ab. Aus dem Unternehmensprofil vorbelegt und hier änderbar.",
    summary: (f) =>
      join([f.affectedEntityNames, f.affectedEntityLeis, f.reportingCurrency]),
    complete: (f) =>
      f.submittingEntityName.trim().length > 0 &&
      LEI_PATTERN.test(f.submittingEntityCode) &&
      f.affectedEntityNames.trim().length > 0 &&
      leiListValid(f.affectedEntityLeis) &&
      CURRENCY_PATTERN.test(f.reportingCurrency) &&
      (f.ultimateParentLei === "" || LEI_PATTERN.test(f.ultimateParentLei)),
  },
  {
    id: "contacts",
    section: 1,
    title: "Ansprechpartner",
    fields: "1.7–1.12",
    hint: "Kontakte für Rückfragen der Behörde. Die Telefonnummer ist mit internationaler Vorwahl anzugeben (z. B. +49 69 12345678). Als zweiter Kontakt ist auch ein Team zulässig.",
    summary: (f) =>
      join([f.primaryContactName, f.primaryContactEmail, f.secondContactName]),
    complete: (f) =>
      f.primaryContactName.trim().length > 0 &&
      EMAIL_PATTERN.test(f.primaryContactEmail) &&
      f.primaryContactPhone.trim().length > 0 &&
      (f.secondContactEmail === "" || EMAIL_PATTERN.test(f.secondContactEmail)),
  },
  {
    id: "identification",
    section: 2,
    title: "Referenzcode und Zeitpunkte",
    fields: "2.1–2.3",
    hint: "Der Referenzcode ist in allen Meldungen zu diesem Vorfall identisch – ohne Präfixe oder Suffixe. Zeitangaben erfolgen in koordinierter Weltzeit (UTC). Die Entdeckung ist Ausgangspunkt der 24-Stunden-Frist, die Einstufung der 4-Stunden-Frist.",
    summary: (f) =>
      join([
        f.incidentReference,
        f.detectedAt && `entdeckt ${formatDateTime(f.detectedAt)}`,
        f.classifiedAt && `eingestuft ${formatDateTime(f.classifiedAt)}`,
      ]),
    complete: (f) =>
      f.incidentReference.trim().length > 0 &&
      f.detectedAt.length > 0 &&
      f.classifiedAt.length > 0,
  },
  {
    id: "facts",
    section: 2,
    title: "Beschreibung des Vorfalls",
    fields: "2.4, 2.10",
    hint: "Aus Schritt 02 vorbelegt und hier zu ergänzen. Bei Folgemeldungen wird der Text fortgeschrieben – bestehende Ausführungen bleiben stehen, Ergänzungen werden mit einem Aktualisierungshinweis angefügt.",
    summary: (f) => f.description.trim(),
    complete: (f) => f.description.trim().length >= MIN_DESCRIPTION_LENGTH,
  },
  {
    id: "criteria",
    section: 2,
    title: "Klassifikationskriterien und Mitgliedstaaten",
    fields: "2.5, 2.6",
    hint: "Aus der Einstufung in Schritt 02 übernommen. Die Auswahl muss zu den Schwellenwertangaben in den übrigen Feldern passen.",
    summary: (f) =>
      join([
        labelsOf(DORA_CRITERIA, f.classificationCriteria).join(", "),
        f.affectedMemberStates.length > 0 &&
          f.affectedMemberStates.join(", "),
      ]),
    complete: (f) =>
      f.reportType === "reclassification" || f.classificationCriteria.length > 0,
  },
  {
    id: "origin",
    section: 2,
    title: "Entdeckung, Ursprung und Notfallplan",
    fields: "2.7–2.9",
    summary: (f) =>
      join([
        f.detectionSource &&
          `entdeckt durch ${
            DETECTION_SOURCES.find((s) => s.id === f.detectionSource)?.label
          }`,
        f.originatesFromThirdParty && "Ursprung bei einem Dritten",
        f.businessContinuityActivated && "Geschäftsfortführungsplan aktiviert",
      ]),
    complete: (f) => f.detectionSource !== null,
  },
  {
    id: "timeline",
    section: 3,
    title: "Eintritt, Wiederherstellung, Dauer und Ausfallzeit",
    fields: "3.2, 3.3, 3.15–3.17",
    hint: "Die Dauer misst den Zeitraum zwischen Eintritt (3.2) und Behebung (4.8). Die Ausfallzeit meint dagegen den Zeitraum, in dem der Dienst nicht oder nur eingeschränkt verfügbar war – einschließlich verzögert erbrachter Leistungen.",
    summary: (f) =>
      join([
        f.occurredAt && `eingetreten ${formatDateTime(f.occurredAt)}`,
        f.durationHours && `Dauer ${num(f.durationHours)} h`,
        f.downtimeHours && `Ausfallzeit ${num(f.downtimeHours)} h`,
      ]),
    complete: (f) => f.durationBasis !== null,
  },
  {
    id: "figures",
    section: 3,
    title: "Betroffene Kunden, Gegenparteien und Transaktionen",
    fields: "3.4–3.12",
    hint: "Erfasst wird, wer den betroffenen Dienst nicht oder nur eingeschränkt nutzen konnte – nicht die Gesamtheit aller Kunden. Lässt sich die konkrete Zahl noch nicht bestimmen, sind Schätzungen auf Basis vergleichbarer Zeiträume anzugeben.",
    summary: (f) =>
      join([
        f.clientsAffected && `${num(f.clientsAffected)} Kunden`,
        f.counterpartsAffected &&
          `${num(f.counterpartsAffected)} Gegenparteien`,
        f.transactionsAffected &&
          `${num(f.transactionsAffected)} Transaktionen`,
        f.figuresBasis &&
          FIGURE_BASES.find((b) => b.id === f.figuresBasis)?.label,
      ]),
    complete: (f) => f.figuresBasis !== null,
  },
  {
    id: "reputation",
    section: 3,
    title: "Reputationsschaden",
    fields: "3.13, 3.14",
    hint: "Medienberichterstattung meint traditionelle und digitale Medien mit ihrer Reichweite – nicht vereinzelte Kommentare in sozialen Netzwerken.",
    summary: (f) =>
      labelsOf(REPUTATION_CONDITIONS, f.reputationalImpactConditions).join(", "),
    complete: () => true,
  },
  {
    id: "geography",
    section: 3,
    title: "Auswirkungen in den Mitgliedstaaten",
    fields: "3.18, 3.19",
    summary: (f) =>
      labelsOf(IMPACT_TYPES, f.memberStateImpactTypes).join(", "),
    complete: () => true,
  },
  {
    id: "dataLoss",
    section: 3,
    title: "Datenverluste und betroffene kritische Dienste",
    fields: "3.20–3.22",
    summary: (f) =>
      join([
        labelsOf(DATA_LOSS_DIMENSIONS, f.dataLossDimensions).join(", "),
        f.criticalServicesDescription.trim(),
      ]),
    complete: () => true,
  },
  {
    id: "nature",
    section: 3,
    title: "Art des Vorfalls und Vorgehen des Angreifers",
    fields: "3.23–3.26",
    hint: "Bei einem Angriff – auch auf einen Dienstleister – ist stets „Cybersicherheitsbezogen“ zu wählen, bei einem Vorfall beim Dritten zusätzlich „Externes Ereignis“, bei Zahlungsvorfällen „Zahlungsbezogen“.",
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
    section: 3,
    title: "Funktionsbereiche, Prozesse und Infrastruktur",
    fields: "3.27–3.30",
    hint: "Funktionsbereiche, Geschäftsprozesse und Infrastrukturkomponenten sind in Klarschrift zu benennen; Kennziffern aus Prozessplänen genügen nicht.",
    summary: (f) =>
      join([
        labelsOf(FUNCTIONAL_AREAS, f.functionalAreas).join(", "),
        f.infrastructureAffected &&
          `Infrastruktur: ${
            INFRASTRUCTURE_ANSWERS.find((a) => a.id === f.infrastructureAffected)
              ?.label
          }`,
      ]),
    complete: (f) => f.infrastructureAffected !== null,
  },
  {
    id: "measures",
    section: 3,
    title: "Behörden, Sofortmaßnahmen und Indikatoren",
    fields: "3.31–3.35",
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
  {
    id: "rootCause",
    section: 4,
    title: "Ursachen des Vorfalls",
    fields: "4.1–4.5",
    hint: "Die Ursachenanalyse ist wesentlicher Bestandteil der Abschlussmeldung; der Hinweis auf fehlende Erkenntnisse genügt nicht. Zu einzelnen Detailursachen ist die weitergehende Einstufung Pflicht.",
    summary: (f) =>
      labelsOf(ROOT_CAUSE_CATEGORIES, f.rootCauseCategories).join(", "),
    complete: (f) =>
      f.rootCauseCategories.length > 0 &&
      f.rootCauseDetails.length > 0 &&
      f.rootCauseDescription.trim().length > 0,
  },
  {
    id: "resolution",
    section: 4,
    title: "Behebung des Vorfalls",
    fields: "4.6–4.9",
    hint: "Anzugeben sind die dauerhaften Maßnahmen (nicht die befristeten aus Feld 3.34), die Beteiligung von Drittdienstleistern, angepasste Verfahren und zusätzliche Kontrollen sowie die Erkenntnisse aus der Nachbetrachtung.",
    summary: (f) =>
      join([
        f.incidentResolvedAt && `behoben ${formatDateTime(f.incidentResolvedAt)}`,
        f.resolutionSummary.trim(),
      ]),
    complete: (f) =>
      f.resolutionSummary.trim().length > 0 &&
      f.rootCauseAddressedAt.length > 0 &&
      f.incidentResolvedAt.length > 0,
  },
  {
    id: "resolutionRisk",
    section: 4,
    title: "Angaben für die Abwicklungsbehörden",
    fields: "4.10, 4.11",
    hint: "Betrifft Unternehmen im Anwendungsbereich der Richtlinie 2014/59/EU: Gefährdet der Vorfall kritische Funktionen im Sinne des Art. 2 Abs. 1 Nr. 35, und wie wirkt er sich auf die Abwicklungsfähigkeit aus?",
    summary: (f) =>
      f.resolutionRisk
        ? `Risiko für kritische Funktionen: ${
            RESOLUTION_RISK_ANSWERS.find((a) => a.id === f.resolutionRisk)
              ?.label
          }`
        : "",
    complete: (f) => f.resolutionRisk !== null,
  },
  {
    id: "economic",
    section: 4,
    title: "Wirtschaftliche Auswirkungen",
    fields: "4.12–4.14",
    hint: "Brutto und ohne Verrechnung von Rückflüssen; einzubeziehen sind auch kalkulatorische Personalkosten für die Bearbeitung des Vorfalls. Rückflüsse werden gesondert in Feld 4.14 ausgewiesen.",
    summary: (f) =>
      f.grossCostsAndLosses
        ? `${num(f.grossCostsAndLosses)} ${f.reportingCurrency}`
        : "",
    complete: (f) => f.grossCostsAndLosses.trim().length > 0,
  },
  {
    id: "recurring",
    section: 4,
    title: "Wiederholte Vorfälle",
    fields: "4.15, 4.16",
    hint: "Nur auszufüllen, wenn sich nicht schwerwiegende Vorfälle wiederholt haben und zusammen als schwerwiegender Vorfall gelten (Art. 8 Abs. 2 RTS).",
    summary: (f) =>
      f.recurringIncidents
        ? join([
            "wiederholte Vorfälle",
            f.recurringIncidentCount && `${num(f.recurringIncidentCount)}×`,
          ])
        : "",
    complete: (f) => !f.recurringIncidents || f.firstRecurringIncidentAt !== "",
  },
];

const STEP_IDS = new Set<string>(STEPS.map((s) => s.id));

const initialStatus = Object.fromEntries(
  STEPS.map((s) => [s.id, "pending" as StepStatus]),
) as Record<StepId, StepStatus>;

/** Schritte, die dieser Meldungstyp umfasst (Abschnitte 1–4 des Formulars). */
function stepsFor(reportType: ReportForm["reportType"]): StepDef[] {
  return STEPS.filter((s) => coversSection(reportType, s.section));
}

function nextStepId(
  reportType: ReportForm["reportType"],
  id: StepId,
): StepId | null {
  const steps = stepsFor(reportType);
  const index = steps.findIndex((s) => s.id === id);
  return steps[index + 1]?.id ?? null;
}

interface ReportDraft {
  form: ReportForm;
  stepStatus: Record<StepId, StepStatus>;
  /** Aktuell aufgeklappter Schritt; null = alle eingeklappt. */
  activeStep: StepId | null;
}

/* ---------------------------------------------------------------------------
 * Vorbelegung aus Unternehmensprofil und Schritt 02
 * ------------------------------------------------------------------------- */

/**
 * Stammdaten, die bei jeder Meldung gleich sind. Sie bleiben im Formular
 * änderbar – die Meldung kann etwa von einer anderen Vertretung oder von einem
 * Drittdienstleister abgegeben werden als der im Profil hinterlegten.
 */
function formFromProfile(
  profile: CompanyProfile | undefined,
): Partial<ReportForm> {
  if (!profile) return {};
  return {
    submittingEntityName: profile.name,
    submittingEntityCode: profile.lei,
    entityType: profile.entityType,
    affectedEntityNames: profile.name,
    affectedEntityLeis: profile.lei,
    primaryContactName: profile.contactName,
    primaryContactEmail: profile.contactEmail,
    primaryContactPhone: profile.contactPhone,
    secondContactName: profile.secondContactName,
    secondContactEmail: profile.secondContactEmail,
    secondContactPhone: profile.secondContactPhone,
    ultimateParentName: profile.ultimateParentName,
    ultimateParentLei: profile.ultimateParentLei,
    reportingCurrency: profile.reportingCurrency,
    incidentReference: profile.incidentReferencePrefix,
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
    memberStatesAffected?: string;
    geoImpactAreas?: GeoImpactArea[];
    dataLossDimensions?: DataLossDimension[];
    reputationalImpactConditions?: ReputationCondition[];
    economicImpactEur?: string;
    criticalFunctionAffected?: boolean;
    regulatedServicesAffected?: boolean;
    maliciousUnauthorizedAccess?: boolean;
  };
}

/**
 * Die drei Bereiche des Kriteriums "Geografische Ausbreitung" aus Schritt 02
 * (Art. 4 Buchst. a–c RTS) entsprechen den sechs Auswirkungsarten des
 * Feldes 3.18.
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
 * Angaben, die in Schritt 02 bereits erhoben wurden. Sie sind dieselben
 * Sachverhalte, nur in der Sprache des Meldeformulars – sie hier erneut
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
): ReportDraft {
  return {
    form: { ...emptyForm, ...formFromProfile(profile), ...prefill },
    stepStatus: initialStatus,
    activeStep: "type",
  };
}

/**
 * Ergänzt einen gespeicherten Stand um fehlende Felder. Stände aus früheren
 * Fassungen dieser Seite werden übernommen, statt die Seite scheitern zu
 * lassen; unbekannte Schrittkennungen fallen auf den ersten Schritt zurück.
 */
function withDefaults(
  stored: Partial<ReportDraft> | null | undefined,
  prefill: Partial<ReportForm>,
  profile: CompanyProfile | undefined,
): ReportDraft {
  const base = initialDraft(prefill, profile);
  if (!stored) return base;
  const activeStep =
    stored.activeStep === null
      ? null
      : stored.activeStep && STEP_IDS.has(stored.activeStep)
        ? stored.activeStep
        : base.activeStep;
  return {
    form: { ...base.form, ...stored.form },
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
  const stored = useSessionValue<Partial<ReportDraft>>(
    STORAGE_KEYS.reportDraft,
  );
  const draft = withDefaults(stored, prefill, profile);
  const { form, stepStatus, activeStep } = draft;

  function patch(fn: (d: ReportDraft) => ReportDraft) {
    updateSession<Partial<ReportDraft>>(STORAGE_KEYS.reportDraft, (current) =>
      fn(withDefaults(current, prefill, profile)),
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
      activeStep: nextStepId(d.form.reportType, id),
    }));
  }

  /**
   * Die Ursachenkategorien hängen voneinander ab: Wird eine übergeordnete
   * Kategorie (4.1) abgewählt, entfallen ihre Detail- (4.2) und weitergehenden
   * Ursachen (4.3); dasselbe gilt eine Ebene tiefer.
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
          rootCauseCategories:
            categories as ReportForm["rootCauseCategories"],
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
  function toInput(): ReportInput {
    return {
      ...form,
      classification: result?.classification ?? "indeterminate",
      competentAuthority: profile?.competentAuthority ?? "",
    };
  }

  async function onSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!result) return;
    const incomplete = stepsFor(form.reportType).find((s) => !s.complete(form));
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
        body: JSON.stringify(toInput()),
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
    switch (id) {
      case "type":
        return (
          <>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {REPORT_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  title={t.description}
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
            <p className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Frist: </span>
              {REPORT_TYPE_BY_ID[form.reportType].deadline} (
              {REPORT_TYPE_BY_ID[form.reportType].article}). Dieser Meldungstyp
              umfasst{" "}
              {REPORT_TYPE_BY_ID[form.reportType].sections
                .map((s) => `Abschnitt ${s} (${REPORT_SECTIONS[s].title})`)
                .join(", ")}
              .
            </p>
            {isFollowUp(form.reportType) && (
              <Field
                number="3.1"
                label="Von der Behörde vergebene Vorgangsnummer (Incident ID)"
                htmlFor="bafinIncidentId"
                hint="Nicht die interne Referenz aus Feld 2.1, sondern die Nummer aus der Eingangsbestätigung der Erstmeldung."
              >
                <Input
                  id="bafinIncidentId"
                  placeholder="z. B. MLD-20260810-ABC123"
                  value={form.bafinIncidentId}
                  onChange={(e) => update("bafinIncidentId", e.target.value)}
                />
              </Field>
            )}
          </>
        );

      case "entity":
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                number="1.2"
                label="Name des einreichenden Unternehmens"
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
                number="1.3"
                label="Identifizierungscode des einreichenden Unternehmens"
                htmlFor="submittingEntityCode"
              >
                <Input
                  id="submittingEntityCode"
                  maxLength={20}
                  placeholder="LEI, 20 Zeichen"
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
                number="1.5"
                label="Name(n) des / der betroffenen Finanzunternehmen"
                htmlFor="affectedEntityNames"
                hint="Mehrere Unternehmen durch Semikolon trennen (aggregierte Meldung nach Art. 7 ITS)."
              >
                <Input
                  id="affectedEntityNames"
                  value={form.affectedEntityNames}
                  onChange={(e) =>
                    update("affectedEntityNames", e.target.value)
                  }
                />
              </Field>
              <Field
                number="1.6"
                label="LEI-Nummer(n) des / der betroffenen Finanzunternehmen"
                htmlFor="affectedEntityLeis"
                hint="Reihenfolge identisch zu Feld 1.5."
              >
                <Input
                  id="affectedEntityLeis"
                  placeholder="z. B. 529900MUSTERBANK0001"
                  value={form.affectedEntityLeis}
                  onChange={(e) =>
                    update(
                      "affectedEntityLeis",
                      e.target.value.toUpperCase(),
                    )
                  }
                />
              </Field>
            </div>

            {profile &&
              (form.submittingEntityName !== profile.name ||
                form.affectedEntityNames !== profile.name ||
                form.submittingEntityCode !== profile.lei ||
                form.affectedEntityLeis !== profile.lei) && (
                <ProfileApplyButton
                  icon={Building2}
                  onClick={() =>
                    applyProfileFields({
                      submittingEntityName: profile.name,
                      submittingEntityCode: profile.lei,
                      affectedEntityNames: profile.name,
                      affectedEntityLeis: profile.lei,
                    })
                  }
                />
              )}

            <div className="space-y-2">
              <Label>
                <FieldNumber value="1.4" /> Art des / der betroffenen
                Unternehmen(s)
              </Label>
              <div className="flex flex-wrap gap-2">
                {ENTITY_TYPES.map((type) => (
                  <TogglePill
                    key={type.id}
                    active={form.entityType === type.id}
                    onClick={() => update("entityType", type.id)}
                  >
                    {type.label}
                  </TogglePill>
                ))}
              </div>
              <TogglePill
                active={form.nationalScopeOnly}
                title="Etwa Versicherungsholdings, Bürgschaftsbanken, Drittstaatenzweigstellen, Leasing- und Factoring-Unternehmen."
                onClick={() =>
                  update("nationalScopeOnly", !form.nationalScopeOnly)
                }
              >
                1.4 b) Nur über den national erweiterten Anwendungsbereich
                meldepflichtig
              </TogglePill>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                number="1.13"
                label="Name des obersten Mutterunternehmens"
                htmlFor="ultimateParentName"
              >
                <Input
                  id="ultimateParentName"
                  value={form.ultimateParentName}
                  onChange={(e) => update("ultimateParentName", e.target.value)}
                />
              </Field>
              <Field
                number="1.14"
                label="LEI des obersten Mutterunternehmens"
                htmlFor="ultimateParentLei"
              >
                <Input
                  id="ultimateParentLei"
                  maxLength={20}
                  value={form.ultimateParentLei}
                  onChange={(e) =>
                    update(
                      "ultimateParentLei",
                      e.target.value.toUpperCase().trim(),
                    )
                  }
                />
              </Field>
              <Field
                number="1.15"
                label="Berichtswährung"
                htmlFor="reportingCurrency"
                hint="ISO 4217; EUR ist voreingestellt, Abweichungen sind in Feld 2.10 zu begründen."
              >
                <Input
                  id="reportingCurrency"
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
                number="1.7"
                label="Name des Hauptansprechpartners"
                htmlFor="primaryContactName"
              >
                <Input
                  id="primaryContactName"
                  value={form.primaryContactName}
                  onChange={(e) => update("primaryContactName", e.target.value)}
                />
              </Field>
              <Field
                number="1.8"
                label="E-Mail-Adresse"
                htmlFor="primaryContactEmail"
              >
                <Input
                  id="primaryContactEmail"
                  type="email"
                  value={form.primaryContactEmail}
                  onChange={(e) =>
                    update("primaryContactEmail", e.target.value)
                  }
                />
              </Field>
              <Field
                number="1.9"
                label="Telefonnummer"
                htmlFor="primaryContactPhone"
                hint="Mit internationaler Vorwahl."
              >
                <Input
                  id="primaryContactPhone"
                  type="tel"
                  placeholder="+49 69 12345678"
                  value={form.primaryContactPhone}
                  onChange={(e) =>
                    update("primaryContactPhone", e.target.value)
                  }
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                number="1.10"
                label="Name der zweiten Kontaktperson oder des Teams"
                htmlFor="secondContactName"
              >
                <Input
                  id="secondContactName"
                  value={form.secondContactName}
                  onChange={(e) => update("secondContactName", e.target.value)}
                />
              </Field>
              <Field
                number="1.11"
                label="E-Mail-Adresse"
                htmlFor="secondContactEmail"
              >
                <Input
                  id="secondContactEmail"
                  type="email"
                  value={form.secondContactEmail}
                  onChange={(e) => update("secondContactEmail", e.target.value)}
                />
              </Field>
              <Field
                number="1.12"
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
            {profile?.contactRole && (
              <p className="text-xs text-muted-foreground">
                Funktion laut Unternehmensprofil: {profile.contactRole}.
              </p>
            )}
          </>
        );

      case "identification":
        return (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              number="2.1"
              label="Referenzcode des Vorfalls"
              htmlFor="incidentReference"
            >
              <Input
                id="incidentReference"
                placeholder="z. B. INC-2026-0042"
                value={form.incidentReference}
                onChange={(e) => update("incidentReference", e.target.value)}
              />
            </Field>
            <Field
              number="2.2"
              label="Entdeckung des Vorfalls (UTC)"
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
              number="2.3"
              label="Einstufung als schwerwiegend (UTC)"
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
        );

      case "facts":
        return (
          <>
            <Field
              number="2.4"
              label="Beschreibung des Vorfalls"
              htmlFor="description"
              hint="Allgemeine Beschreibung, ob der Vorfall noch andauert, ob eine böswillige Handlung vermutet wird, die interne Einschätzung des Schweregrads, die betroffenen Dienste in Klarschrift samt voraussichtlicher Dauer und ob andere Finanzunternehmen betroffen sein können."
            >
              <Textarea
                id="description"
                rows={7}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </Field>
            <Field
              number="2.10"
              label="Weitere Informationen"
              htmlFor="additionalInformation"
              hint="Alles, was kein anderes Feld aufnimmt: Gründe für eine verspätete Meldung, für die Aktivierung des Geschäftsfortführungsplans, für eine abweichende Berichtswährung oder für eine Rückstufung."
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
                <FieldNumber value="2.5" /> Klassifikationskriterien, die die
                Meldung ausgelöst haben
              </Label>
              <div className="flex flex-wrap gap-2">
                {DORA_CRITERIA.map((c) => (
                  <TogglePill
                    key={c.id}
                    active={form.classificationCriteria.includes(c.id)}
                    title={c.description}
                    onClick={() => toggle("classificationCriteria", c.id)}
                  >
                    {c.label}
                  </TogglePill>
                ))}
              </div>
              {result && (
                <p className="text-xs text-muted-foreground">
                  Vorbelegt aus Schritt 02:{" "}
                  {result.findings.filter((f) => f.thresholdMet).length === 0
                    ? "kein Kriterium mit erreichter Schwelle."
                    : result.findings
                        .filter((f) => f.thresholdMet)
                        .map((f) => CRITERION_BY_ID[f.criterionId].label)
                        .join(", ") + "."}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>
                <FieldNumber value="2.6" /> Betroffene EWR-Mitgliedstaaten
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
              <p className="text-xs text-muted-foreground">
                Deutschland zählt selbst als betroffener Mitgliedstaat. Ab zwei
                Mitgliedstaaten ist zusätzlich das Kriterium „Geografische
                Ausbreitung“ zu wählen.
              </p>
            </div>
          </>
        );

      case "origin":
        return (
          <>
            <div className="space-y-2">
              <Label>
                <FieldNumber value="2.7" /> Durch wen wurde der Vorfall
                entdeckt?
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
            <YesNo
              number="2.8"
              question="Hat der Vorfall bei einem Drittdienstleister oder einem anderen Finanzunternehmen seinen Ursprung?"
              value={form.originatesFromThirdParty}
              onChange={(v) => update("originatesFromThirdParty", v)}
            />
            {form.originatesFromThirdParty && (
              <Field
                number="2.8"
                label="Bezeichnung des Dritten"
                htmlFor="thirdPartyDetails"
                hint="Vollständige Bezeichnung, Identifikationscode und Art des Codes (z. B. LEI oder EUID) – auch bei konzerninternen Drittdienstleistern."
              >
                <Textarea
                  id="thirdPartyDetails"
                  rows={3}
                  value={form.thirdPartyDetails}
                  onChange={(e) => update("thirdPartyDetails", e.target.value)}
                />
              </Field>
            )}
            <YesNo
              number="2.9"
              question="Wurde der Geschäftsfortführungsplan aktiviert?"
              hint="Bei „Ja“ sind die Gründe in Feld 2.10 zu erläutern."
              value={form.businessContinuityActivated}
              onChange={(v) => update("businessContinuityActivated", v)}
            />
          </>
        );

      case "timeline":
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                number="3.2"
                label="Eintreten des Vorfalls (UTC)"
                htmlFor="occurredAt"
                hint="Nur anzugeben, wenn abweichend von der Entdeckung."
              >
                <Input
                  id="occurredAt"
                  type="datetime-local"
                  value={form.occurredAt}
                  onChange={(e) => update("occurredAt", e.target.value)}
                />
              </Field>
              <Field
                number="3.3"
                label="Wiederherstellung der Dienste (UTC)"
                htmlFor="servicesRestoredAt"
                hint="Zeitpunkt der technischen Behebung."
              >
                <Input
                  id="servicesRestoredAt"
                  type="datetime-local"
                  value={form.servicesRestoredAt}
                  onChange={(e) => update("servicesRestoredAt", e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                number="3.15"
                label="Dauer des Vorfalls (Stunden)"
                htmlFor="durationHours"
                hint={
                  asDaysHoursMinutes(form.durationHours) ??
                  "Zeitraum zwischen Feld 3.2 und Feld 4.8."
                }
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
                number="3.16"
                label="Ausfallzeit des Dienstes (Stunden)"
                htmlFor="downtimeHours"
                hint={
                  asDaysHoursMinutes(form.downtimeHours) ??
                  "Einschließlich verzögert erbrachter Leistungen."
                }
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
                <FieldNumber value="3.17" /> Sind Dauer und Ausfallzeit
                tatsächlich oder geschätzt?
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
          </>
        );

      case "figures":
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                number="3.4"
                label="Anzahl der betroffenen Kunden"
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
                number="3.5"
                label="Anteil der betroffenen Kunden (%)"
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
                number="3.6"
                label="Anzahl der betroffenen finanziellen Gegenparteien"
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
                number="3.7"
                label="Anteil der betroffenen Gegenparteien (%)"
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
                number="3.9"
                label="Anzahl der betroffenen Transaktionen"
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
                number="3.10"
                label="Anteil der betroffenen Transaktionen (%)"
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
                number="3.11"
                label={`Wert der betroffenen Transaktionen (${form.reportingCurrency})`}
                htmlFor="transactionsValue"
                hint="Als positiver Betrag."
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
              number="3.8"
              label="Auswirkungen auf relevante Kunden oder Gegenparteien"
              htmlFor="relevantClientsImpact"
              hint="Kunden oder Gegenparteien, deren Beeinträchtigung die Geschäftsziele oder die Markteffizienz berührt (Art. 1 Abs. 3 RTS)."
            >
              <Textarea
                id="relevantClientsImpact"
                rows={3}
                value={form.relevantClientsImpact}
                onChange={(e) =>
                  update("relevantClientsImpact", e.target.value)
                }
              />
            </Field>
            <div className="space-y-2">
              <Label>
                <FieldNumber value="3.12" /> Handelt es sich um tatsächliche
                Zahlen, um Schätzungen, oder gab es keine Auswirkungen?
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
          </>
        );

      case "reputation":
        return (
          <>
            <div className="space-y-2">
              <Label>
                <FieldNumber value="3.13" /> Auswirkungen auf die Reputation
              </Label>
              <div className="flex flex-wrap gap-2">
                {REPUTATION_CONDITIONS.map((c) => (
                  <TogglePill
                    key={c.id}
                    active={form.reputationalImpactConditions.includes(c.id)}
                    title={c.hint}
                    onClick={() => toggle("reputationalImpactConditions", c.id)}
                  >
                    {c.label}
                  </TogglePill>
                ))}
              </div>
            </div>
            <Field
              number="3.14"
              label="Kontextinformationen zum Reputationsschaden"
              htmlFor="reputationalImpactContext"
              hint="Art und Reichweite der Medien, Zahl der Kundenbeschwerden, nicht erfüllte regulatorische Anforderungen, eigene Kommunikation an die Öffentlichkeit sowie etwaige Falschinformationen."
            >
              <Textarea
                id="reputationalImpactContext"
                rows={4}
                value={form.reputationalImpactContext}
                onChange={(e) =>
                  update("reputationalImpactContext", e.target.value)
                }
              />
            </Field>
          </>
        );

      case "geography":
        return (
          <>
            <div className="space-y-2">
              <Label>
                <FieldNumber value="3.18" /> Arten der Auswirkungen in den
                Mitgliedstaaten
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
              number="3.19"
              label="Beschreibung der Auswirkungen in anderen Mitgliedstaaten"
              htmlFor="memberStateImpactDescription"
              hint="Auswirkungen und Schwere je betroffenem Mitgliedstaat aus Feld 2.6."
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

      case "dataLoss":
        return (
          <>
            <div className="space-y-2">
              <Label>
                <FieldNumber value="3.20" /> Betroffene Schutzziele der Daten
              </Label>
              <div className="flex flex-wrap gap-2">
                {DATA_LOSS_DIMENSIONS.map((d) => (
                  <TogglePill
                    key={d.id}
                    active={form.dataLossDimensions.includes(d.id)}
                    title={d.hint}
                    onClick={() => toggle("dataLossDimensions", d.id)}
                  >
                    {d.label}
                  </TogglePill>
                ))}
              </div>
            </div>
            <Field
              number="3.21"
              label="Beschreibung der Datenverluste"
              htmlFor="dataLossDescription"
              hint="Welche Daten sind betroffen (Kundendaten, Daten anderer Unternehmen, eigene Daten), welcher Art ist ihre Vertraulichkeit, und welche Folgen hat die Beeinträchtigung für Geschäftsziele oder regulatorische Anforderungen?"
            >
              <Textarea
                id="dataLossDescription"
                rows={4}
                value={form.dataLossDescription}
                onChange={(e) => update("dataLossDescription", e.target.value)}
              />
            </Field>
            <Field
              number="3.22"
              label="Betroffene kritische Dienste"
              htmlFor="criticalServicesDescription"
              hint="Zulassungspflichtige oder beaufsichtigte Dienstleistungen, IKT-Dienste kritischer oder wichtiger Funktionen sowie die Art eines etwaigen böswilligen unbefugten Zugriffs (Art. 6 RTS)."
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
                <FieldNumber value="3.23" /> Vorfallsart
              </Label>
              <div className="flex flex-wrap gap-2">
                {INCIDENT_TYPES.map((t) => (
                  <TogglePill
                    key={t.id}
                    active={form.incidentTypes.includes(t.id)}
                    title={"hint" in t ? t.hint : undefined}
                    onClick={() => toggle("incidentTypes", t.id)}
                  >
                    {t.label}
                  </TogglePill>
                ))}
              </div>
            </div>
            {form.incidentTypes.includes("other") && (
              <Field
                number="3.24"
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
                <FieldNumber value="3.25" /> Vom Bedrohungsakteur eingesetzte
                Bedrohungen und Techniken
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
                number="3.26"
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
                <FieldNumber value="3.27" /> Betroffene Funktionsbereiche
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
              number="3.27"
              label="Betroffene Geschäftsprozesse"
              htmlFor="affectedProcesses"
              hint="In Klarschrift, z. B. Kartenzahlungen, Überweisungen, Kunden-Onboarding, Clearing, Portfolioverwaltung."
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
                <FieldNumber value="3.28" /> Sind Infrastrukturkomponenten
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
                number="3.29"
                label="Beschreibung der betroffenen Infrastrukturkomponenten"
                htmlFor="infrastructureDescription"
                hint="Hardware und Software in Klarschrift, mit Versionsinformationen, Angabe zu interner oder ausgelagerter Infrastruktur samt Drittdienstleister, gemeinsamer Nutzung durch mehrere Geschäftsfunktionen und getroffenen Resilienzvorkehrungen."
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
              number="3.30"
              question="Hat sich der Vorfall auf die finanziellen Interessen der Kunden ausgewirkt?"
              value={form.clientFinancialInterestAffected}
              onChange={(v) => update("clientFinancialInterestAffected", v)}
            />
          </>
        );

      case "measures":
        return (
          <>
            <div className="space-y-2">
              <Label>
                <FieldNumber value="3.31" /> Welche Behörden wurden über den
                Vorfall informiert?
              </Label>
              <div className="flex flex-wrap gap-2">
                {NOTIFIED_AUTHORITIES.map((a) => (
                  <TogglePill
                    key={a.id}
                    active={form.notifiedAuthorities.includes(a.id)}
                    onClick={() => toggle("notifiedAuthorities", a.id)}
                  >
                    {a.label}
                  </TogglePill>
                ))}
              </div>
            </div>
            {form.notifiedAuthorities.includes("other") && (
              <Field
                number="3.32"
                label="Spezifizierung der „anderen“ Behörden"
                htmlFor="notifiedAuthoritiesOther"
              >
                <Input
                  id="notifiedAuthoritiesOther"
                  value={form.notifiedAuthoritiesOther}
                  onChange={(e) =>
                    update("notifiedAuthoritiesOther", e.target.value)
                  }
                />
              </Field>
            )}
            <YesNo
              number="3.33"
              question="Wurden befristete Maßnahmen zur Wiederherstellung ergriffen oder geplant?"
              value={form.temporaryMeasuresTaken}
              onChange={(v) => update("temporaryMeasuresTaken", v)}
            />
            <Field
              number="3.34"
              label="Beschreibung der befristeten Maßnahmen"
              htmlFor="temporaryMeasuresDescription"
              hint="Etwa Isolierung auf Netzwerkebene, Workaround-Verfahren, Sperrung von Schnittstellen oder Aktivierung des Ausweichstandorts – mit Zeitpunkt der Umsetzung und voraussichtlicher Rückkehr zum Primärstandort. Wurden keine Maßnahmen ergriffen, ist der Grund anzugeben."
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
              number="3.35"
              label="Kompromittierungsindikatoren"
              htmlFor="indicatorsOfCompromise"
              hint="Nur für Unternehmen im Anwendungsbereich der Richtlinie (EU) 2022/2555: IP- und URL-Adressen, Domains, Datei-Hashes, Angaben zu Schadsoftware, Netz- und E-Mail-Aktivitäten, DNS-Anfragen, Nutzerkontoaktivitäten."
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

      case "rootCause":
        return (
          <>
            <div className="space-y-2">
              <Label>
                <FieldNumber value="4.1" /> Übergeordnete Einstufung der
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
                  <FieldNumber value="4.2" /> Detaillierte Ursachen –{" "}
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
                          <FieldNumber value="4.3" /> Weitergehende Einstufung –{" "}
                          {detail.label}
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
                number="4.4"
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
              number="4.5"
              label="Informationen über die Ursachen des Vorfalls"
              htmlFor="rootCauseDescription"
              hint="Abfolge der Ereignisse und die Hauptfaktoren, die zum Vorfall beigetragen haben; bei böswilligen Handlungen zusätzlich Taktiken, Techniken, Verfahren und Eintrittsvektor sowie die Untersuchungen, die zur Ursache geführt haben."
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
            <Field
              number="4.6"
              label="Zusammenfassung der Behebung und gewonnene Erkenntnisse"
              htmlFor="resolutionSummary"
              hint="Dauerhafte Maßnahmen, die Beteiligung von Drittdienstleistern, angepasste Verfahren, zusätzliche Kontrollen samt Zeitplan – und die Ergebnisse der Nachbetrachtung."
            >
              <Textarea
                id="resolutionSummary"
                rows={5}
                value={form.resolutionSummary}
                onChange={(e) => update("resolutionSummary", e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                number="4.7"
                label="Beseitigung der Ursache (UTC)"
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
              <Field
                number="4.8"
                label="Behebung des Vorfalls (UTC)"
                htmlFor="incidentResolvedAt"
              >
                <Input
                  id="incidentResolvedAt"
                  type="datetime-local"
                  value={form.incidentResolvedAt}
                  onChange={(e) => update("incidentResolvedAt", e.target.value)}
                />
              </Field>
            </div>
            <Field
              number="4.9"
              label="Abweichung vom ursprünglich geplanten Umsetzungsdatum"
              htmlFor="resolutionDelayReason"
            >
              <Textarea
                id="resolutionDelayReason"
                rows={3}
                value={form.resolutionDelayReason}
                onChange={(e) =>
                  update("resolutionDelayReason", e.target.value)
                }
              />
            </Field>
          </>
        );

      case "resolutionRisk":
        return (
          <>
            <div className="space-y-2">
              <Label>
                <FieldNumber value="4.10" /> Stellt der Vorfall ein Risiko für
                kritische Funktionen zu Abwicklungszwecken dar?
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
              number="4.11"
              label="Für die Abwicklungsbehörden relevante Informationen"
              htmlFor="resolutionAuthorityInformation"
              hint="Auswirkungen auf die Abwicklungsfähigkeit, auf Solvenz und Liquidität samt möglicher Quantifizierung, auf die Aufrechterhaltung des Geschäftsbetriebs sowie auf die Kapitalposition; außerdem, ob die Verträge über IKT-Dienste im Abwicklungsfall durchsetzbar bleiben."
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

      case "economic":
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                number="4.13"
                label={`Bruttokosten und -verluste (${form.reportingCurrency})`}
                htmlFor="grossCostsAndLosses"
                hint="Enteignete Mittel, Ersatz von Software, Hardware und Infrastruktur, Personalkosten einschließlich kalkulatorischer Bearbeitungszeit, Vertragsstrafen, Entschädigungen, entgangene Einnahmen, Kommunikations- und Beratungskosten."
              >
                <Input
                  id="grossCostsAndLosses"
                  type="number"
                  min={0}
                  value={form.grossCostsAndLosses}
                  onChange={(e) =>
                    update("grossCostsAndLosses", e.target.value)
                  }
                />
              </Field>
              <Field
                number="4.14"
                label={`Finanzielle Rückflüsse (${form.reportingCurrency})`}
                htmlFor="financialRecoveries"
                hint="Bezogen auf den ursprünglichen Verlust, unabhängig vom Zeitpunkt der Vereinnahmung."
              >
                <Input
                  id="financialRecoveries"
                  type="number"
                  min={0}
                  value={form.financialRecoveries}
                  onChange={(e) =>
                    update("financialRecoveries", e.target.value)
                  }
                />
              </Field>
            </div>
            <Field
              number="4.12"
              label="Angaben zur Wesentlichkeitsschwelle „Wirtschaftliche Auswirkungen“"
              htmlFor="economicImpactDescription"
              hint="Wodurch sind die in Feld 4.13 angegebenen Kosten und Verluste entstanden?"
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
              number="4.15"
              question="Haben sich nicht schwerwiegende Vorfälle wiederholt und sind zusammen als schwerwiegender Vorfall zu betrachten?"
              value={form.recurringIncidents}
              onChange={(v) => update("recurringIncidents", v)}
            />
            {form.recurringIncidents && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  number="4.15"
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
                  number="4.16"
                  label="Eintreten des ersten Vorfalls (UTC)"
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
  // Ohne Meldepflicht bleiben die Rückstufung und die ausdrücklich freiwillige
  // Meldung.
  const blocked =
    obligation.level === "none" &&
    !form.voluntary &&
    form.reportType !== "reclassification";
  const activeSteps = stepsFor(form.reportType);
  const addressed = activeSteps.filter(
    (s) => stepStatus[s.id] !== "pending",
  ).length;
  const checks = checkReport(toInput());
  const errors = checks.filter((c) => c.severity === "error");

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        step="Schritt 03"
        title="Meldung an die BaFin"
        desc="Die Meldung folgt Feld für Feld dem amtlichen Formular: Anhang I der Durchführungsverordnung (EU) 2025/302 in der Fassung der Melde- und Veröffentlichungsplattform der BaFin. Die Feldnummern stehen an jeder Angabe."
      />

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
            <p className="text-sm text-muted-foreground">
              {obligation.explanation}
            </p>
          </div>
        </div>

        {obligation.level === "none" && (
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
            <Button
              type="button"
              size="sm"
              variant={form.voluntary ? "outline" : "default"}
              onClick={() => update("voluntary", !form.voluntary)}
            >
              {form.voluntary
                ? "Freiwillige Meldung verwerfen"
                : "Trotzdem freiwillig melden"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Freiwillige Meldung erheblicher Cyberbedrohungen (Art. 19 Abs. 2
              DORA). Wurde der Vorfall bereits gemeldet, wählen Sie stattdessen
              in Feld 1.1 den Meldungstyp „Rückstufung“.
            </span>
          </div>
        )}
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
                article={`Felder ${step.fields}`}
                open={open}
                summary={step.summary(form) || "Noch keine Angaben"}
                isLast={isLast}
                onToggle={() => toggleStep(step.id)}
              >
                {step.hint && (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {step.hint}
                  </p>
                )}
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
                style={{
                  width: `${(addressed / activeSteps.length) * 100}%`,
                }}
              />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              {REPORT_TYPE_BY_ID[form.reportType].label}:{" "}
              {REPORT_TYPE_BY_ID[form.reportType].deadline}.
            </p>
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
              Ohne Meldepflicht ist die Übermittlung nur als Rückstufung oder
              als ausdrücklich freiwillige Meldung möglich.
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

/** Feldnummer des amtlichen Formulars vor der Beschriftung. */
function FieldNumber({ value }: { value: string }) {
  return (
    <span className="font-mono text-xs font-normal text-muted-foreground">
      {value}
    </span>
  );
}

function Field({
  number,
  label,
  htmlFor,
  hint,
  children,
}: {
  number: string;
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>
        <FieldNumber value={number} /> {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function TogglePill({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
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
  number,
  question,
  hint,
  value,
  onChange,
}: {
  number: string;
  question: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        <FieldNumber value={number} /> {question}
      </p>
      <div className="flex gap-2 sm:max-w-sm">
        <ChoiceButton selected={value} onClick={() => onChange(true)}>
          Ja
        </ChoiceButton>
        <ChoiceButton selected={!value} onClick={() => onChange(false)}>
          Nein
        </ChoiceButton>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
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
          <span className="text-muted-foreground">
            <span className="font-mono font-medium text-foreground">
              {check.field}
            </span>{" "}
            {check.message}
          </span>
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
