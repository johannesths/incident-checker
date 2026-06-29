import { z } from "zod";
import {
  DORA_CRITERIA,
  DATA_LOSS_DIMENSIONS,
  type CriterionId,
  type DataLossDimension,
} from "@/lib/dora/criteria";

const criterionIds = DORA_CRITERIA.map((c) => c.id) as [CriterionId, ...CriterionId[]];

const dataLossIds = DATA_LOSS_DIMENSIONS.map((d) => d.id) as [
  DataLossDimension,
  ...DataLossDimension[],
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
  /** Anzahl betroffener Kunden (absolut). */
  clientsAffected: z.coerce.number().min(0).optional(),
  /** Anteil betroffener Kunden in Prozent. */
  clientsAffectedPercent: z.coerce.number().min(0).max(100).optional(),
  /** Anteil des betroffenen täglichen Transaktionswerts in Prozent. */
  transactionsValuePercent: z.coerce.number().min(0).max(100).optional(),
  durationHours: z.coerce.number().min(0).optional(),
  downtimeHours: z.coerce.number().min(0).optional(),
  memberStatesAffected: z.coerce.number().int().min(0).optional(),
  /** Betroffene Datenschutzdimensionen (Verfügbarkeit/Integrität/Authentizität/Vertraulichkeit). */
  dataLossDimensions: z.array(z.enum(dataLossIds)).optional().default([]),
  criticalServicesAffected: z.boolean().optional().default(false),
  /**
   * Böswilliger unbefugter Zugriff auf die Netzwerk- und Informationssysteme,
   * der zu Datenverlusten führen kann. Erzwingt – bei betroffener kritischer
   * Funktion – die Einstufung als schwerwiegend.
   */
  maliciousUnauthorizedAccess: z.boolean().optional().default(false),
  /** Stufe der Reputationsauswirkung – nur "significant" erreicht die Schwelle. */
  reputationalImpactLevel: z
    .enum(["none", "low", "significant"])
    .optional()
    .default("none"),
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
