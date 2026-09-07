/**
 * Datenfelder der Vorfallmeldung nach dem Meldeformular der Aufsicht.
 *
 * Grundlage: Durchführungsverordnung (EU) 2025/302 (ITS zu Art. 20 Buchst. b
 * DORA), Anhang I (Meldevorlage) und Anhang II (Datenglossar), sowie die
 * "Inhaltlichen Hinweise" der BaFin zum Meldeformular in der Melde- und
 * Veröffentlichungsplattform (MVP).
 *
 * Die Feldnummern (1.1–1.15, 2.1–2.10, 3.1–3.35, 4.1–4.16) sind die des
 * amtlichen Formulars und werden in der Oberfläche mitgeführt: Wer die Meldung
 * anschließend in der MVP erfasst, findet jede Angabe an derselben Nummer
 * wieder.
 *
 * HINWEIS: Wie die Klassifizierungskriterien ist dieser Katalog eine
 * explizite, auditierbare Regelbasis. Vor dem Produktiveinsatz ist er gegen
 * den aktuellen ITS-Text und die jeweils gültige Fassung der BaFin-Hinweise zu
 * verifizieren.
 */

/* ---------------------------------------------------------------------------
 * Abschnitte des Meldeformulars
 * ------------------------------------------------------------------------- */

export type ReportSection = 1 | 2 | 3 | 4;

export const REPORT_SECTIONS: Record<ReportSection, { title: string }> = {
  1: { title: "Allgemeine Informationen" },
  2: { title: "Erstmeldung" },
  3: { title: "Zwischenmeldung" },
  4: { title: "Abschlussmeldung" },
};

/* ---------------------------------------------------------------------------
 * Feld 2.7 – Entdeckung des Vorfalls
 * ------------------------------------------------------------------------- */

export const DETECTION_SOURCES = [
  { id: "it_security", label: "IT-Sicherheit" },
  { id: "staff", label: "Personal" },
  { id: "internal_audit", label: "Interne Revision" },
  { id: "external_audit", label: "Externe Prüfung" },
  { id: "clients", label: "Kunden" },
  { id: "counterparts", label: "Finanzielle Gegenparteien" },
  { id: "third_party", label: "Drittdienstleister" },
  { id: "attacker", label: "Angreifer" },
  { id: "monitoring", label: "Überwachungssysteme" },
  { id: "authority", label: "Behörde/Strafverfolgung" },
  { id: "other", label: "Sonstiges" },
] as const;

export type DetectionSource = (typeof DETECTION_SOURCES)[number]["id"];

/* ---------------------------------------------------------------------------
 * Feld 2.6 – Betroffene EWR-Mitgliedstaaten (ISO 3166 ALPHA-2)
 * ------------------------------------------------------------------------- */

export const MEMBER_STATES = [
  { id: "AT", label: "Österreich" },
  { id: "BE", label: "Belgien" },
  { id: "BG", label: "Bulgarien" },
  { id: "CY", label: "Zypern" },
  { id: "CZ", label: "Tschechien" },
  { id: "DE", label: "Deutschland" },
  { id: "DK", label: "Dänemark" },
  { id: "EE", label: "Estland" },
  { id: "ES", label: "Spanien" },
  { id: "FI", label: "Finnland" },
  { id: "FR", label: "Frankreich" },
  { id: "GR", label: "Griechenland" },
  { id: "HR", label: "Kroatien" },
  { id: "HU", label: "Ungarn" },
  { id: "IE", label: "Irland" },
  { id: "IS", label: "Island" },
  { id: "IT", label: "Italien" },
  { id: "LI", label: "Liechtenstein" },
  { id: "LT", label: "Litauen" },
  { id: "LU", label: "Luxemburg" },
  { id: "LV", label: "Lettland" },
  { id: "MT", label: "Malta" },
  { id: "NL", label: "Niederlande" },
  { id: "NO", label: "Norwegen" },
  { id: "PL", label: "Polen" },
  { id: "PT", label: "Portugal" },
  { id: "RO", label: "Rumänien" },
  { id: "SE", label: "Schweden" },
  { id: "SI", label: "Slowenien" },
  { id: "SK", label: "Slowakei" },
] as const;

export type MemberState = (typeof MEMBER_STATES)[number]["id"];

export const MEMBER_STATE_BY_ID: Record<
  MemberState,
  (typeof MEMBER_STATES)[number]
> = Object.fromEntries(MEMBER_STATES.map((s) => [s.id, s])) as Record<
  MemberState,
  (typeof MEMBER_STATES)[number]
>;

/* ---------------------------------------------------------------------------
 * Feld 3.12 / 3.17 – Tatsächliche oder geschätzte Werte
 * ------------------------------------------------------------------------- */

export const FIGURE_BASES = [
  { id: "actual", label: "Tatsächliche Zahlen" },
  { id: "estimate", label: "Schätzungen" },
  { id: "no_impact", label: "Keine Auswirkungen" },
] as const;

export type FigureBasis = (typeof FIGURE_BASES)[number]["id"];

/** Feld 3.17 kennt keine Option "keine Auswirkungen". */
export const DURATION_BASES = FIGURE_BASES.filter((b) => b.id !== "no_impact");

/* ---------------------------------------------------------------------------
 * Feld 3.18 – Arten der Auswirkungen in den Mitgliedstaaten (Art. 4 RTS)
 * ------------------------------------------------------------------------- */

export const IMPACT_TYPES = [
  { id: "clients", label: "Kunden" },
  { id: "counterparts", label: "Finanzielle Gegenparteien" },
  { id: "branches", label: "Zweigniederlassungen" },
  { id: "group_entities", label: "Gruppenunternehmen" },
  { id: "market_infrastructure", label: "Finanzmarktinfrastrukturen" },
  { id: "third_parties", label: "Drittdienstleister" },
] as const;

export type ImpactType = (typeof IMPACT_TYPES)[number]["id"];

/* ---------------------------------------------------------------------------
 * Feld 3.23 – Vorfallsart
 * ------------------------------------------------------------------------- */

export const INCIDENT_TYPES = [
  {
    id: "cybersecurity",
    label: "Cybersicherheitsbezogen",
    hint: "Bei einem Angriff – auch auf einen Dienstleister – stets auszuwählen.",
  },
  { id: "process_failure", label: "Prozessversagen" },
  { id: "system_failure", label: "Systemversagen" },
  {
    id: "external_event",
    label: "Externes Ereignis",
    hint: "Stets auszuwählen, wenn der Vorfall bei einem Dritten aufgetreten ist.",
  },
  {
    id: "payment_related",
    label: "Zahlungsbezogen",
    hint: "Bei Zahlungsvorfällen stets auszuwählen.",
  },
  { id: "other", label: "Sonstiges" },
] as const;

export type IncidentType = (typeof INCIDENT_TYPES)[number]["id"];

/* ---------------------------------------------------------------------------
 * Feld 3.25 – Bedrohungen und Techniken des Angreifers
 * ------------------------------------------------------------------------- */

export const THREAT_TECHNIQUES = [
  { id: "social_engineering", label: "Social Engineering (inkl. Phishing)" },
  { id: "ddos", label: "(D)DoS" },
  { id: "identity_theft", label: "Identitätsdiebstahl" },
  {
    id: "data_encryption",
    label: "Datenverschlüsselung (inkl. Ransomware)",
  },
  { id: "resource_hijacking", label: "Kaperung von Ressourcen" },
  {
    id: "data_exfiltration",
    label: "Datenexfiltration und -manipulation",
  },
  { id: "data_destruction", label: "Datenvernichtung" },
  { id: "defacement", label: "Mutwillige Veränderung (Defacement)" },
  { id: "supply_chain", label: "Lieferkettenangriff" },
  { id: "other", label: "Sonstiges" },
] as const;

export type ThreatTechnique = (typeof THREAT_TECHNIQUES)[number]["id"];

/* ---------------------------------------------------------------------------
 * Feld 3.27 – Betroffene Funktionsbereiche
 * ------------------------------------------------------------------------- */

export const FUNCTIONAL_AREAS = [
  { id: "marketing", label: "Marketing und Geschäftsentwicklung" },
  { id: "client_service", label: "Kundenservice" },
  { id: "product_management", label: "Produktmanagement" },
  { id: "compliance", label: "Rechtskonformität" },
  { id: "risk_management", label: "Risikomanagement" },
  { id: "finance", label: "Finanz- und Rechnungswesen" },
  { id: "hr", label: "Personal und allgemeine Dienstleistungen" },
  { id: "it", label: "Informationstechnologie" },
] as const;

export type FunctionalArea = (typeof FUNCTIONAL_AREAS)[number]["id"];

/* ---------------------------------------------------------------------------
 * Feld 3.28 – Betroffene Infrastrukturkomponenten
 * ------------------------------------------------------------------------- */

export const INFRASTRUCTURE_ANSWERS = [
  { id: "yes", label: "Ja" },
  { id: "no", label: "Nein" },
  { id: "unknown", label: "Keine Informationen verfügbar" },
] as const;

export type InfrastructureAnswer = (typeof INFRASTRUCTURE_ANSWERS)[number]["id"];

/* ---------------------------------------------------------------------------
 * Feld 3.31 – Meldung an andere Behörden
 * ------------------------------------------------------------------------- */

export const NOTIFIED_AUTHORITIES = [
  { id: "law_enforcement", label: "Polizei/Strafverfolgung" },
  { id: "csirt", label: "CSIRT" },
  { id: "data_protection", label: "Datenschutzbehörde" },
  { id: "cyber_agency", label: "Nationale Cybersicherheitsbehörde" },
  { id: "none", label: "Keine" },
  { id: "other", label: "Andere" },
] as const;

export type NotifiedAuthority = (typeof NOTIFIED_AUTHORITIES)[number]["id"];

/* ---------------------------------------------------------------------------
 * Felder 4.1–4.3 – Einstufung der Ursachen
 *
 * Dreistufig: übergeordnete Kategorie (4.1), detaillierte Kategorie (4.2) und
 * – nur für vier Kategorien des Prozessversagens – die weitergehende
 * Einstufung (4.3).
 * ------------------------------------------------------------------------- */

export interface RootCauseDetail {
  id: string;
  label: string;
  /** Weitergehende Einstufung (4.3); Pflichtangabe, sobald vorhanden. */
  further?: readonly { id: string; label: string }[];
}

export interface RootCauseCategoryDef {
  id: string;
  label: string;
  details: readonly RootCauseDetail[];
}

export const ROOT_CAUSE_CATEGORIES = [
  {
    id: "malicious_actions",
    label: "Böswillige Handlungen",
    details: [
      { id: "intentional_internal", label: "Vorsätzliche interne Handlungen" },
      {
        id: "physical_damage",
        label: "Vorsätzliche physische Schäden/Manipulation/Diebstahl",
      },
      { id: "fraud", label: "Betrügerische Handlungen" },
    ],
  },
  {
    id: "process_failure",
    label: "Prozessversagen",
    details: [
      {
        id: "monitoring",
        label: "Unzureichende Überwachung und Kontrolle",
        further: [
          { id: "policy_compliance", label: "Überwachung der Einhaltung von Richtlinien" },
          { id: "third_party", label: "Überwachung von Drittdienstleistern" },
          { id: "vulnerability", label: "Überwachung der Behebung von Schwachstellen" },
          { id: "iam", label: "Identitäts- und Zugangsmanagement" },
          { id: "crypto", label: "Verschlüsselung und Kryptografie" },
          { id: "logging", label: "Protokollierung" },
        ],
      },
      { id: "roles", label: "Unzureichende/unklare Rollen und Zuständigkeiten" },
      {
        id: "risk_management",
        label: "Versagen des IKT-Risikomanagementprozesses",
        further: [
          { id: "risk_tolerance", label: "Keine genauen Risikotoleranzen festgelegt" },
          { id: "threat_assessment", label: "Unzureichende Bedrohungs- und Schwachstellenbewertung" },
          { id: "risk_treatment", label: "Unzureichende Maßnahmen zur Risikobehandlung" },
          { id: "residual_risk", label: "Unzureichendes Management der IKT-Restrisiken" },
        ],
      },
      {
        id: "ict_operations",
        label: "Unzureichende IKT- und IKT-Sicherheitsabläufe",
        further: [
          { id: "patch", label: "Schwachstellen- und Patch-Management" },
          { id: "change", label: "Änderungsmanagement" },
          { id: "capacity", label: "Kapazitäts- und Leistungsmanagement" },
          { id: "asset", label: "IKT-Asset-Management und Informationsklassifizierung" },
          { id: "backup", label: "Sicherung und Wiederherstellung" },
          { id: "error_handling", label: "Fehlerbehandlung" },
        ],
      },
      { id: "project_management", label: "Unzureichendes IKT-Projektmanagement" },
      {
        id: "policies",
        label: "Unzureichende interne Richtlinien, Verfahren und Dokumentation",
      },
      {
        id: "procurement",
        label: "Unzureichende Beschaffung, Entwicklung und Wartung von IKT-Systemen",
        further: [
          {
            id: "procurement_development",
            label: "Unzureichende Beschaffung, Entwicklung und Wartung",
          },
          { id: "software_testing", label: "Unzureichende oder fehlgeschlagene Software-Tests" },
        ],
      },
      { id: "other", label: "Sonstiges" },
    ],
  },
  {
    id: "system_failure",
    label: "Systemversagen/-störung",
    details: [
      { id: "hardware_capacity", label: "Hardwarekapazität und -leistung" },
      { id: "hardware_maintenance", label: "Wartung der Hardware" },
      { id: "hardware_obsolescence", label: "Veralterung/Alterung der Hardware" },
      { id: "software_configuration", label: "Softwarekompatibilität/-konfiguration" },
      { id: "software_performance", label: "Softwareleistung" },
      { id: "network_configuration", label: "Netzwerkkonfiguration" },
      { id: "physical_damage", label: "Physische Schäden" },
      { id: "other", label: "Sonstiges" },
    ],
  },
  {
    id: "human_error",
    label: "Menschliches Versagen",
    details: [
      { id: "omission", label: "Unterlassung (unbeabsichtigt)" },
      { id: "mistake", label: "Irrtum" },
      { id: "skills", label: "Fähigkeiten und Kenntnisse" },
      { id: "staffing", label: "Unzureichende personelle Ausstattung" },
      { id: "miscommunication", label: "Fehlkommunikation" },
      { id: "other", label: "Sonstiges" },
    ],
  },
  {
    id: "external_event",
    label: "Externes Ereignis",
    details: [
      { id: "natural_disaster", label: "Naturkatastrophen/höhere Gewalt" },
      { id: "third_party_outage", label: "Ausfälle bei Dritten" },
      { id: "other", label: "Sonstiges" },
    ],
  },
] as const satisfies readonly RootCauseCategoryDef[];

export type RootCauseCategory = (typeof ROOT_CAUSE_CATEGORIES)[number]["id"];

/**
 * Dieselbe Liste auf den Schnittstellentyp geweitet: `as const` hält oben die
 * Kennungen als Union fest, hier ist die einheitliche Struktur gefragt – etwa
 * um die Ursachen im Formular über alle drei Ebenen hinweg zu durchlaufen.
 */
export const ROOT_CAUSE_TREE: readonly RootCauseCategoryDef[] =
  ROOT_CAUSE_CATEGORIES;

export const ROOT_CAUSE_BY_ID: Record<RootCauseCategory, RootCauseCategoryDef> =
  Object.fromEntries(
    ROOT_CAUSE_TREE.map((c) => [c.id, c]),
  ) as Record<RootCauseCategory, RootCauseCategoryDef>;

/**
 * Zusammengesetzte Kennung einer detaillierten Ursache (4.2), z. B.
 * "process_failure.monitoring" – die Detailkategorien sind nur innerhalb ihrer
 * übergeordneten Kategorie eindeutig.
 */
export function rootCauseDetailId(category: string, detail: string): string {
  return `${category}.${detail}`;
}

/** Alle gültigen Detailkennungen (4.2) über alle Kategorien hinweg. */
export const ROOT_CAUSE_DETAIL_IDS: string[] = ROOT_CAUSE_TREE.flatMap((c) =>
  c.details.map((d) => rootCauseDetailId(c.id, d.id)),
);

/** Alle gültigen Kennungen der weitergehenden Einstufung (4.3). */
export const ROOT_CAUSE_FURTHER_IDS: string[] = ROOT_CAUSE_TREE.flatMap((c) =>
  c.details.flatMap((d) =>
    (d.further ?? []).map((f) => `${rootCauseDetailId(c.id, d.id)}.${f.id}`),
  ),
);

/* ---------------------------------------------------------------------------
 * Feld 4.10 – Risiko für kritische Funktionen zu Abwicklungszwecken
 * ------------------------------------------------------------------------- */

export const RESOLUTION_RISK_ANSWERS = [
  { id: "yes", label: "Ja" },
  { id: "no", label: "Nein" },
  { id: "not_applicable", label: "Nicht anwendbar" },
] as const;

export type ResolutionRiskAnswer =
  (typeof RESOLUTION_RISK_ANSWERS)[number]["id"];

/* ---------------------------------------------------------------------------
 * Fristen aus Sicht des Meldeformulars (Art. 19 Abs. 4 DORA)
 * ------------------------------------------------------------------------- */

/** Erstmeldung: spätestens 4 Stunden nach der Einstufung als schwerwiegend. */
export const INITIAL_DEADLINE_AFTER_CLASSIFICATION_HOURS = 4;

/** Erstmeldung: jedenfalls binnen 24 Stunden nach Kenntniserlangung. */
export const INITIAL_DEADLINE_AFTER_DETECTION_HOURS = 24;
