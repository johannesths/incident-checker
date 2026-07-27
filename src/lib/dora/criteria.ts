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
      "Anzahl und Anteil betroffener Kunden und finanzieller Gegenparteien sowie Anzahl und Wert betroffener Transaktionen (Art. 1, Art. 9 Abs. 1 RTS). Die Schwelle ist erreicht, sobald eine der Bedingungen erfüllt ist.",
    thresholds: [
      "> 10 % aller Kunden, die den betroffenen Dienst nutzen (Buchst. a)",
      "> 100.000 betroffene Kunden (Buchst. b)",
      "> 30 % aller finanziellen Gegenparteien mit Tätigkeiten im Zusammenhang mit dem betroffenen Dienst (Buchst. c)",
      "> 10 % der durchschnittlichen täglichen Transaktionsanzahl des betroffenen Dienstes (Buchst. d)",
      "> 10 % des durchschnittlichen täglichen Transaktionswerts des betroffenen Dienstes (Buchst. e)",
      "Als relevant identifizierte Kunden oder Gegenparteien betroffen (Art. 1 Abs. 3, Buchst. f)",
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
      "Beeinträchtigung von Verfügbarkeit, Authentizität, Integrität oder Vertraulichkeit von Daten (Art. 5 RTS). Die Schwelle ist nur erreicht, wenn die Beeinträchtigung nachteilige Auswirkungen auf die Umsetzung der Geschäftsziele oder die Erfüllung regulatorischer Anforderungen hat oder haben wird (Art. 9 Abs. 5 Buchst. a).",
    thresholds: [
      "Beeinträchtigung von Verfügbarkeit, Authentizität, Integrität oder Vertraulichkeit von Daten …",
      "… mit nachteiligen Auswirkungen auf Geschäftsziele oder regulatorische Anforderungen (Art. 9 Abs. 5 Buchst. a)",
      "Böswilliger unbefugter Zugriff mit möglichem Datenverlust (Art. 9 Abs. 5 Buchst. b) – führt über Art. 8 Abs. 1 Buchst. a unmittelbar zur Einstufung als schwerwiegend",
    ],
  },
  {
    id: "critical_services",
    label: "Kritikalität der betroffenen Dienste",
    description:
      "Erfüllt, wenn mindestens einer der drei Tatbestände des Art. 6 RTS vorliegt. Ohne erfülltes Kritikalitätskriterium liegt nie ein schwerwiegender Vorfall vor (Art. 8 Abs. 1 RTS).",
    thresholds: [
      "IKT-Dienste oder Netzwerk-/Informationssysteme betroffen, die kritische oder wichtige Funktionen unterstützen (Art. 6 Buchst. a)",
      "Zulassungs- bzw. registrierungspflichtige oder beaufsichtigte Finanzdienstleistungen betroffen (Art. 6 Buchst. b)",
      "Erfolgreicher böswilliger unbefugter Zugriff auf Netzwerk-/Informationssysteme (Art. 6 Buchst. c)",
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
 * Datenschutzdimensionen für das Kriterium "Datenverluste" (Art. 5 RTS). Eine
 * strukturierte Auswahl statt Freitext, damit nur eine tatsächliche
 * Beeinträchtigung die Materialitätsschwelle auslöst – nicht eine beliebige
 * Dokumentationsnotiz. Die Schwelle erfordert zusätzlich nachteilige
 * Auswirkungen auf Geschäftsziele oder regulatorische Anforderungen
 * (Art. 9 Abs. 5 Buchst. a RTS).
 */
export const DATA_LOSS_DIMENSIONS = [
  {
    id: "availability",
    label: "Verfügbarkeit",
    hint: "Daten sind vorübergehend oder dauerhaft nicht zugänglich oder nutzbar (Art. 5 Buchst. a RTS).",
  },
  {
    id: "integrity",
    label: "Integrität",
    hint: "Nicht autorisierte Veränderung; Daten sind unrichtig oder unvollständig (Art. 5 Buchst. c RTS).",
  },
  {
    id: "authenticity",
    label: "Authentizität",
    hint: "Vertrauenswürdigkeit der Datenquelle ist beeinträchtigt (Art. 5 Buchst. b RTS).",
  },
  {
    id: "confidentiality",
    label: "Vertraulichkeit",
    hint: "Zugriff durch oder Offenlegung gegenüber unbefugten Parteien oder Systemen (Art. 5 Buchst. d RTS).",
  },
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
  /** Anteil betroffener Kunden in Prozent der Nutzer des betroffenen Dienstes. */
  clientsPercent: 10,
  /** Absolute Anzahl betroffener Kunden. */
  clientsAbsolute: 100_000,
  /** Anteil betroffener finanzieller Gegenparteien in Prozent. */
  counterpartsPercent: 30,
  /** Anteil der betroffenen Transaktionen an der durchschnittlichen täglichen Transaktionsanzahl in Prozent. */
  transactionsCountPercent: 10,
  /** Anteil des betroffenen Transaktionswerts am durchschnittlichen täglichen Transaktionswert in Prozent. */
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
