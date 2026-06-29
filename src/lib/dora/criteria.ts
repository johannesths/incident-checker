/**
 * DORA-Klassifizierungskriterien für schwerwiegende IKT-bezogene Vorfälle.
 *
 * Grundlage: DORA (VO (EU) 2022/2554), Art. 18, sowie die zugehörigen
 * Regulatorischen Technischen Standards (RTS) zur Klassifizierung
 * IKT-bezogener Vorfälle (Delegierte VO (EU) 2024/1772).
 *
 * HINWEIS: Die hier hinterlegten Schwellenwerte sind als auditierbare,
 * explizite Regelbasis gedacht. Vor dem Produktiveinsatz müssen sie gegen
 * den aktuellen Verordnungstext und ggf. nationale Vorgaben verifiziert
 * werden. Die KI-Schicht bewertet später ANHAND dieser Kriterien – sie
 * erfindet keine eigenen Schwellenwerte.
 */

export type CriterionId =
  | "clients_transactions"
  | "reputational_impact"
  | "duration_downtime"
  | "geographical_spread"
  | "data_losses"
  | "critical_services"
  | "economic_impact";

export interface DoraCriterion {
  id: CriterionId;
  /** Kurzbezeichnung für die UI. */
  label: string;
  /** Erläuterung, was unter diesem Kriterium zu prüfen ist. */
  description: string;
  /** Beispielhafte Materialitätsschwellen (verifizierungsbedürftig). */
  thresholds: string[];
}

export const DORA_CRITERIA: DoraCriterion[] = [
  {
    id: "clients_transactions",
    label: "Betroffene Kunden, Gegenparteien und Transaktionen",
    description:
      "Anzahl und Anteil betroffener Kunden bzw. finanzieller Gegenparteien sowie betroffener Transaktionen und deren Wert.",
    thresholds: [
      "> 10 % aller Kunden betroffen",
      "> 100.000 betroffene Kunden",
      "> 10 % des täglichen Transaktionswerts betroffen",
    ],
  },
  {
    id: "reputational_impact",
    label: "Reputationsauswirkung",
    description:
      "Sichtbarkeit des Vorfalls in den Medien, Beschwerden von Kunden/Gegenparteien, mögliche Verstöße gegen regulatorische Pflichten.",
    thresholds: [
      "Medienberichterstattung",
      "Wiederholte Beschwerden zentraler Kunden/Gegenparteien",
      "Nichterfüllung regulatorischer Anforderungen droht",
    ],
  },
  {
    id: "duration_downtime",
    label: "Dauer und Ausfallzeit",
    description:
      "Gesamtdauer des Vorfalls und Ausfallzeit der betroffenen IKT-Dienste.",
    thresholds: ["Dauer > 24 Stunden", "Ausfallzeit > 2 Stunden bei kritischen Diensten"],
  },
  {
    id: "geographical_spread",
    label: "Geografische Ausbreitung",
    description:
      "Anzahl der betroffenen Mitgliedstaaten, insbesondere Auswirkungen in mehr als einem Mitgliedstaat.",
    thresholds: ["Auswirkungen in ≥ 2 Mitgliedstaaten"],
  },
  {
    id: "data_losses",
    label: "Datenverluste",
    description:
      "Beeinträchtigung von Verfügbarkeit, Authentizität, Integrität oder Vertraulichkeit von Daten.",
    thresholds: [
      "Verlust der Datenverfügbarkeit",
      "Beeinträchtigung von Integrität/Authentizität",
      "Verletzung der Vertraulichkeit",
    ],
  },
  {
    id: "critical_services",
    label: "Kritikalität der betroffenen Dienste",
    description:
      "Betroffenheit kritischer oder wichtiger Funktionen bzw. meldepflichtiger Aktivitäten.",
    thresholds: [
      "Kritischer oder wichtiger Dienst betroffen",
      "Erfolgreicher unbefugter Zugriff auf Netzwerk-/Informationssysteme",
    ],
  },
  {
    id: "economic_impact",
    label: "Wirtschaftliche Auswirkung",
    description:
      "Absolute und relative Höhe der direkten und indirekten Kosten und Verluste durch den Vorfall.",
    thresholds: ["Kosten/Verluste > 100.000 EUR (absolut)"],
  },
];

export const CRITERION_BY_ID: Record<CriterionId, DoraCriterion> = Object.fromEntries(
  DORA_CRITERIA.map((c) => [c.id, c]),
) as Record<CriterionId, DoraCriterion>;

/**
 * Datenschutzdimensionen für das Kriterium "Datenverluste". Eine strukturierte
 * Auswahl statt Freitext, damit nur eine tatsächliche Beeinträchtigung die
 * Materialitätsschwelle auslöst – nicht eine beliebige Dokumentationsnotiz.
 */
export const DATA_LOSS_DIMENSIONS = [
  { id: "availability", label: "Verfügbarkeit" },
  { id: "integrity", label: "Integrität" },
  { id: "authenticity", label: "Authentizität" },
  { id: "confidentiality", label: "Vertraulichkeit" },
] as const;

export type DataLossDimension = (typeof DATA_LOSS_DIMENSIONS)[number]["id"];

/**
 * Stufen der Reputationsauswirkung. Nur "significant" (erheblich) erreicht die
 * Materialitätsschwelle.
 */
export const REPUTATION_LEVELS = [
  { id: "none", label: "Keine" },
  { id: "low", label: "Gering" },
  { id: "significant", label: "Erheblich" },
] as const;

export type ReputationLevel = (typeof REPUTATION_LEVELS)[number]["id"];

/**
 * Numerische Materialitätsschwellen für die regelbasierte (Mock-)Bewertung.
 *
 * ACHTUNG: Illustrative Werte – vor Produktiveinsatz gegen den aktuellen
 * DORA-RTS (Delegierte VO (EU) 2024/1772) zu verifizieren.
 */
export const DORA_THRESHOLDS = {
  /** Anteil betroffener Kunden in Prozent. */
  clientsPercent: 10,
  /** Absolute Anzahl betroffener Kunden. */
  clientsAbsolute: 100_000,
  /** Anteil des betroffenen täglichen Transaktionswerts in Prozent. */
  transactionsValuePercent: 10,
  /** Gesamtdauer des Vorfalls in Stunden. */
  durationHours: 24,
  /** Ausfallzeit in Stunden. */
  downtimeHours: 2,
  /** Anzahl betroffener Mitgliedstaaten. */
  memberStates: 2,
  /** Wirtschaftlicher Schaden in EUR. */
  economicImpactEur: 100_000,
} as const;
