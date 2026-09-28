import { z } from "zod";
import {
  DORA_CRITERIA,
  DATA_LOSS_DIMENSIONS,
  REPUTATION_CONDITIONS,
  GEO_IMPACT_AREAS,
  type CriterionId,
  type DataLossDimension,
  type ReputationCondition,
  type GeoImpactArea,
} from "@/lib/dora/criteria";
import { REPORT_TYPES, type ReportType } from "@/lib/dora/reporting";
import {
  DETECTION_SOURCES,
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
  THREAT_ACTIVITY_CHANGES,
  THREAT_STATUSES,
  THREAT_TECHNIQUES,
} from "@/lib/dora/report-fields";
import { ENTITY_TYPES, type EntityType } from "@/lib/company/profile";
import { isValidLei } from "@/lib/lei";

const criterionIds = DORA_CRITERIA.map((c) => c.id) as [CriterionId, ...CriterionId[]];

const dataLossIds = DATA_LOSS_DIMENSIONS.map((d) => d.id) as [
  DataLossDimension,
  ...DataLossDimension[],
];

const reputationIds = REPUTATION_CONDITIONS.map((c) => c.id) as [
  ReputationCondition,
  ...ReputationCondition[],
];

const geoImpactIds = GEO_IMPACT_AREAS.map((a) => a.id) as [
  GeoImpactArea,
  ...GeoImpactArea[],
];

const reportTypeIds = REPORT_TYPES.map((t) => t.id) as [
  ReportType,
  ...ReportType[],
];

const entityTypeIds = ENTITY_TYPES.map((t) => t.id) as [
  EntityType,
  ...EntityType[],
];

const classificationIds = ["major", "non_major", "indeterminate"] as const;

/* ---------------------------------------------------------------------------
 * Funktion 1: Triage – Handelt es sich um einen IKT-bezogenen Vorfall?
 * ------------------------------------------------------------------------- */

/*
 * Die Obergrenzen begrenzen, was an das KI-Modell geht: Kosten je Anfrage und
 * der Raum für eingebettete Fremdtexte. Eine Meldung, die sie überschreitet,
 * ist ohnehin kein Triage-Text mehr, sondern ein Anhang.
 */
export const triageInputSchema = z.object({
  /** Freitextbeschreibung des möglichen Vorfalls. */
  description: z
    .string()
    .min(10, "Bitte beschreiben Sie den Vorfall (mind. 10 Zeichen).")
    .max(10_000, "Die Beschreibung ist zu lang (max. 10.000 Zeichen)."),
  /** Betroffenes System / betroffener Dienst. */
  affectedSystem: z
    .string()
    .min(1, "Bitte geben Sie das betroffene System an.")
    .max(500, "Die Angabe ist zu lang (max. 500 Zeichen)."),
  /** Wer hat den Vorfall gemeldet? (optional, reine Dokumentation) */
  reportedBy: z
    .string()
    .max(500, "Die Angabe ist zu lang (max. 500 Zeichen).")
    .optional()
    .default(""),
  /** Beobachtete Symptome / Auswirkungen. */
  symptoms: z
    .string()
    .max(5_000, "Die Angabe ist zu lang (max. 5.000 Zeichen).")
    .optional()
    .default(""),
});

export type TriageInput = z.infer<typeof triageInputSchema>;

export const triageResultSchema = z.object({
  /** Einschätzung, ob es sich um einen IKT-bezogenen Vorfall handelt. */
  isIncident: z.boolean(),
  /** Empfohlenes weiteres Vorgehen, z. B. "Kein IKT-bezogener Vorfall – ServiceDesk ist verantwortlich." */
  recommendation: z.string(),
  /** Begründung der Einschätzung. */
  reasoning: z.string(),
  /** Konfidenz der Einschätzung (0–1); unter 0,5 gilt die Einordnung als unklar. */
  confidence: z.number().min(0).max(1),
  /** Rückfragen an den Melder, deren Antwort die Einordnung ermöglicht – bei unklarem Ergebnis. */
  openQuestions: z.array(z.string()).optional().default([]),
  /**
   * Die Angaben enthielten Anweisungen an ein KI-System oder Versuche, das
   * Ergebnis vorzugeben – bei Texten Dritter (E-Mails, Erpressernachrichten)
   * selbst ein Befund.
   */
  manipulationDetected: z.boolean().optional().default(false),
  /** Herkunft der Einschätzung: das KI-Modell oder das regelbasierte Platzhalter-Verfahren. */
  source: z.enum(["claude", "rules"]).optional(),
  /** Modell, das die Einschätzung geliefert hat. */
  model: z.string().optional(),
});

export type TriageResult = z.infer<typeof triageResultSchema>;

/* ---------------------------------------------------------------------------
 * Funktion 2: Schweregrad-Bestimmung nach DORA-Kriterien
 * ------------------------------------------------------------------------- */

export const severityInputSchema = z.object({
  /** Verweis/Zusammenfassung des Vorfalls (z. B. aus der Triage übernommen). */
  description: z.string().min(10, "Bitte beschreiben Sie den Vorfall (mind. 10 Zeichen)."),
  /** Anzahl betroffener Kunden (absolut, Art. 9 Abs. 1 Buchst. b RTS). */
  clientsAffected: z.coerce.number().min(0).optional(),
  /** Anteil betroffener Kunden in Prozent der Nutzer des betroffenen Dienstes (Buchst. a). */
  clientsAffectedPercent: z.coerce.number().min(0).max(100).optional(),
  /** Anteil betroffener finanzieller Gegenparteien in Prozent (Buchst. c). */
  counterpartsAffectedPercent: z.coerce.number().min(0).max(100).optional(),
  /**
   * Anteil der betroffenen Transaktionen an der durchschnittlichen täglichen
   * Transaktionsanzahl in Prozent (Buchst. d). Kann bei mehrtägigen Vorfällen
   * 100 % übersteigen.
   */
  transactionsCountPercent: z.coerce.number().min(0).optional(),
  /**
   * Anteil des betroffenen Transaktionswerts am durchschnittlichen täglichen
   * Transaktionswert in Prozent (Buchst. e). Kann bei mehrtägigen Vorfällen
   * 100 % übersteigen.
   */
  transactionsValuePercent: z.coerce.number().min(0).optional(),
  /**
   * Als relevant identifizierte Kunden oder finanzielle Gegenparteien betroffen
   * (Art. 1 Abs. 3, Art. 9 Abs. 1 Buchst. f RTS). Erreicht die
   * Materialitätsschwelle für sich genommen.
   */
  relevantClientsAffected: z.boolean().optional().default(false),
  /**
   * Gesamtdauer des Vorfalls in Stunden, gemessen vom Auftreten (bzw. der
   * Entdeckung, falls das Auftreten unbekannt ist) bis zur Behebung
   * (Art. 3 Abs. 1 RTS). Schätzung zulässig, solange die Behebung aussteht.
   */
  durationHours: z.coerce.number().min(0).optional(),
  /**
   * Ausfallzeit in Stunden (vollständige oder teilweise Nichtverfügbarkeit,
   * Art. 3 Abs. 2 RTS). Die 2-Stunden-Schwelle gilt nur für IKT-Dienste, die
   * kritische oder wichtige Funktionen unterstützen (Art. 9 Abs. 3 Buchst. b
   * RTS) – maßgeblich ist daher die Angabe zu criticalFunctionAffected.
   */
  downtimeHours: z.coerce.number().min(0).optional(),
  /** Anzahl der Mitgliedstaaten, in denen der Vorfall Auswirkungen hat (Art. 9 Abs. 4 RTS). */
  memberStatesAffected: z.coerce.number().int().min(0).optional(),
  /**
   * Bereiche mit erheblichen Auswirkungen in anderen Mitgliedstaaten
   * (Art. 4 Buchst. a–c RTS). Die Schwelle "Geografische Ausbreitung" ist nur
   * erreicht, wenn neben ≥ 2 betroffenen Mitgliedstaaten mindestens ein
   * Bereich erheblich betroffen ist.
   */
  geoImpactAreas: z.array(z.enum(geoImpactIds)).optional().default([]),
  /** Betroffene Datenschutzdimensionen (Verfügbarkeit/Integrität/Authentizität/Vertraulichkeit, Art. 5 RTS). */
  dataLossDimensions: z.array(z.enum(dataLossIds)).optional().default([]),
  /**
   * Art. 9 Abs. 5 Buchst. a RTS: Die Datenbeeinträchtigung hat oder wird
   * nachteilige Auswirkungen auf die Umsetzung der Geschäftsziele oder die
   * Erfüllung regulatorischer Anforderungen haben. Erst damit ist die
   * Materialitätsschwelle "Datenverluste" erreicht.
   */
  dataLossAdverseImpact: z.boolean().optional().default(false),
  /**
   * Art. 6 Buchst. a RTS: IKT-Dienste oder Netzwerk- und Informationssysteme
   * betroffen, die kritische oder wichtige Funktionen unterstützen.
   */
  criticalFunctionAffected: z.boolean().optional().default(false),
  /**
   * Art. 6 Buchst. b RTS: zulassungs- bzw. registrierungspflichtige oder von
   * zuständigen Behörden beaufsichtigte Finanzdienstleistungen betroffen.
   */
  regulatedServicesAffected: z.boolean().optional().default(false),
  /**
   * Art. 6 Buchst. c RTS: erfolgreicher böswilliger unbefugter Zugriff auf die
   * Netzwerk- und Informationssysteme. Erfüllt das Kritikalitätskriterium
   * bereits für sich genommen.
   */
  maliciousUnauthorizedAccess: z.boolean().optional().default(false),
  /**
   * Art. 9 Abs. 5 Buchst. b RTS: der böswillige Zugriff kann zu Datenverlusten
   * führen. Erzwingt zusammen mit Art. 6 Buchst. c die Einstufung als
   * schwerwiegend (Art. 8 Abs. 1 Buchst. a RTS).
   */
  maliciousAccessDataLossPossible: z.boolean().optional().default(false),
  /**
   * Erfüllte Bedingungen der Reputationsauswirkung (Art. 2 Abs. 1 Buchst. a–d
   * RTS). Die Schwelle ist erreicht, sobald mindestens eine Bedingung erfüllt
   * ist (Art. 9 Abs. 2 RTS).
   */
  reputationalImpactConditions: z
    .array(z.enum(reputationIds))
    .optional()
    .default([]),
  economicImpactEur: z.coerce.number().min(0).optional(),
});

export type SeverityInput = z.infer<typeof severityInputSchema>;

export const criterionFindingSchema = z.object({
  criterionId: z.enum(criterionIds),
  /** Ist die Materialitätsschwelle dieses Kriteriums erreicht? */
  thresholdMet: z.boolean(),
  /** Bewertung dieses Kriteriums. */
  assessment: z.string(),
});

export type CriterionFinding = z.infer<typeof criterionFindingSchema>;

export const severityResultSchema = z.object({
  /** Gesamteinstufung gemäß DORA. */
  classification: z.enum(classificationIds),
  /** Befunde je Einzelkriterium. */
  findings: z.array(criterionFindingSchema),
  /** Zusammenfassende Begründung. */
  summary: z.string(),
  confidence: z.number().min(0).max(1),
});

export type SeverityResult = z.infer<typeof severityResultSchema>;

/* ---------------------------------------------------------------------------
 * Funktion 3: Meldungen nach Art. 19 DORA
 *
 * Inhalt und Fristen richten sich nach der Delegierten Verordnung (EU)
 * 2025/301 (RTS zu Art. 20 Buchst. a DORA). Die Kommentare nennen zu jeder
 * Angabe den Artikel und Buchstaben, aus dem sie stammt; die Benennung folgt
 * dem Verordnungstext (siehe @/lib/dora/report-fields).
 *
 * Zahlenangaben liegen – wie im Unternehmensprofil – als Text vor, damit ein
 * leeres Feld ("keine Angabe") von einer 0 unterscheidbar bleibt.
 * ------------------------------------------------------------------------- */

const LEI_MESSAGE = "Bitte geben Sie einen gültigen LEI an (20 Zeichen, Prüfziffern nach ISO 17442).";

/** Pflichtangabe eines LEI-Codes (ISO 17442). */
const leiSchema = z.string().refine(isValidLei, LEI_MESSAGE);

const optionalText = z.string().optional().default("");

/** Leer oder ein LEI. */
const optionalLei = optionalText.refine(
  (v) => v === "" || isValidLei(v),
  LEI_MESSAGE,
);

/**
 * Leer oder mehrere LEI-Codes, durch Semikolon getrennt – für die aggregierte
 * Meldung nach Art. 1 Buchst. d.
 */
const optionalLeiList = optionalText.refine(
  (v) =>
    v === "" ||
    v
      .split(";")
      .map((part) => part.trim())
      .every(isValidLei),
  "Bitte geben Sie je Finanzunternehmen einen gültigen LEI an, getrennt durch Semikolon.",
);

const optionalEmail = optionalText.refine(
  (v) => v === "" || /^\S+@\S+\.\S+$/.test(v),
  "Bitte geben Sie eine gültige E-Mail-Adresse an.",
);

/** Leer oder eine Zahl ab 0. */
const numberText = z
  .string()
  .optional()
  .default("")
  .refine(
    (v) => v === "" || (Number.isFinite(Number(v)) && Number(v) >= 0),
    "Bitte geben Sie eine Zahl ab 0 an.",
  );

/** Leer oder ein Prozentwert von 0 bis 100. */
const percentText = z
  .string()
  .optional()
  .default("")
  .refine(
    (v) =>
      v === "" ||
      (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 100),
    "Bitte geben Sie einen Prozentwert zwischen 0 und 100 an.",
  );

const requiredDateTime = z
  .string()
  .min(1, "Bitte geben Sie Datum und Uhrzeit an.")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Ungültiger Zeitpunkt.");

const optionalDateTime = z
  .string()
  .optional()
  .default("")
  .refine(
    (v) => v === "" || !Number.isNaN(Date.parse(v)),
    "Ungültiger Zeitpunkt.",
  );

const enumIds = <T extends readonly { id: string }[]>(items: T) =>
  items.map((i) => i.id) as [T[number]["id"], ...T[number]["id"][]];

/* ---------------------------------------------------------------------------
 * Art. 1 – Allgemeine Informationen
 *
 * Gemeinsamer Kopf beider Meldungen: die Vorfallmeldung führt ihn nach Art. 1,
 * die freiwillige Meldung erheblicher Cyberbedrohungen nach Art. 6 Buchst. a.
 * ------------------------------------------------------------------------- */

export const generalInformationSchema = z.object({
  /** Art. 1 Buchst. b: Name des meldenden Finanzunternehmens. */
  entityName: z
    .string()
    .min(1, "Bitte geben Sie das Finanzunternehmen an."),
  /** Art. 1 Buchst. b: LEI-Code des Finanzunternehmens. */
  entityLei: leiSchema,
  /** Art. 1 Buchst. b: Art des Finanzunternehmens (Art. 2 Abs. 1 DORA). */
  entityType: z.enum(entityTypeIds),
  /**
   * Art. 1 Buchst. c: Unternehmen, das die Meldung für das Finanzunternehmen
   * übermittelt – nur auszufüllen, wenn das Finanzunternehmen nicht selbst
   * meldet.
   */
  submittingEntityName: optionalText,
  submittingEntityCode: optionalLei,
  /**
   * Art. 1 Buchst. d: weitere Finanzunternehmen, die in einer aggregierten
   * Meldung erfasst sind; Namen und LEI-Codes in gleicher Reihenfolge.
   */
  aggregatedEntityNames: optionalText,
  aggregatedEntityLeis: optionalLeiList,
  /**
   * Art. 1 Buchst. e: Kontaktdaten der Personen, die für die Kommunikation mit
   * der zuständigen Behörde verantwortlich sind.
   */
  primaryContactName: z
    .string()
    .min(1, "Bitte geben Sie eine verantwortliche Person an."),
  primaryContactEmail: z.email("Bitte geben Sie eine gültige E-Mail-Adresse an."),
  primaryContactPhone: z
    .string()
    .min(1, "Bitte geben Sie eine Telefonnummer mit internationaler Vorwahl an."),
  secondContactName: optionalText,
  secondContactEmail: optionalEmail,
  secondContactPhone: optionalText,
  /** Art. 1 Buchst. f: Mutterunternehmen der Gruppe, sofern vorhanden. */
  groupParentName: optionalText,
  groupParentLei: optionalLei,
  /** Art. 1 Buchst. g: Währung, in der monetäre Beträge angegeben werden. */
  reportingCurrency: z
    .string()
    .regex(/^[A-Z]{3}$/, "Bitte geben Sie einen ISO-4217-Code an, z. B. EUR."),

  /*
   * Kein Meldeinhalt, sondern eine Eigenschaft des Unternehmens: Für nach
   * Art. 3 der Richtlinie (EU) 2022/2555 als wesentlich oder wichtig
   * eingestufte Unternehmen greift die Wochenendregel des Art. 5 Abs. 4 bei
   * Erst- und Zwischenmeldungen nicht (Art. 5 Abs. 5).
   */
  nis2EssentialEntity: z.boolean().optional().default(false),
});

export type GeneralInformation = z.infer<typeof generalInformationSchema>;

/* ---------------------------------------------------------------------------
 * Art. 2 bis 4 – Meldung eines schwerwiegenden IKT-bezogenen Vorfalls
 * ------------------------------------------------------------------------- */

export const reportInputSchema = generalInformationSchema.extend({
  /** Art. 1 Buchst. a: Art der Übermittlung. */
  reportType: z.enum(reportTypeIds),

  /* --- Art. 2: Erstmeldung ------------------------------------------------ */

  /*
   * Die Angaben des Art. 2 verlangt nur die Erstmeldung. Das Schema prüft
   * daher lediglich das Format; ob sie vorliegen müssen, entscheidet die Art
   * der Übermittlung – siehe checkReport in @/lib/dora/report-checks.
   */
  /** Buchst. a: vom Finanzunternehmen zugewiesener Referenzcode des Vorfalls. */
  incidentReferenceCode: optionalText,
  /** Buchst. b: Datum und Uhrzeit der Erkennung des Vorfalls. */
  detectedAt: optionalDateTime,
  /** Buchst. b: Datum und Uhrzeit der Einstufung (Art. 8 DelVO (EU) 2024/1772). */
  classifiedAt: optionalDateTime,
  /** Buchst. c: Beschreibung des IKT-bezogenen Vorfalls. */
  description: optionalText,
  /** Buchst. d: Kriterien, auf deren Grundlage als schwerwiegend eingestuft wurde. */
  classificationCriteria: z.array(z.enum(criterionIds)).optional().default([]),
  /** Buchst. e: Mitgliedstaaten, die von dem Vorfall betroffen sind. */
  affectedMemberStates: z
    .array(z.enum(enumIds(MEMBER_STATES)))
    .optional()
    .default([]),
  /** Buchst. f: Angaben dazu, wie der Vorfall erkannt wurde. */
  detectionSource: z.enum(enumIds(DETECTION_SOURCES)).optional().nullable(),
  /** Buchst. g: Angaben zum Ursprung des Vorfalls, soweit verfügbar. */
  incidentOrigin: z.enum(enumIds(INCIDENT_ORIGINS)).optional().nullable(),
  /** Buchst. g: Name, Identifikationscode und Art des Codes des Dritten. */
  originEntityDetails: optionalText,
  /** Buchst. h: Wurde ein Geschäftsfortführungsplan aktiviert? */
  businessContinuityActivated: z.boolean().optional().default(false),
  /** Buchst. i: Neueinstufung des Vorfalls als nicht schwerwiegend. */
  reclassifiedAsNonMajor: z.boolean().optional().default(false),
  /** Buchst. i: Begründung der Neueinstufung. */
  reclassificationDetails: optionalText,
  /** Buchst. j: sonstige zweckdienliche Informationen, soweit verfügbar. */
  additionalInformation: optionalText,

  /* --- Art. 3: Zwischenmeldung -------------------------------------------- */

  /** Buchst. a: von der zuständigen Behörde mitgeteilter Referenzcode. */
  authorityReferenceCode: optionalText,
  /** Buchst. b: Datum und Uhrzeit des Eintretens des Vorfalls. */
  occurredAt: optionalDateTime,
  /** Buchst. c: Wiederaufnahme des regulären Geschäftsbetriebs. */
  regularOperationsResumedAt: optionalDateTime,

  /*
   * Buchst. d: inwieweit die Einstufungskriterien der Delegierten Verordnung
   * (EU) 2024/1772 erfüllt sind – Kriterium für Kriterium.
   */
  /** Art. 1, Art. 9 Abs. 1: betroffene Kunden, Gegenparteien und Transaktionen. */
  clientsAffected: numberText,
  clientsAffectedPercent: percentText,
  counterpartsAffected: numberText,
  counterpartsAffectedPercent: percentText,
  /** Art. 1 Abs. 3: als relevant identifizierte Kunden oder Gegenparteien. */
  relevantClientsImpact: optionalText,
  transactionsAffected: numberText,
  transactionsAffectedPercent: percentText,
  /** In der Währung nach Art. 1 Buchst. g. */
  transactionsValue: numberText,
  /** Sind die vorstehenden Werte ermittelt oder geschätzt? */
  figuresBasis: z.enum(enumIds(FIGURE_BASES)).optional().nullable(),
  /** Art. 2: erfüllte Bedingungen des Reputationsschadens. */
  reputationalImpactConditions: z
    .array(z.enum(reputationIds))
    .optional()
    .default([]),
  reputationalImpactContext: optionalText,
  /** Art. 3 Abs. 1: Dauer des Vorfalls in Stunden. */
  durationHours: numberText,
  /** Art. 3 Abs. 2: Ausfallzeit des Dienstes in Stunden. */
  downtimeHours: numberText,
  durationBasis: z.enum(["actual", "estimate"]).optional().nullable(),
  /** Art. 4: Bereiche, in denen sich der Vorfall in Mitgliedstaaten auswirkt. */
  memberStateImpactTypes: z
    .array(z.enum(enumIds(IMPACT_TYPES)))
    .optional()
    .default([]),
  memberStateImpactDescription: optionalText,
  /** Art. 5: betroffene Schutzziele der Daten. */
  dataLossDimensions: z.array(z.enum(dataLossIds)).optional().default([]),
  dataLossDescription: optionalText,
  /** Art. 6: betroffene kritische Dienste. */
  criticalServicesDescription: optionalText,

  /** Buchst. e: Art des IKT-bezogenen Vorfalls. */
  incidentTypes: z.array(z.enum(enumIds(INCIDENT_TYPES))).optional().default([]),
  incidentTypeOther: optionalText,
  /** Buchst. f: vom Angreifer artikulierte Bedrohungen und eingesetzte Techniken. */
  threatTechniques: z
    .array(z.enum(enumIds(THREAT_TECHNIQUES)))
    .optional()
    .default([]),
  threatTechniqueOther: optionalText,
  /** Buchst. g: betroffene Funktionsbereiche und Geschäftsprozesse. */
  functionalAreas: z
    .array(z.enum(enumIds(FUNCTIONAL_AREAS)))
    .optional()
    .default([]),
  affectedProcesses: optionalText,
  /** Buchst. h: betroffene Infrastrukturkomponenten. */
  infrastructureAffected: z
    .enum(enumIds(INFRASTRUCTURE_ANSWERS))
    .optional()
    .nullable(),
  infrastructureDescription: optionalText,
  /** Buchst. i: Auswirkungen auf die finanziellen Interessen von Kunden. */
  clientFinancialInterestAffected: z.boolean().optional().default(false),
  /** Buchst. j: Meldung des Vorfalls an andere Behörden. */
  notifiedAuthorities: z
    .array(z.enum(enumIds(NOTIFIED_AUTHORITIES)))
    .optional()
    .default([]),
  notifiedAuthoritiesOther: optionalText,
  /** Buchst. k: befristete Maßnahmen zur Erholung von dem Vorfall. */
  temporaryMeasuresTaken: z.boolean().optional().default(false),
  temporaryMeasuresDescription: optionalText,
  /** Buchst. l: Kompromittierungsindikatoren. */
  indicatorsOfCompromise: optionalText,

  /* --- Art. 4: Abschlussmeldung ------------------------------------------- */

  /** Buchst. a: Angaben zu den Ursachen des Vorfalls. */
  rootCauseCategories: z
    .array(z.enum(enumIds(ROOT_CAUSE_CATEGORIES)))
    .optional()
    .default([]),
  rootCauseDetails: z.array(z.string()).optional().default([]),
  rootCauseFurther: z.array(z.string()).optional().default([]),
  rootCauseOther: optionalText,
  rootCauseDescription: optionalText,
  /** Buchst. b: Behebung des Vorfalls und Beseitigung der Ursache(n). */
  incidentResolvedAt: optionalDateTime,
  rootCauseAddressedAt: optionalDateTime,
  /** Buchst. c: Angaben dazu, wie dem Vorfall entgegengewirkt wurde. */
  counterMeasures: optionalText,
  /** Buchst. d: für die Abwicklungsbehörden relevante Informationen. */
  resolutionRisk: z
    .enum(enumIds(RESOLUTION_RISK_ANSWERS))
    .optional()
    .nullable(),
  resolutionAuthorityInformation: optionalText,
  /** Buchst. e: direkte und indirekte Kosten und Verluste, brutto. */
  grossCostsAndLosses: numberText,
  /** Buchst. e: finanzielle Wiedereinziehungen. */
  financialRecoveries: numberText,
  economicImpactDescription: optionalText,
  /** Buchst. f: wiederholte IKT-bezogene Vorfälle (Art. 8 Abs. 2 DelVO 2024/1772). */
  recurringIncidents: z.boolean().optional().default(false),
  recurringIncidentCount: numberText,
  firstRecurringIncidentAt: optionalDateTime,

  /* --- Art. 5 Abs. 3: verspätete Übermittlung ----------------------------- */

  /** Gründe für eine Überschreitung der Frist. */
  delayReason: optionalText,

  /* --- Angaben der Anwendung (nicht Teil des Meldeinhalts) ---------------- */

  /** Einstufung aus Schritt 02; steuert die Meldepflicht. */
  classification: z.enum(classificationIds),
  /** Empfängerin der Meldung laut Unternehmensprofil. */
  competentAuthority: optionalText,
});

export type ReportInput = z.infer<typeof reportInputSchema>;

/* ---------------------------------------------------------------------------
 * Art. 6 – Freiwillige Meldung erheblicher Cyberbedrohungen
 * ------------------------------------------------------------------------- */

export const cyberThreatInputSchema = generalInformationSchema.extend({
  /** Buchst. b: Datum und Uhrzeit der Erkennung der Cyberbedrohung. */
  detectedAt: requiredDateTime,
  /** Buchst. b: sonstige relevante Zeitstempel. */
  relevantTimestamps: optionalText,
  /** Buchst. c: Beschreibung der erheblichen Cyberbedrohung. */
  description: z
    .string()
    .min(10, "Bitte beschreiben Sie die Cyberbedrohung (mind. 10 Zeichen)."),
  /**
   * Buchst. d: mögliche Auswirkungen auf das Finanzunternehmen, seine Kunden
   * oder Gegenparteien im Finanzbereich.
   */
  potentialImpact: z
    .string()
    .min(10, "Bitte beschreiben Sie die möglichen Auswirkungen."),
  /**
   * Buchst. e: Einstufungskriterien, die die Meldung eines schwerwiegenden
   * Vorfalls ausgelöst hätten, wäre die Cyberbedrohung eingetreten.
   */
  classificationCriteria: z.array(z.enum(criterionIds)).optional().default([]),
  /** Buchst. f: Status der Cyberbedrohung. */
  threatStatus: z.enum(enumIds(THREAT_STATUSES)).optional().nullable(),
  /** Buchst. f: Hat sich die Bedrohungsaktivität verändert? */
  threatActivityChange: z
    .enum(enumIds(THREAT_ACTIVITY_CHANGES))
    .optional()
    .nullable(),
  /** Buchst. g: Maßnahmen zur Verhinderung des Eintretens. */
  preventiveMeasures: optionalText,
  /** Buchst. h: benachrichtigte Behörden. */
  notifiedAuthorities: z
    .array(z.enum(enumIds(NOTIFIED_AUTHORITIES)))
    .optional()
    .default([]),
  notifiedAuthoritiesOther: optionalText,
  /** Buchst. h: benachrichtigte andere Finanzunternehmen. */
  notifiedFinancialEntities: optionalText,
  /** Buchst. i: Kompromittierungsindikatoren. */
  indicatorsOfCompromise: optionalText,
  /** Buchst. j: sonstige zweckdienliche Informationen, soweit verfügbar. */
  additionalInformation: optionalText,

  /** Empfängerin der Meldung laut Unternehmensprofil. */
  competentAuthority: optionalText,
});

export type CyberThreatInput = z.infer<typeof cyberThreatInputSchema>;

/**
 * Was übermittelt wird: die Meldung eines schwerwiegenden Vorfalls oder die
 * freiwillige Meldung einer erheblichen Cyberbedrohung.
 */
export const submissionInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("incident") }).extend(reportInputSchema.shape),
  z
    .object({ kind: z.literal("cyber_threat") })
    .extend(cyberThreatInputSchema.shape),
]);

export type SubmissionInput = z.infer<typeof submissionInputSchema>;

/* ---------------------------------------------------------------------------
 * Quittung
 * ------------------------------------------------------------------------- */

export const reportDeadlineSchema = z.object({
  reportType: z.enum(reportTypeIds),
  /** Fälligkeit als ISO-Zeitstempel. */
  dueAt: z.string(),
  /** Fundstelle der Frist. */
  basis: z.string(),
});

export type ReportDeadline = z.infer<typeof reportDeadlineSchema>;

export const reportReceiptSchema = z.object({
  /** Vorgangsnummer der (simulierten) Einreichung. */
  submissionId: z.string(),
  submittedAt: z.string(),
  kind: z.enum(["incident", "cyber_threat"]),
  /** Art der Übermittlung; bei der Cyberbedrohungsmeldung nicht belegt. */
  reportType: z.enum(reportTypeIds).optional().nullable(),
  /**
   * "simulated": Die Meldung wurde nicht übermittelt. Ein echter Konnektor
   * würde hier den von der Behörde bestätigten Status liefern.
   */
  status: z.literal("simulated"),
  /** Bezeichnung des (simulierten) Übertragungswegs. */
  channel: z.string(),
  /** Fristen, die nach dieser Meldung noch laufen. */
  nextDeadlines: z.array(reportDeadlineSchema),
  entityName: z.string(),
  /** Empfängerin der Meldung laut Unternehmensprofil. */
  competentAuthority: optionalText,
  /** Referenzcode des Vorfalls (Art. 2 Buchst. a); bei Cyberbedrohungen leer. */
  incidentReferenceCode: optionalText,
});

export type ReportReceipt = z.infer<typeof reportReceiptSchema>;
