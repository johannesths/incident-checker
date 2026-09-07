/**
 * Inhalt der Meldungen nach Art. 19 DORA.
 *
 * Maßgeblich ist die Delegierte Verordnung (EU) 2025/301 (RTS zu Art. 20
 * Buchst. a DORA). Sie legt fest, welche Angaben eine Erst-, Zwischen- und
 * Abschlussmeldung enthalten müssen (Art. 1 bis 4), welche Fristen dafür
 * gelten (Art. 5) und was eine freiwillige Meldung erheblicher
 * Cyberbedrohungen umfasst (Art. 6).
 *
 * Die Anforderungen sind Mindestinhalte ("enthalten mindestens"). Wo die
 * Angabe erst durch eine Auswahl beantwortbar wird – etwa die Art des
 * Vorfalls oder die Techniken des Angreifers – sind die Wertelisten des
 * Datenglossars der zugehörigen Durchführungsverordnung (EU) 2025/302
 * hinterlegt. Die Benennung folgt durchgehend der Delegierten Verordnung.
 *
 * HINWEIS: Wie die Klassifizierungskriterien ist dieser Katalog eine
 * explizite, auditierbare Regelbasis und vor dem Produktiveinsatz gegen den
 * aktuellen Verordnungstext zu verifizieren.
 */

/* ---------------------------------------------------------------------------
 * Fundstellen
 * ------------------------------------------------------------------------- */

/** Artikel der Delegierten Verordnung, die Meldeinhalte festlegen. */
export type ContentArticle = 1 | 2 | 3 | 4 | 6;

export const CONTENT_ARTICLES: Record<ContentArticle, { title: string }> = {
  1: { title: "Allgemeine Informationen" },
  2: { title: "Erstmeldung" },
  3: { title: "Zwischenmeldung" },
  4: { title: "Abschlussmeldung" },
  6: { title: "Freiwillige Meldung erheblicher Cyberbedrohungen" },
};

/** Fundstelle einer Angabe, z. B. "Art. 2 Buchst. a–c". */
export function fieldRef(article: ContentArticle, letters: string): string {
  return `Art. ${article} Buchst. ${letters}`;
}

/* ---------------------------------------------------------------------------
 * Art. 2 Buchst. f – Wie wurde der Vorfall erkannt?
 * ------------------------------------------------------------------------- */

export const DETECTION_SOURCES = [
  { id: "it_security", label: "IT-Sicherheit" },
  { id: "staff", label: "Personal" },
  { id: "internal_audit", label: "Interne Revision" },
  { id: "external_audit", label: "Externe Prüfung" },
  { id: "clients", label: "Kunden" },
  { id: "counterparts", label: "Gegenparteien im Finanzbereich" },
  { id: "third_party", label: "Drittdienstleister" },
  { id: "attacker", label: "Angreifer" },
  { id: "monitoring", label: "Überwachungssysteme" },
  { id: "authority", label: "Behörde oder Strafverfolgung" },
  { id: "other", label: "Sonstiges" },
] as const;

export type DetectionSource = (typeof DETECTION_SOURCES)[number]["id"];

/* ---------------------------------------------------------------------------
 * Art. 2 Buchst. g – Ursprung des Vorfalls
 * ------------------------------------------------------------------------- */

export const INCIDENT_ORIGINS = [
  {
    id: "own_entity",
    label: "Beim Finanzunternehmen selbst",
  },
  {
    id: "third_party_provider",
    label: "Bei einem Drittdienstleister",
    hint: "Einschließlich konzerninterner Drittdienstleister.",
  },
  {
    id: "other_financial_entity",
    label: "Bei einem anderen Finanzunternehmen",
  },
  { id: "unknown", label: "Noch nicht bekannt" },
] as const;

export type IncidentOrigin = (typeof INCIDENT_ORIGINS)[number]["id"];

/** Ursprünge, die einen Dritten benennen lassen. */
export const EXTERNAL_ORIGINS: readonly IncidentOrigin[] = [
  "third_party_provider",
  "other_financial_entity",
];

/* ---------------------------------------------------------------------------
 * Art. 2 Buchst. e – Betroffene Mitgliedstaaten (ISO 3166 ALPHA-2)
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

/* ---------------------------------------------------------------------------
 * Art. 3 Buchst. d – Inwieweit sind die Einstufungskriterien erfüllt?
 *
 * Die Zahlenangaben zu den Kriterien dürfen geschätzt sein, solange die
 * tatsächlichen Werte nicht feststehen (Art. 1 Abs. 1, Art. 3 DelVO
 * (EU) 2024/1772). Ob geschätzt oder ermittelt wurde, gehört zur Angabe.
 * ------------------------------------------------------------------------- */

export const FIGURE_BASES = [
  { id: "actual", label: "Tatsächliche Werte" },
  { id: "estimate", label: "Schätzungen" },
  { id: "no_impact", label: "Keine Auswirkungen" },
] as const;

export type FigureBasis = (typeof FIGURE_BASES)[number]["id"];

/** Für Dauer und Ausfallzeit gibt es keine Option "keine Auswirkungen". */
export const DURATION_BASES = FIGURE_BASES.filter((b) => b.id !== "no_impact");

/**
 * Bereiche, in denen sich der Vorfall in anderen Mitgliedstaaten auswirkt
 * (Art. 4 Buchst. a–c DelVO (EU) 2024/1772).
 */
export const IMPACT_TYPES = [
  { id: "clients", label: "Kunden" },
  { id: "counterparts", label: "Gegenparteien im Finanzbereich" },
  { id: "branches", label: "Zweigniederlassungen" },
  { id: "group_entities", label: "Finanzunternehmen der Gruppe" },
  { id: "market_infrastructure", label: "Finanzmarktinfrastrukturen" },
  { id: "third_parties", label: "Drittdienstleister" },
] as const;

export type ImpactType = (typeof IMPACT_TYPES)[number]["id"];

/* ---------------------------------------------------------------------------
 * Art. 3 Buchst. e – Art des IKT-bezogenen Vorfalls
 * ------------------------------------------------------------------------- */

export const INCIDENT_TYPES = [
  { id: "cybersecurity", label: "Cybersicherheitsbezogen" },
  { id: "process_failure", label: "Prozessversagen" },
  { id: "system_failure", label: "Systemversagen" },
  { id: "external_event", label: "Externes Ereignis" },
  { id: "payment_related", label: "Zahlungsbezogen" },
  { id: "other", label: "Sonstiges" },
] as const;

export type IncidentType = (typeof INCIDENT_TYPES)[number]["id"];

/* ---------------------------------------------------------------------------
 * Art. 3 Buchst. f – Bedrohungen und Techniken des Angreifers
 * ------------------------------------------------------------------------- */

export const THREAT_TECHNIQUES = [
  { id: "social_engineering", label: "Social Engineering, einschließlich Phishing" },
  { id: "ddos", label: "(D)DoS" },
  { id: "identity_theft", label: "Identitätsdiebstahl" },
  {
    id: "data_encryption",
    label: "Datenverschlüsselung mit weitergehenden Folgen, einschließlich Ransomware",
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
 * Art. 3 Buchst. g – Betroffene Funktionsbereiche
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
 * Art. 3 Buchst. h – Betroffene Infrastrukturkomponenten
 * ------------------------------------------------------------------------- */

export const INFRASTRUCTURE_ANSWERS = [
  { id: "yes", label: "Ja" },
  { id: "no", label: "Nein" },
  { id: "unknown", label: "Keine Informationen verfügbar" },
] as const;

export type InfrastructureAnswer = (typeof INFRASTRUCTURE_ANSWERS)[number]["id"];

/* ---------------------------------------------------------------------------
 * Art. 3 Buchst. j / Art. 6 Buchst. h – Meldung an andere Behörden
 * ------------------------------------------------------------------------- */

export const NOTIFIED_AUTHORITIES = [
  {
    id: "law_enforcement",
    label: "Strafverfolgungsbehörde",
    hint: "Im weitesten Sinne: Polizei, Ordnungsbehörden und Staatsanwaltschaften, die Cyberkriminalität verfolgen.",
  },
  { id: "csirt", label: "CSIRT" },
  { id: "data_protection", label: "Datenschutzbehörde" },
  { id: "cyber_agency", label: "Nationale Cybersicherheitsbehörde" },
  { id: "none", label: "Keine" },
  { id: "other", label: "Andere" },
] as const;

export type NotifiedAuthority = (typeof NOTIFIED_AUTHORITIES)[number]["id"];

/* ---------------------------------------------------------------------------
 * Art. 4 Buchst. a – Ursachen des Vorfalls
 *
 * Dreistufig: übergeordnete Kategorie, detaillierte Kategorie und – für vier
 * Kategorien des Prozessversagens – die weitergehende Einstufung.
 * ------------------------------------------------------------------------- */

export interface RootCauseDetail {
  id: string;
  label: string;
  /** Weitergehende Einstufung; sobald vorhanden, ist sie anzugeben. */
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
        label: "Vorsätzliche physische Schäden, Manipulation oder Diebstahl",
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
        label: "Unzureichende oder mangelhafte Überwachung und Kontrolle",
        further: [
          { id: "policy_compliance", label: "Überwachung der Einhaltung von Richtlinien" },
          { id: "third_party", label: "Überwachung von Drittdienstleistern" },
          { id: "vulnerability", label: "Überwachung der Behebung von Schwachstellen" },
          { id: "iam", label: "Identitäts- und Zugangsmanagement" },
          { id: "crypto", label: "Verschlüsselung und Kryptografie" },
          { id: "logging", label: "Protokollierung" },
        ],
      },
      { id: "roles", label: "Unzureichende oder unklare Rollen und Zuständigkeiten" },
      {
        id: "risk_management",
        label: "Versagen des IKT-Risikomanagementprozesses",
        further: [
          { id: "risk_tolerance", label: "Versäumnis, genaue Risikotoleranzen festzulegen" },
          { id: "threat_assessment", label: "Unzureichende Bewertung von Bedrohungen und Schwachstellen" },
          { id: "risk_treatment", label: "Unzureichende Maßnahmen für die Risikobehandlung" },
          { id: "residual_risk", label: "Unzureichendes Management der IKT-Restrisiken" },
        ],
      },
      {
        id: "ict_operations",
        label: "Unzureichende oder nicht funktionierende IKT- und IKT-Sicherheitsabläufe",
        further: [
          { id: "patch", label: "Schwachstellen- und Patch-Management" },
          { id: "change", label: "Änderungsmanagement" },
          { id: "capacity", label: "Kapazitäts- und Leistungsmanagement" },
          { id: "asset", label: "Management von IKT-Assets und Informationsklassifizierung" },
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
            label: "Unzureichende Beschaffung, Entwicklung und Wartung von IKT-Systemen",
          },
          { id: "software_testing", label: "Unzureichende Software-Tests oder Versagen von Software-Tests" },
        ],
      },
      { id: "other", label: "Sonstiges" },
    ],
  },
  {
    id: "system_failure",
    label: "Systemversagen oder -störung",
    details: [
      { id: "hardware_capacity", label: "Hardwarekapazität und -leistung" },
      { id: "hardware_maintenance", label: "Wartung der Hardware" },
      { id: "hardware_obsolescence", label: "Veralterung oder Alterung der Hardware" },
      { id: "software_configuration", label: "Softwarekompatibilität und -konfiguration" },
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
      { id: "natural_disaster", label: "Naturkatastrophen oder höhere Gewalt" },
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
 * Zusammengesetzte Kennung einer detaillierten Ursache, z. B.
 * "process_failure.monitoring" – die Detailkategorien sind nur innerhalb ihrer
 * übergeordneten Kategorie eindeutig.
 */
export function rootCauseDetailId(category: string, detail: string): string {
  return `${category}.${detail}`;
}

export const ROOT_CAUSE_DETAIL_IDS: string[] = ROOT_CAUSE_TREE.flatMap((c) =>
  c.details.map((d) => rootCauseDetailId(c.id, d.id)),
);

export const ROOT_CAUSE_FURTHER_IDS: string[] = ROOT_CAUSE_TREE.flatMap((c) =>
  c.details.flatMap((d) =>
    (d.further ?? []).map((f) => `${rootCauseDetailId(c.id, d.id)}.${f.id}`),
  ),
);

/* ---------------------------------------------------------------------------
 * Art. 4 Buchst. d – Für die Abwicklungsbehörden relevante Informationen
 * ------------------------------------------------------------------------- */

export const RESOLUTION_RISK_ANSWERS = [
  { id: "yes", label: "Ja" },
  { id: "no", label: "Nein" },
  { id: "not_applicable", label: "Nicht anwendbar" },
] as const;

export type ResolutionRiskAnswer =
  (typeof RESOLUTION_RISK_ANSWERS)[number]["id"];

/* ---------------------------------------------------------------------------
 * Art. 6 Buchst. f – Status der erheblichen Cyberbedrohung
 * ------------------------------------------------------------------------- */

export const THREAT_STATUSES = [
  { id: "ongoing", label: "Anhaltend" },
  { id: "contained", label: "Eingedämmt" },
  { id: "resolved", label: "Beendet" },
] as const;

export type ThreatStatus = (typeof THREAT_STATUSES)[number]["id"];

export const THREAT_ACTIVITY_CHANGES = [
  { id: "increased", label: "Zugenommen" },
  { id: "unchanged", label: "Unverändert" },
  { id: "decreased", label: "Abgenommen" },
] as const;

export type ThreatActivityChange = (typeof THREAT_ACTIVITY_CHANGES)[number]["id"];
