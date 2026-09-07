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
  INCIDENT_TYPES,
  INFRASTRUCTURE_ANSWERS,
  MEMBER_STATES,
  NOTIFIED_AUTHORITIES,
  RESOLUTION_RISK_ANSWERS,
  ROOT_CAUSE_CATEGORIES,
  THREAT_TECHNIQUES,
} from "@/lib/dora/report-fields";
import { ENTITY_TYPES, type EntityType } from "@/lib/company/profile";

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

export const triageInputSchema = z.object({
  /** Freitextbeschreibung des möglichen Vorfalls. */
  description: z.string().min(10, "Bitte beschreiben Sie den Vorfall (mind. 10 Zeichen)."),
  /** Betroffenes System / betroffener Dienst. */
  affectedSystem: z.string().min(1, "Bitte geben Sie das betroffene System an."),
  /** Wer hat den Vorfall gemeldet? (optional, reine Dokumentation) */
  reportedBy: z.string().optional().default(""),
  /** Beobachtete Symptome / Auswirkungen. */
  symptoms: z.string().optional().default(""),
});

export type TriageInput = z.infer<typeof triageInputSchema>;

export const triageResultSchema = z.object({
  /** Einschätzung, ob es sich um einen IKT-bezogenen Vorfall handelt. */
  isIncident: z.boolean(),
  /** Empfohlenes weiteres Vorgehen, z. B. "Kein IKT-bezogener Vorfall – ServiceDesk ist verantwortlich." */
  recommendation: z.string(),
  /** Begründung der Einschätzung. */
  reasoning: z.string(),
  /** Konfidenz der Einschätzung (0–1). */
  confidence: z.number().min(0).max(1),
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
 * Funktion 3: Meldung schwerwiegender IKT-bezogener Vorfälle (Art. 19 DORA)
 *
 * Die Felder und ihre Nummern folgen dem amtlichen Meldeformular: Anhang I
 * (Vorlage) und Anhang II (Datenglossar) der Durchführungsverordnung (EU)
 * 2025/302 sowie den Ausfüllhinweisen der BaFin zur MVP. Siehe
 * @/lib/dora/report-fields.
 *
 * Zahlenangaben liegen – wie im Unternehmensprofil – als Text vor, damit ein
 * leeres Feld ("keine Angabe") von einer 0 unterscheidbar bleibt.
 * ------------------------------------------------------------------------- */

const LEI_PATTERN = /^[A-Z0-9]{20}$/;

/** Pflichtangabe eines LEI-Codes (ISO 17442-1:2020). */
const leiSchema = z
  .string()
  .regex(LEI_PATTERN, "Der LEI besteht aus 20 alphanumerischen Zeichen.");

/**
 * Ein oder mehrere LEI-Codes, durch Semikolon getrennt (Feld 1.6; bei
 * aggregierter Meldung nach Art. 7 ITS mehrere Codes in derselben Reihenfolge
 * wie die Namen in Feld 1.5).
 */
const leiListSchema = z
  .string()
  .refine(
    (v) =>
      v
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)
        .every((part) => LEI_PATTERN.test(part)) &&
      v.split(";").some((part) => part.trim().length > 0),
    "Bitte geben Sie je Finanzunternehmen einen LEI aus 20 alphanumerischen Zeichen an, getrennt durch Semikolon.",
  );

const optionalText = z.string().optional().default("");

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

export const reportInputSchema = z.object({
  /* --- 1 Allgemeine Informationen --------------------------------------- */

  /** 1.1 Meldungstyp. */
  reportType: z.enum(reportTypeIds),
  /** 1.2 Vollständige juristische Bezeichnung des einreichenden Unternehmens. */
  submittingEntityName: z
    .string()
    .min(1, "Bitte geben Sie das einreichende Unternehmen an."),
  /** 1.3 Identifizierungscode des einreichenden Unternehmens (LEI). */
  submittingEntityCode: leiSchema,
  /** 1.4 Art des betroffenen Unternehmens (Art. 2 Abs. 1 Buchst. a–t DORA). */
  entityType: z.enum(entityTypeIds),
  /**
   * 1.4 b) Die Meldung erfolgt für ein Unternehmen, das nur über den national
   * erweiterten Anwendungsbereich (§ 1a Abs. 2a KWG, § 293 Abs. 5 VAG) unter
   * DORA fällt.
   */
  nationalScopeOnly: z.boolean().optional().default(false),
  /** 1.5 Name(n) der betroffenen Finanzunternehmen, ggf. semikolongetrennt. */
  affectedEntityNames: z
    .string()
    .min(1, "Bitte geben Sie das betroffene Finanzunternehmen an."),
  /** 1.6 LEI-Nummer(n) der betroffenen Finanzunternehmen. */
  affectedEntityLeis: leiListSchema,
  /** 1.7 Name des Hauptansprechpartners. */
  primaryContactName: z
    .string()
    .min(1, "Bitte geben Sie einen Hauptansprechpartner an."),
  /** 1.8 E-Mail-Adresse des Hauptansprechpartners. */
  primaryContactEmail: z.email("Bitte geben Sie eine gültige E-Mail-Adresse an."),
  /** 1.9 Telefonnummer des Hauptansprechpartners, mit internationaler Vorwahl. */
  primaryContactPhone: z
    .string()
    .min(1, "Bitte geben Sie eine Telefonnummer mit internationaler Vorwahl an."),
  /** 1.10 Name der zweiten Kontaktperson oder des verantwortlichen Teams. */
  secondContactName: optionalText,
  /** 1.11 E-Mail-Adresse der zweiten Kontaktperson. */
  secondContactEmail: optionalText.refine(
    (v) => v === "" || /^\S+@\S+\.\S+$/.test(v),
    "Bitte geben Sie eine gültige E-Mail-Adresse an.",
  ),
  /** 1.12 Telefonnummer der zweiten Kontaktperson. */
  secondContactPhone: optionalText,
  /** 1.13 Name des obersten Mutterunternehmens der Gruppe. */
  ultimateParentName: optionalText,
  /** 1.14 LEI-Nummer des obersten Mutterunternehmens. */
  ultimateParentLei: optionalText.refine(
    (v) => v === "" || LEI_PATTERN.test(v),
    "Der LEI besteht aus 20 alphanumerischen Zeichen.",
  ),
  /** 1.15 Berichtswährung (ISO 4217); in der MVP ist EUR voreingestellt. */
  reportingCurrency: z
    .string()
    .regex(/^[A-Z]{3}$/, "Bitte geben Sie einen ISO-4217-Code an, z. B. EUR."),

  /* --- 2 Erstmeldung ----------------------------------------------------- */

  /** 2.1 Vom Finanzunternehmen vergebener Referenzcode, in allen Meldungen gleich. */
  incidentReference: z
    .string()
    .min(1, "Bitte geben Sie den Referenzcode des Vorfalls an."),
  /** 2.2 Datum und Uhrzeit der Entdeckung des Vorfalls (UTC). */
  detectedAt: requiredDateTime,
  /** 2.3 Datum und Uhrzeit der Klassifizierung als schwerwiegend (UTC). */
  classifiedAt: requiredDateTime,
  /** 2.4 Beschreibung des Vorfalls. */
  description: z
    .string()
    .min(10, "Bitte beschreiben Sie den Vorfall (mind. 10 Zeichen)."),
  /** 2.5 Klassifikationskriterien, die die Meldung ausgelöst haben. */
  classificationCriteria: z.array(z.enum(criterionIds)).optional().default([]),
  /** 2.6 Betroffene EWR-Mitgliedstaaten (ISO 3166 ALPHA-2). */
  affectedMemberStates: z
    .array(z.enum(enumIds(MEMBER_STATES)))
    .optional()
    .default([]),
  /** 2.7 Durch wen wurde der Vorfall entdeckt? */
  detectionSource: z.enum(enumIds(DETECTION_SOURCES)).optional().nullable(),
  /** 2.8 Hat der Vorfall bei einem Dritten seinen Ursprung? */
  originatesFromThirdParty: z.boolean().optional().default(false),
  /** 2.8 Name, Identifikationscode und Art des Codes des Dritten. */
  thirdPartyDetails: optionalText,
  /** 2.9 Wurde der Geschäftsfortführungsplan aktiviert? */
  businessContinuityActivated: z.boolean().optional().default(false),
  /** 2.10 Weitere Informationen; u. a. Begründung verspäteter Meldungen. */
  additionalInformation: optionalText,

  /* --- 3 Zwischenmeldung -------------------------------------------------- */

  /** 3.1 Von der Behörde vergebene Vorgangsnummer (BaFin Incident ID). */
  bafinIncidentId: optionalText,
  /** 3.2 Datum und Uhrzeit des Eintretens des Vorfalls (UTC). */
  occurredAt: optionalDateTime,
  /** 3.3 Datum und Uhrzeit der Wiederherstellung der Dienste (UTC). */
  servicesRestoredAt: optionalDateTime,
  /** 3.4 Anzahl der betroffenen Kunden. */
  clientsAffected: numberText,
  /** 3.5 Anteil der betroffenen Kunden am betroffenen Dienst in Prozent. */
  clientsAffectedPercent: percentText,
  /** 3.6 Anzahl der betroffenen finanziellen Gegenparteien. */
  counterpartsAffected: numberText,
  /** 3.7 Anteil der betroffenen finanziellen Gegenparteien in Prozent. */
  counterpartsAffectedPercent: percentText,
  /** 3.8 Auswirkungen auf relevante Kunden oder Gegenparteien (Art. 1 Abs. 3 RTS). */
  relevantClientsImpact: optionalText,
  /** 3.9 Anzahl der betroffenen Transaktionen. */
  transactionsAffected: numberText,
  /** 3.10 Anteil der betroffenen Transaktionen in Prozent. */
  transactionsAffectedPercent: percentText,
  /** 3.11 Wert der betroffenen Transaktionen, in der Berichtswährung. */
  transactionsValue: numberText,
  /** 3.12 Sind die Werte der Felder 3.4–3.11 tatsächlich oder geschätzt? */
  figuresBasis: z.enum(enumIds(FIGURE_BASES)).optional().nullable(),
  /** 3.13 Erfüllte Bedingungen des Reputationsschadens (Art. 2 RTS). */
  reputationalImpactConditions: z
    .array(z.enum(reputationIds))
    .optional()
    .default([]),
  /** 3.14 Kontextinformationen zum Reputationsschaden. */
  reputationalImpactContext: optionalText,
  /** 3.15 Dauer des Vorfalls in Stunden (Feld 3.2 bis Feld 4.8). */
  durationHours: numberText,
  /** 3.16 Ausfallzeit des Dienstes in Stunden. */
  downtimeHours: numberText,
  /** 3.17 Sind Dauer und Ausfallzeit tatsächlich oder geschätzt? */
  durationBasis: z.enum(["actual", "estimate"]).optional().nullable(),
  /** 3.18 Arten der Auswirkungen in den Mitgliedstaaten (Art. 4 RTS). */
  memberStateImpactTypes: z
    .array(z.enum(enumIds(IMPACT_TYPES)))
    .optional()
    .default([]),
  /** 3.19 Beschreibung der Auswirkungen in den betroffenen Mitgliedstaaten. */
  memberStateImpactDescription: optionalText,
  /** 3.20 Betroffene Schutzziele der Daten (Art. 5 RTS). */
  dataLossDimensions: z.array(z.enum(dataLossIds)).optional().default([]),
  /** 3.21 Beschreibung der Datenverluste. */
  dataLossDescription: optionalText,
  /** 3.22 Betroffene kritische Dienste (Art. 6 RTS). */
  criticalServicesDescription: optionalText,
  /** 3.23 Vorfallsart. */
  incidentTypes: z.array(z.enum(enumIds(INCIDENT_TYPES))).optional().default([]),
  /** 3.24 Sonstige Vorfallsart, falls in 3.23 "Sonstiges" gewählt wurde. */
  incidentTypeOther: optionalText,
  /** 3.25 Vom Bedrohungsakteur eingesetzte Bedrohungen und Techniken. */
  threatTechniques: z
    .array(z.enum(enumIds(THREAT_TECHNIQUES)))
    .optional()
    .default([]),
  /** 3.26 Sonstige Technik, falls in 3.25 "Sonstiges" gewählt wurde. */
  threatTechniqueOther: optionalText,
  /** 3.27 Betroffene Funktionsbereiche. */
  functionalAreas: z
    .array(z.enum(enumIds(FUNCTIONAL_AREAS)))
    .optional()
    .default([]),
  /** 3.27 Betroffene Geschäftsprozesse in Klarschrift. */
  affectedProcesses: optionalText,
  /** 3.28 Sind Infrastrukturkomponenten betroffen? */
  infrastructureAffected: z
    .enum(enumIds(INFRASTRUCTURE_ANSWERS))
    .optional()
    .nullable(),
  /** 3.29 Beschreibung der betroffenen Infrastrukturkomponenten. */
  infrastructureDescription: optionalText,
  /** 3.30 Sind die finanziellen Interessen der Kunden betroffen? */
  clientFinancialInterestAffected: z.boolean().optional().default(false),
  /** 3.31 Behörden, die über den Vorfall informiert wurden. */
  notifiedAuthorities: z
    .array(z.enum(enumIds(NOTIFIED_AUTHORITIES)))
    .optional()
    .default([]),
  /** 3.32 Spezifizierung der "anderen" Behörden. */
  notifiedAuthoritiesOther: optionalText,
  /** 3.33 Wurden befristete Maßnahmen ergriffen oder geplant? */
  temporaryMeasuresTaken: z.boolean().optional().default(false),
  /** 3.34 Beschreibung der befristeten Maßnahmen bzw. Grund ihres Ausbleibens. */
  temporaryMeasuresDescription: optionalText,
  /** 3.35 Kompromittierungsindikatoren (nur für Unternehmen im NIS-2-Anwendungsbereich). */
  indicatorsOfCompromise: optionalText,

  /* --- 4 Abschlussmeldung ------------------------------------------------- */

  /** 4.1 Übergeordnete Einstufung der Ursachen. */
  rootCauseCategories: z
    .array(z.enum(enumIds(ROOT_CAUSE_CATEGORIES)))
    .optional()
    .default([]),
  /** 4.2 Detaillierte Einstufung der Ursachen ("kategorie.detail"). */
  rootCauseDetails: z.array(z.string()).optional().default([]),
  /** 4.3 Weitergehende Einstufung der Ursachen ("kategorie.detail.weiter"). */
  rootCauseFurther: z.array(z.string()).optional().default([]),
  /** 4.4 Sonstige Ursache, falls in 4.2 "Sonstiges" gewählt wurde. */
  rootCauseOther: optionalText,
  /** 4.5 Abfolge der Ereignisse und Ursachenanalyse. */
  rootCauseDescription: optionalText,
  /** 4.6 Zusammenfassung der Behebung und gewonnene Erkenntnisse. */
  resolutionSummary: optionalText,
  /** 4.7 Datum und Uhrzeit der Beseitigung der Ursache (UTC). */
  rootCauseAddressedAt: optionalDateTime,
  /** 4.8 Datum und Uhrzeit der Behebung des Vorfalls (UTC). */
  incidentResolvedAt: optionalDateTime,
  /** 4.9 Begründung einer Abweichung vom geplanten Umsetzungsdatum. */
  resolutionDelayReason: optionalText,
  /** 4.10 Risiko für kritische Funktionen zu Abwicklungszwecken. */
  resolutionRisk: z
    .enum(enumIds(RESOLUTION_RISK_ANSWERS))
    .optional()
    .nullable(),
  /** 4.11 Für die Abwicklungsbehörden relevante Informationen. */
  resolutionAuthorityInformation: optionalText,
  /** 4.12 Angaben zur Wesentlichkeitsschwelle "Wirtschaftliche Auswirkungen". */
  economicImpactDescription: optionalText,
  /** 4.13 Bruttobetrag der direkten und indirekten Kosten und Verluste. */
  grossCostsAndLosses: numberText,
  /** 4.14 Betrag der finanziellen Rückflüsse. */
  financialRecoveries: numberText,
  /** 4.15 Haben sich nicht schwerwiegende Vorfälle wiederholt (Art. 8 Abs. 2 RTS)? */
  recurringIncidents: z.boolean().optional().default(false),
  /** 4.15 Anzahl der wiederholten Vorfälle. */
  recurringIncidentCount: numberText,
  /** 4.16 Datum und Uhrzeit des ersten wiederkehrenden Vorfalls (UTC). */
  firstRecurringIncidentAt: optionalDateTime,

  /* --- Angaben der Anwendung (nicht Teil des Meldeformulars) -------------- */

  /** Einstufung aus Schritt 02; steuert die Meldepflicht. */
  classification: z.enum(classificationIds),
  /** Empfängerin der Meldung laut Unternehmensprofil. */
  competentAuthority: optionalText,
  /** Freiwillige Meldung ohne Meldepflicht (Art. 19 Abs. 2 DORA). */
  voluntary: z.boolean().optional().default(false),
});

export type ReportInput = z.infer<typeof reportInputSchema>;

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
  reportType: z.enum(reportTypeIds),
  /**
   * "simulated": Die Meldung wurde nicht übermittelt. Ein echter Konnektor
   * würde hier den von der Behörde bestätigten Status liefern.
   */
  status: z.literal("simulated"),
  /** Bezeichnung des (simulierten) Übertragungswegs. */
  channel: z.string(),
  /** Fristen, die nach dieser Meldung noch laufen. */
  nextDeadlines: z.array(reportDeadlineSchema),
  institutionName: z.string(),
  /** Empfängerin der Meldung laut Unternehmensprofil. */
  competentAuthority: optionalText,
  /** Referenzcode des Vorfalls aus Feld 2.1. */
  incidentReference: z.string(),
});

export type ReportReceipt = z.infer<typeof reportReceiptSchema>;
