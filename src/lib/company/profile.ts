import { z } from "zod";

/**
 * Unternehmensprofil des Finanzunternehmens, das die Anwendung einsetzt.
 *
 * Die Angaben sind Stammdaten: Sie ändern sich nicht von Vorfall zu Vorfall,
 * gehen aber in jede Meldung ein (Art. 19 DORA i. V. m. den Meldevorlagen der
 * Aufsicht) und liefern der Schweregradbestimmung die betrieblichen
 * Referenzwerte. Sie werden deshalb einmal in den Einstellungen gepflegt und
 * von dort in die Formulare übernommen.
 *
 * In dieser Demo ist das Profil mit einem frei erfundenen Unternehmen
 * vorbelegt und liegt ausschließlich im Browser; ein Produktivsystem würde es
 * aus dem Unternehmensverzeichnis beziehen.
 */

/**
 * Arten von Finanzunternehmen im Anwendungsbereich der DORA
 * (Art. 2 Abs. 1 VO (EU) 2022/2554, gekürzt auf die geläufigen Kategorien).
 */
export const ENTITY_TYPES = [
  { id: "credit_institution", label: "Kreditinstitut" },
  { id: "payment_institution", label: "Zahlungsinstitut" },
  { id: "emoney_institution", label: "E-Geld-Institut" },
  { id: "investment_firm", label: "Wertpapierfirma" },
  { id: "asset_manager", label: "Kapitalverwaltungsgesellschaft" },
  { id: "insurance", label: "Versicherungsunternehmen" },
  { id: "csd", label: "Zentralverwahrer" },
  { id: "trading_venue", label: "Handelsplatz" },
  { id: "crypto_provider", label: "Kryptowerte-Dienstleister" },
  { id: "other", label: "Sonstiges Finanzunternehmen" },
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number]["id"];

export const ENTITY_TYPE_BY_ID: Record<
  EntityType,
  (typeof ENTITY_TYPES)[number]
> = Object.fromEntries(ENTITY_TYPES.map((t) => [t.id, t])) as Record<
  EntityType,
  (typeof ENTITY_TYPES)[number]
>;

const entityTypeIds = ENTITY_TYPES.map((t) => t.id) as [
  EntityType,
  ...EntityType[],
];

/**
 * Zahlenangaben liegen als Text vor – wie in den Formularen der Anwendung,
 * damit ein leeres Feld ("keine Angabe") von einer 0 unterscheidbar bleibt.
 * Für die Auswertung siehe profileNumber().
 */
export const companyProfileSchema = z.object({
  /* Identifikation */
  name: z.string(),
  legalForm: z.string(),
  entityType: z.enum(entityTypeIds),
  /** Rechtsträgerkennung (Legal Entity Identifier), 20 alphanumerische Zeichen. */
  lei: z.string(),
  /** Unternehmensnummer bei der Aufsicht (BaFin-ID). */
  bafinId: z.string(),

  /* Sitz und Aufsicht */
  street: z.string(),
  postalCode: z.string(),
  city: z.string(),
  country: z.string(),
  /** Herkunftsmitgliedstaat – bestimmt die zuständige Behörde. */
  homeMemberState: z.string(),
  competentAuthority: z.string(),

  /* Ansprechpartner für die Aufsicht */
  contactName: z.string(),
  contactRole: z.string(),
  contactEmail: z.string(),
  contactPhone: z.string(),

  /* Referenzwerte für die Klassifizierung (Art. 1, Art. 4 RTS) */
  /** Kunden des Unternehmens insgesamt. */
  totalClients: z.string(),
  /** Durchschnittliche tägliche Transaktionsanzahl. */
  dailyTransactionsCount: z.string(),
  /** Durchschnittlicher täglicher Transaktionswert in EUR. */
  dailyTransactionsValueEur: z.string(),
  /** Mitgliedstaaten, in denen das Unternehmen tätig ist. */
  memberStatesOfOperation: z.string(),

  /* Meldewesen */
  /** Präfix der internen Vorfallreferenzen, z. B. "INC-". */
  incidentReferencePrefix: z.string(),
});

export type CompanyProfile = z.infer<typeof companyProfileSchema>;

/**
 * Beispielunternehmen für die Vorführung. Sämtliche Angaben sind frei
 * erfunden – Name, LEI, BaFin-ID und Kontaktdaten gehören keinem realen
 * Unternehmen, die E-Mail-Adresse nutzt die für Beispiele reservierte
 * Top-Level-Domain .example.
 */
export const DEMO_COMPANY_PROFILE: CompanyProfile = {
  name: "Musterbank AG",
  legalForm: "Aktiengesellschaft",
  entityType: "credit_institution",
  lei: "529900MUSTERBANK0001",
  bafinId: "10123456",

  street: "Musterallee 1",
  postalCode: "60311",
  city: "Frankfurt am Main",
  country: "Deutschland",
  homeMemberState: "Deutschland",
  competentAuthority:
    "Bundesanstalt für Finanzdienstleistungsaufsicht (BaFin)",

  contactName: "Jana Musterfrau",
  contactRole: "Leiterin IKT-Risikomanagement",
  contactEmail: "ikt-meldewesen@musterbank.example",
  contactPhone: "+49 69 1234-5678",

  totalClients: "640000",
  dailyTransactionsCount: "1250000",
  dailyTransactionsValueEur: "480000000",
  memberStatesOfOperation: "3",

  incidentReferencePrefix: "INC-",
};

/**
 * Ergänzt einen gespeicherten Stand um zwischenzeitlich neue Felder und fängt
 * unbrauchbare Inhalte ab. Fehlende Felder kommen aus dem Demo-Profil, gesetzte
 * – auch leere – bleiben erhalten.
 */
export function normalizeProfile(stored: unknown): CompanyProfile {
  if (!stored || typeof stored !== "object") return DEMO_COMPANY_PROFILE;
  const parsed = companyProfileSchema.safeParse({
    ...DEMO_COMPANY_PROFILE,
    ...(stored as Partial<CompanyProfile>),
  });
  return parsed.success ? parsed.data : DEMO_COMPANY_PROFILE;
}

/** Zahl aus einem Profilfeld; null, wenn nichts oder Unbrauchbares hinterlegt ist. */
export function profileNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const numberFormat = new Intl.NumberFormat("de-DE");

/** Formatierte Zahl aus einem Profilfeld; null, wenn keine Zahl hinterlegt ist. */
export function formatProfileNumber(value: string): string | null {
  const parsed = profileNumber(value);
  return parsed === null ? null : numberFormat.format(parsed);
}

/** Anschrift einzeilig, ohne leere Bestandteile. */
export function formatAddress(profile: CompanyProfile): string {
  const place = [profile.postalCode, profile.city].filter(Boolean).join(" ");
  return [profile.street, place, profile.country].filter(Boolean).join(", ");
}

/** Klartextbezeichnung der Art des Finanzunternehmens. */
export function entityTypeLabel(profile: CompanyProfile): string {
  return ENTITY_TYPE_BY_ID[profile.entityType].label;
}
