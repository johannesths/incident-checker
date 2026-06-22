import { z } from "zod";
import { DORA_CRITERIA, type CriterionId } from "@/lib/dora/criteria";

const criterionIds = DORA_CRITERIA.map((c) => c.id) as [CriterionId, ...CriterionId[]];

/* ---------------------------------------------------------------------------
 * Funktion 1: Triage – Handelt es sich um einen IKT-Vorfall?
 * ------------------------------------------------------------------------- */

export const triageInputSchema = z.object({
  /** Freitextbeschreibung des möglichen Vorfalls. */
  description: z.string().min(10, "Bitte beschreiben Sie den Vorfall (mind. 10 Zeichen)."),
  /** Betroffenes System / betroffener Dienst. */
  affectedSystem: z.string().min(1, "Bitte geben Sie das betroffene System an."),
  /** Wer hat den Vorfall gemeldet? */
  reportedBy: z.string().min(1, "Bitte geben Sie an, wer gemeldet hat."),
  /** Beobachtete Symptome / Auswirkungen. */
  symptoms: z.string().optional().default(""),
});

export type TriageInput = z.infer<typeof triageInputSchema>;

export const triageResultSchema = z.object({
  /** Einschätzung, ob es sich um einen IKT-Vorfall handelt. */
  isIncident: z.boolean(),
  /** Empfohlenes weiteres Vorgehen, z. B. "Kein IKT-Vorfall – ServiceDesk ist verantwortlich." */
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
  /** Anzahl betroffener Transaktionen. */
  transactionsAffected: z.coerce.number().min(0).optional(),
  durationHours: z.coerce.number().min(0).optional(),
  downtimeHours: z.coerce.number().min(0).optional(),
  memberStatesAffected: z.coerce.number().int().min(0).optional(),
  /** Qualitative Beschreibung etwaiger Datenverluste. */
  dataLosses: z.string().optional().default(""),
  criticalServicesAffected: z.boolean().optional().default(false),
  /** Qualitative Beschreibung der Reputationsauswirkung. */
  reputationalImpact: z.string().optional().default(""),
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
