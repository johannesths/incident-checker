#!/usr/bin/env node
/**
 * Prüft die Meldungen nach Art. 19 DORA gegen die Delegierte Verordnung (EU)
 * 2025/301: Inhalt der Erst-, Zwischen- und Abschlussmeldung (Art. 1 bis 4),
 * Fristen (Art. 5) und Inhalt der freiwilligen Meldung erheblicher
 * Cyberbedrohungen (Art. 6).
 *
 * Der Test spricht die laufende Anwendung über /api/report an – damit deckt er
 * Schema, Route und Plausibilitätsprüfungen gemeinsam ab. Voraussetzung ist
 * ein laufender Server:
 *
 *   npm run dev
 *   npm run test:report
 *
 * Andere Adresse: BASE_URL=http://127.0.0.1:3001 npm run test:report
 * Rückgabewert: 0 = alle Fälle bestanden, 1 = Abweichungen, 2 = kein Server.
 */

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const ENDPOINT = `${BASE_URL}/api/report`;

const HOUR_MS = 60 * 60 * 1000;

/** Zeitpunkt als datetime-local-Wert, wie ihn das Formular liefert. */
function hoursAgo(hours) {
  return new Date(Date.now() - hours * HOUR_MS).toISOString().slice(0, 16);
}

/** Art. 1 – allgemeine Informationen, gemeinsam für beide Meldungen. */
const generalInformation = {
  entityName: "Musterbank AG",
  entityLei: "529900MUSTERBANK0001",
  entityType: "credit_institution",
  submittingEntityName: "",
  submittingEntityCode: "",
  aggregatedEntityNames: "",
  aggregatedEntityLeis: "",
  primaryContactName: "Jana Musterfrau",
  primaryContactEmail: "ikt-meldewesen@musterbank.example",
  primaryContactPhone: "+49 69 12345678",
  secondContactName: "",
  secondContactEmail: "",
  secondContactPhone: "",
  groupParentName: "",
  groupParentLei: "",
  reportingCurrency: "EUR",
  nis2EssentialEntity: true,
  competentAuthority:
    "Bundesanstalt für Finanzdienstleistungsaufsicht (BaFin)",
};

/** Vollständige, widerspruchsfreie Erstmeldung (Art. 2). */
const initialReport = {
  kind: "incident",
  ...generalInformation,
  reportType: "initial",
  incidentReferenceCode: "INC-2026-0042",
  detectedAt: hoursAgo(3),
  classifiedAt: hoursAgo(2),
  description:
    "Ausfall des Kernbankensystems; Online-Banking für Kunden nicht erreichbar.",
  classificationCriteria: ["critical_services", "duration_downtime"],
  affectedMemberStates: ["DE"],
  detectionSource: "monitoring",
  incidentOrigin: "own_entity",
  originEntityDetails: "",
  businessContinuityActivated: false,
  reclassifiedAsNonMajor: false,
  reclassificationDetails: "",
  additionalInformation: "",
  authorityReferenceCode: "",
  occurredAt: "",
  regularOperationsResumedAt: "",
  clientsAffected: "",
  clientsAffectedPercent: "",
  counterpartsAffected: "",
  counterpartsAffectedPercent: "",
  relevantClientsImpact: "",
  transactionsAffected: "",
  transactionsAffectedPercent: "",
  transactionsValue: "",
  figuresBasis: null,
  reputationalImpactConditions: [],
  reputationalImpactContext: "",
  durationHours: "",
  downtimeHours: "",
  durationBasis: null,
  memberStateImpactTypes: [],
  memberStateImpactDescription: "",
  dataLossDimensions: [],
  dataLossDescription: "",
  criticalServicesDescription: "",
  incidentTypes: [],
  incidentTypeOther: "",
  threatTechniques: [],
  threatTechniqueOther: "",
  functionalAreas: [],
  affectedProcesses: "",
  infrastructureAffected: null,
  infrastructureDescription: "",
  clientFinancialInterestAffected: false,
  notifiedAuthorities: [],
  notifiedAuthoritiesOther: "",
  temporaryMeasuresTaken: false,
  temporaryMeasuresDescription: "",
  indicatorsOfCompromise: "",
  rootCauseCategories: [],
  rootCauseDetails: [],
  rootCauseFurther: [],
  rootCauseOther: "",
  rootCauseDescription: "",
  incidentResolvedAt: "",
  rootCauseAddressedAt: "",
  counterMeasures: "",
  resolutionRisk: null,
  resolutionAuthorityInformation: "",
  grossCostsAndLosses: "",
  financialRecoveries: "",
  economicImpactDescription: "",
  recurringIncidents: false,
  recurringIncidentCount: "",
  firstRecurringIncidentAt: "",
  delayReason: "",
  classification: "major",
};

/** Ergänzungen der Zwischenmeldung (Art. 3), widerspruchsfrei zur Erstmeldung. */
const intermediateAdditions = {
  reportType: "intermediate",
  authorityReferenceCode: "MLD-20260907-ABC123",
  occurredAt: hoursAgo(6),
  regularOperationsResumedAt: hoursAgo(2),
  durationHours: "5",
  downtimeHours: "4",
  durationBasis: "estimate",
  figuresBasis: "estimate",
  clientsAffected: "120000",
  criticalServicesDescription: "Online-Banking, Zahlungsverkehr.",
  incidentTypes: ["system_failure"],
  functionalAreas: ["it"],
  affectedProcesses: "Überweisungen, Kartenzahlungen.",
  infrastructureAffected: "yes",
  infrastructureDescription: "Datenbankcluster des Kernbankensystems.",
  notifiedAuthorities: ["none"],
  temporaryMeasuresTaken: true,
  temporaryMeasuresDescription: "Ausweichstandort aktiviert.",
};

/** Ergänzungen der Abschlussmeldung (Art. 4). */
const finalAdditions = {
  reportType: "final",
  rootCauseCategories: ["system_failure"],
  rootCauseDetails: ["system_failure.hardware_capacity"],
  rootCauseDescription:
    "Die Speicherkapazität des Datenbankclusters war erschöpft; die Überwachung schlug nicht an.",
  counterMeasures:
    "Kapazität erweitert, Schwellenwerte der Überwachung angepasst.",
  rootCauseAddressedAt: hoursAgo(2),
  incidentResolvedAt: hoursAgo(1),
  resolutionRisk: "not_applicable",
  grossCostsAndLosses: "50000",
  economicImpactDescription: "Beratungs- und Personalkosten der Behebung.",
  // Die Dauer misst den Zeitraum vom Eintreten bis zur Behebung.
  durationHours: "5",
};

const intermediateReport = { ...initialReport, ...intermediateAdditions };
const finalReport = { ...intermediateReport, ...finalAdditions };

/**
 * Die Meldungen sind nicht kumulativ: Art. 2 gilt nur für die Erstmeldung,
 * Art. 3 nur für die Zwischenmeldung. Diese Überschreibungen leeren die
 * Angaben des jeweiligen Artikels.
 */
const withoutArticle2 = {
  incidentReferenceCode: "",
  detectedAt: "",
  classifiedAt: "",
  description: "",
  classificationCriteria: [],
  affectedMemberStates: [],
  detectionSource: null,
  incidentOrigin: null,
  originEntityDetails: "",
  businessContinuityActivated: false,
};

const withoutArticle3 = {
  occurredAt: "",
  regularOperationsResumedAt: "",
  clientsAffected: "",
  durationHours: "",
  downtimeHours: "",
  durationBasis: null,
  figuresBasis: null,
  criticalServicesDescription: "",
  incidentTypes: [],
  functionalAreas: [],
  affectedProcesses: "",
  infrastructureAffected: null,
  infrastructureDescription: "",
  notifiedAuthorities: [],
  temporaryMeasuresTaken: false,
  temporaryMeasuresDescription: "",
};

/** Freiwillige Meldung einer erheblichen Cyberbedrohung (Art. 6). */
const cyberThreat = {
  kind: "cyber_threat",
  ...generalInformation,
  detectedAt: hoursAgo(5),
  relevantTimestamps: "Erste Auffälligkeiten im Netzwerkverkehr vor 12 Stunden.",
  description:
    "Gezielte Phishing-Kampagne gegen Beschäftigte des Zahlungsverkehrs mit gefälschten Anmeldeseiten.",
  potentialImpact:
    "Bei erfolgreichem Zugriff wären Zahlungsaufträge von Kunden manipulierbar.",
  classificationCriteria: ["critical_services", "data_losses"],
  threatStatus: "ongoing",
  threatActivityChange: "increased",
  preventiveMeasures: "Anmeldeseiten gesperrt, Beschäftigte sensibilisiert.",
  notifiedAuthorities: ["csirt"],
  notifiedAuthoritiesOther: "",
  notifiedFinancialEntities: "Zwei Institute derselben Gruppe.",
  indicatorsOfCompromise: "phishing.example / 203.0.113.10",
  additionalInformation: "",
};

async function submit(report) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
  });
  const body = await res.json().catch(() => ({}));
  return {
    status: res.status,
    body,
    /** Kennungen der beanstandeten Plausibilitätsprüfungen. */
    checks: (body.checks ?? []).map((c) => c.id),
  };
}

const CASES = [
  {
    group: "Art. 1 und 5 – Arten der Übermittlung und Fristen",
    cases: [
      {
        id: "Vollständige Erstmeldung",
        want: "angenommen, mit Frist für die Zwischenmeldung",
        report: initialReport,
        check: (r) =>
          r.status === 200 &&
          r.body.reportType === "initial" &&
          r.body.nextDeadlines.length === 1 &&
          r.body.nextDeadlines[0].reportType === "intermediate",
      },
      {
        id: "Vollständige Zwischenmeldung",
        want: "angenommen, mit Frist für die Abschlussmeldung",
        report: intermediateReport,
        check: (r) =>
          r.status === 200 && r.body.nextDeadlines[0]?.reportType === "final",
      },
      {
        id: "Vollständige Abschlussmeldung",
        want: "angenommen, keine weitere Frist",
        report: finalReport,
        check: (r) => r.status === 200 && r.body.nextDeadlines.length === 0,
      },
      {
        id: "Folgemeldung ohne Referenzcode der Behörde",
        want: "abgelehnt – Art. 3 Buchst. a verlangt ihn",
        report: { ...intermediateReport, authorityReferenceCode: "" },
        check: (r) => r.checks.includes("missing_authority_reference"),
      },
      {
        id: "Erstmeldung nach Fristablauf ohne Begründung",
        want: "angenommen, aber mit Hinweis auf Art. 5 Abs. 3",
        report: {
          ...initialReport,
          detectedAt: hoursAgo(40),
          classifiedAt: hoursAgo(30),
        },
        // Der Hinweis ist kein Widerspruch: die Meldung geht durch.
        check: (r) => r.status === 200,
      },
      {
        id: "Einstufung vor der Erkennung",
        want: "abgelehnt – die Reihenfolge ist unmöglich",
        report: { ...initialReport, classifiedAt: hoursAgo(4) },
        check: (r) => r.checks.includes("classified_before_detected"),
      },
    ],
  },
  {
    group: "Art. 1 – Identifikation des Finanzunternehmens",
    cases: [
      {
        id: "Ungültiger LEI-Code",
        want: "abgelehnt – 20 alphanumerische Zeichen (HTTP 422)",
        report: { ...initialReport, entityLei: "529900" },
        check: (r) => r.status === 422 && r.body.issues !== undefined,
      },
      {
        id: "Übermittelndes Unternehmen ohne Identifikationscode",
        want: "abgelehnt – Art. 1 Buchst. c verlangt Name und Code",
        report: { ...initialReport, submittingEntityName: "IT-Dienst GmbH" },
        check: (r) => r.checks.includes("submitter_without_code"),
      },
      {
        id: "Aggregierte Meldung mit passenden Namen und LEI",
        want: "angenommen",
        report: {
          ...initialReport,
          aggregatedEntityNames: "Musterbank Direkt AG;Musterbank Leasing AG",
          aggregatedEntityLeis:
            "529900MUSTERBANK0002;529900MUSTERBANK0003",
        },
        check: (r) => r.status === 200,
      },
      {
        id: "Aggregierte Meldung mit ungleich vielen Einträgen",
        want: "abgelehnt – die Reihenfolge muss übereinstimmen",
        report: {
          ...initialReport,
          aggregatedEntityNames: "Musterbank Direkt AG;Musterbank Leasing AG",
          aggregatedEntityLeis: "529900MUSTERBANK0002",
        },
        check: (r) => r.checks.includes("aggregated_count_mismatch"),
      },
      {
        id: "Währung ohne ISO-4217-Code",
        want: "abgelehnt – drei Buchstaben",
        report: { ...initialReport, reportingCurrency: "Euro" },
        check: (r) => r.status === 422 && r.body.issues !== undefined,
      },
    ],
  },
  {
    group: "Art. 2 – Einstufungskriterien, Mitgliedstaaten, Ursprung",
    cases: [
      {
        id: "Meldepflicht ohne Kriterium „Kritische Dienste“",
        want: "abgelehnt – Art. 8 Abs. 1 DelVO (EU) 2024/1772",
        report: {
          ...initialReport,
          classificationCriteria: ["duration_downtime"],
        },
        check: (r) => r.checks.includes("missing_critical_services"),
      },
      {
        id: "Zwei Mitgliedstaaten ohne Kriterium „Geografische Ausbreitung“",
        want: "abgelehnt – das Kriterium ist zusätzlich anzugeben",
        report: { ...initialReport, affectedMemberStates: ["DE", "AT"] },
        check: (r) => r.checks.includes("states_without_criterion"),
      },
      {
        id: "Kriterium „Geografische Ausbreitung“ mit nur einem Staat",
        want: "abgelehnt – es sind mindestens zwei Mitgliedstaaten",
        report: {
          ...initialReport,
          classificationCriteria: ["critical_services", "geographical_spread"],
        },
        check: (r) => r.checks.includes("criterion_without_states"),
      },
      {
        id: "Ursprung bei einem Dritten ohne dessen Bezeichnung",
        want: "abgelehnt – Art. 2 Buchst. g verlangt Name und Code",
        report: { ...initialReport, incidentOrigin: "third_party_provider" },
        check: (r) => r.checks.includes("origin_unnamed"),
      },
      {
        id: "Neueinstufung als nicht schwerwiegend, mit Gründen",
        want: "angenommen",
        report: {
          ...initialReport,
          classification: "non_major",
          classificationCriteria: [],
          reclassifiedAsNonMajor: true,
          reclassificationDetails:
            "Die Auswirkungen blieben unterhalb sämtlicher Schwellenwerte.",
        },
        check: (r) => r.status === 200,
      },
      {
        id: "Neueinstufung ohne Gründe",
        want: "abgelehnt – Art. 2 Buchst. i verlangt die Angaben",
        report: {
          ...initialReport,
          classification: "non_major",
          classificationCriteria: [],
          reclassifiedAsNonMajor: true,
        },
        check: (r) => r.checks.includes("reclassification_without_details"),
      },
      {
        id: "Nicht schwerwiegender Vorfall ohne Neueinstufung",
        want: "abgelehnt – keine Meldepflicht (HTTP 409)",
        report: { ...initialReport, classification: "non_major" },
        check: (r) => r.status === 409,
      },
    ],
  },
  {
    group: "Art. 3 – Zeitpunkte und „Sonstiges“-Angaben",
    cases: [
      {
        id: "Vorfall nach seiner Erkennung eingetreten",
        want: "abgelehnt – Art. 3 Buchst. b kann nicht nach Art. 2 Buchst. b liegen",
        report: { ...intermediateReport, occurredAt: hoursAgo(1) },
        check: (r) => r.checks.includes("occurred_after_detected"),
      },
      {
        id: "Geschäftsbetrieb vor dem Eintreten wiederaufgenommen",
        want: "abgelehnt – die Reihenfolge ist unmöglich",
        report: { ...intermediateReport, regularOperationsResumedAt: hoursAgo(8) },
        check: (r) => r.checks.includes("resumed_before_occurred"),
      },
      {
        id: "Vorfallsart „Sonstiges“ ohne Angabe, welche",
        want: "abgelehnt",
        report: {
          ...intermediateReport,
          incidentTypes: ["system_failure", "other"],
        },
        check: (r) => r.checks.includes("incident_type_unspecified"),
      },
      {
        id: "Technik „Sonstiges“ ohne Angabe, welche",
        want: "abgelehnt",
        report: { ...intermediateReport, threatTechniques: ["other"] },
        check: (r) => r.checks.includes("technique_unspecified"),
      },
      {
        id: "Behörde „Andere“ ohne Angabe, welche",
        want: "abgelehnt",
        report: { ...intermediateReport, notifiedAuthorities: ["other"] },
        check: (r) => r.checks.includes("authority_unspecified"),
      },
      {
        id: "„Keine“ Behörde neben einer weiteren Behörde",
        want: "abgelehnt – die Angaben schließen einander aus",
        report: {
          ...intermediateReport,
          notifiedAuthorities: ["none", "csirt"],
        },
        check: (r) => r.checks.includes("authorities_contradictory"),
      },
    ],
  },
  {
    group: "Art. 4 – Ursachen, Behebung und Kosten",
    cases: [
      {
        id: "Detailursache ohne übergeordnete Kategorie",
        want: "abgelehnt – die Einstufung ist dreistufig",
        report: {
          ...finalReport,
          rootCauseCategories: ["human_error"],
          rootCauseDetails: ["system_failure.hardware_capacity"],
        },
        check: (r) => r.checks.includes("detail_without_category"),
      },
      {
        id: "Detailursache ohne die verlangte weitergehende Einstufung",
        want: "abgelehnt",
        report: {
          ...finalReport,
          rootCauseCategories: ["process_failure"],
          rootCauseDetails: ["process_failure.monitoring"],
        },
        check: (r) =>
          r.checks.includes("further_required_process_failure.monitoring"),
      },
      {
        id: "Detailursache mit weitergehender Einstufung",
        want: "angenommen",
        report: {
          ...finalReport,
          rootCauseCategories: ["process_failure"],
          rootCauseDetails: ["process_failure.monitoring"],
          rootCauseFurther: ["process_failure.monitoring.logging"],
        },
        check: (r) => r.status === 200,
      },
      {
        id: "Ursache „Sonstiges“ ohne Angabe, welche",
        want: "abgelehnt",
        report: {
          ...finalReport,
          rootCauseCategories: ["external_event"],
          rootCauseDetails: ["external_event.other"],
        },
        check: (r) => r.checks.includes("root_cause_unspecified"),
      },
      {
        id: "Abschlussmeldung ohne Angaben zu den Ursachen",
        want: "abgelehnt – Art. 4 Buchst. a verlangt sie",
        report: { ...finalReport, rootCauseDescription: "" },
        check: (r) => r.checks.includes("root_cause_without_description"),
      },
      {
        id: "Behebung vor dem Eintreten",
        want: "abgelehnt – die Reihenfolge ist unmöglich",
        report: { ...finalReport, incidentResolvedAt: hoursAgo(9) },
        check: (r) => r.checks.includes("resolved_before_occurred"),
      },
      {
        id: "Wiederholte Vorfälle ohne Zeitpunkt des ersten",
        want: "abgelehnt – Art. 4 Buchst. f verlangt ihn",
        report: { ...finalReport, recurringIncidents: true },
        check: (r) => r.checks.includes("recurring_without_date"),
      },
    ],
  },
  {
    group: "Meldungen sind nicht kumulativ (Art. 1 bis 4)",
    cases: [
      {
        id: "Abschlussmeldung ohne die Angaben der Erst- und Zwischenmeldung",
        want: "angenommen – Art. 4 verlangt sie nicht",
        report: { ...finalReport, ...withoutArticle2, ...withoutArticle3 },
        check: (r) => r.status === 200,
      },
      {
        id: "Zwischenmeldung ohne die Angaben der Erstmeldung",
        want: "angenommen – Art. 3 verlangt sie nicht",
        report: { ...intermediateReport, ...withoutArticle2 },
        check: (r) => r.status === 200,
      },
      {
        id: "Abschlussmeldung ohne Einstufungskriterien",
        want: "angenommen – die Kriterien nennt die Erstmeldung",
        report: { ...finalReport, ...withoutArticle2 },
        check: (r) => r.status === 200,
      },
      {
        id: "Erstmeldung ohne Referenzcode",
        want: "abgelehnt – Art. 2 Buchst. a verlangt ihn",
        report: { ...initialReport, incidentReferenceCode: "" },
        check: (r) => r.checks.includes("missing_incident_reference"),
      },
      {
        id: "Erstmeldung ohne Beschreibung",
        want: "abgelehnt – Art. 2 Buchst. c verlangt sie",
        report: { ...initialReport, description: "" },
        check: (r) => r.checks.includes("missing_description"),
      },
      {
        id: "Erstmeldung ohne Zeitpunkte",
        want: "abgelehnt – Art. 2 Buchst. b verlangt beide",
        report: { ...initialReport, detectedAt: "", classifiedAt: "" },
        check: (r) =>
          r.checks.includes("missing_detected_at") &&
          r.checks.includes("missing_classified_at"),
      },
    ],
  },
  {
    group: "Art. 6 – Freiwillige Meldung erheblicher Cyberbedrohungen",
    cases: [
      {
        id: "Vollständige Meldung einer Cyberbedrohung",
        want: "angenommen, ohne Folgefristen",
        report: cyberThreat,
        check: (r) =>
          r.status === 200 &&
          r.body.kind === "cyber_threat" &&
          r.body.reportType === null &&
          r.body.nextDeadlines.length === 0,
      },
      {
        id: "Ohne Angaben zu den möglichen Auswirkungen",
        want: "abgelehnt – Art. 6 Buchst. d verlangt sie",
        report: { ...cyberThreat, potentialImpact: "" },
        check: (r) => r.status === 422 && r.body.issues !== undefined,
      },
      {
        id: "Ohne Erkennungszeitpunkt",
        want: "abgelehnt – Art. 6 Buchst. b verlangt ihn",
        report: { ...cyberThreat, detectedAt: "" },
        check: (r) => r.status === 422 && r.body.issues !== undefined,
      },
      {
        id: "Cyberbedrohung ohne Meldepflicht des Vorfalls",
        want: "angenommen – sie ist freiwillig und von der Einstufung unabhängig",
        report: cyberThreat,
        check: (r) => r.status === 200,
      },
    ],
  },
];

async function main() {
  console.log(
    `Meldungen nach der Delegierten VO (EU) 2025/301 – Prüfung gegen ${ENDPOINT}\n`,
  );

  try {
    await fetch(BASE_URL, { method: "HEAD" });
  } catch {
    console.error(
      `Kein Server unter ${BASE_URL}. Bitte zuerst "npm run dev" starten.`,
    );
    process.exit(2);
  }

  let passed = 0;
  const failures = [];

  for (const group of CASES) {
    console.log(group.group);
    for (const testCase of group.cases) {
      const result = await submit(testCase.report);
      if (testCase.check(result)) {
        passed++;
        console.log(`  ✓ ${testCase.id}`);
      } else {
        failures.push({ testCase, result });
        console.log(`  ✗ ${testCase.id}`);
      }
    }
    console.log("");
  }

  const total = CASES.reduce((n, g) => n + g.cases.length, 0);

  if (failures.length > 0) {
    console.log("Abweichungen:");
    for (const { testCase, result } of failures) {
      console.log(`\n  ${testCase.id}`);
      console.log(`    erwartet: ${testCase.want}`);
      console.log(`    Antwort:  HTTP ${result.status}`);
      if (result.checks.length > 0) {
        console.log(`    Befunde:  ${result.checks.join(", ")}`);
      }
      console.log(`    Body:     ${JSON.stringify(result.body).slice(0, 400)}`);
    }
    console.log("");
  }

  console.log(
    `${passed} von ${total} Fällen bestanden` +
      (failures.length ? `, ${failures.length} Abweichung(en)` : ""),
  );
  process.exit(failures.length > 0 ? 1 : 0);
}

await main();
