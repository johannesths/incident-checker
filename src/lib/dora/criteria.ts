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
      "Kritische oder wichtige Funktion betroffen",
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
