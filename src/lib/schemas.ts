import { z } from "zod";
import {
  DORA_CRITERIA,
  DATA_LOSS_DIMENSIONS,
  REPUTATION_CONDITIONS,
  type CriterionId,
  type DataLossDimension,
  type ReputationCondition,
} from "@/lib/dora/criteria";

const criterionIds = DORA_CRITERIA.map((c) => c.id) as [CriterionId, ...CriterionId[]];

const dataLossIds = DATA_LOSS_DIMENSIONS.map((d) => d.id) as [
  DataLossDimension,
  ...DataLossDimension[],
];

const reputationIds = REPUTATION_CONDITIONS.map((c) => c.id) as [
  ReputationCondition,
  ...ReputationCondition[],
];

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
  durationHours: z.coerce.number().min(0).optional(),
  downtimeHours: z.coerce.number().min(0).optional(),
  memberStatesAffected: z.coerce.number().int().min(0).optional(),
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
  classification: z.enum(["major", "non_major", "indeterminate"]),
  /** Befunde je Einzelkriterium. */
  findings: z.array(criterionFindingSchema),
  /** Zusammenfassende Begründung. */
  summary: z.string(),
  confidence: z.number().min(0).max(1),
});

export type SeverityResult = z.infer<typeof severityResultSchema>;
