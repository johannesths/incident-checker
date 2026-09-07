#!/usr/bin/env node
/**
 * Prüft die Meldung schwerwiegender IKT-bezogener Vorfälle gegen die Vorgaben
 * des amtlichen Meldeformulars: Anhang I und II der Durchführungsverordnung
 * (EU) 2025/302 sowie die Ausfüllhinweise der BaFin.
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

/** Vollständige, widerspruchsfreie Erstmeldung eines schwerwiegenden Vorfalls. */
const initialReport = {
  // 1 Allgemeine Informationen
  reportType: "initial",
  submittingEntityName: "Musterbank AG",
  submittingEntityCode: "529900MUSTERBANK0001",
  entityType: "credit_institution",
  nationalScopeOnly: false,
  affectedEntityNames: "Musterbank AG",
  affectedEntityLeis: "529900MUSTERBANK0001",
  primaryContactName: "Jana Musterfrau",
  primaryContactEmail: "ikt-meldewesen@musterbank.example",
  primaryContactPhone: "+49 69 12345678",
  secondContactName: "",
  secondContactEmail: "",
  secondContactPhone: "",
  ultimateParentName: "",
  ultimateParentLei: "",
  reportingCurrency: "EUR",
  // 2 Erstmeldung
  incidentReference: "INC-2026-0042",
  detectedAt: hoursAgo(3),
  classifiedAt: hoursAgo(2),
  description:
    "Ausfall des Kernbankensystems; Online-Banking für Kunden nicht erreichbar.",
  classificationCriteria: ["critical_services", "duration_downtime"],
  affectedMemberStates: ["DE"],
  detectionSource: "monitoring",
  originatesFromThirdParty: false,
  thirdPartyDetails: "",
  businessContinuityActivated: false,
  additionalInformation: "",
  // 3 Zwischenmeldung
  bafinIncidentId: "",
  occurredAt: "",
  servicesRestoredAt: "",
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
  // 4 Abschlussmeldung
  rootCauseCategories: [],
  rootCauseDetails: [],
  rootCauseFurther: [],
  rootCauseOther: "",
  rootCauseDescription: "",
  resolutionSummary: "",
  rootCauseAddressedAt: "",
  incidentResolvedAt: "",
  resolutionDelayReason: "",
  resolutionRisk: null,
  resolutionAuthorityInformation: "",
  economicImpactDescription: "",
  grossCostsAndLosses: "",
  financialRecoveries: "",
  recurringIncidents: false,
  recurringIncidentCount: "",
  firstRecurringIncidentAt: "",
  // Angaben der Anwendung
  classification: "major",
  competentAuthority:
    "Bundesanstalt für Finanzdienstleistungsaufsicht (BaFin)",
  voluntary: false,
};

/** Ergänzungen des Abschnitts 3, widerspruchsfrei zur Erstmeldung. */
const section3 = {
  reportType: "intermediate",
  bafinIncidentId: "MLD-20260907-ABC123",
  occurredAt: hoursAgo(6),
  servicesRestoredAt: hoursAgo(2),
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

/** Ergänzungen des Abschnitts 4, widerspruchsfrei zu Abschnitt 3. */
const section4 = {
  reportType: "final",
  rootCauseCategories: ["system_failure"],
  rootCauseDetails: ["system_failure.hardware_capacity"],
  rootCauseDescription:
    "Die Speicherkapazität des Datenbankclusters war erschöpft; die Überwachung schlug nicht an.",
  resolutionSummary:
    "Kapazität erweitert, Schwellenwerte der Überwachung angepasst.",
  rootCauseAddressedAt: hoursAgo(2),
  incidentResolvedAt: hoursAgo(1),
  resolutionRisk: "not_applicable",
  grossCostsAndLosses: "50000",
  economicImpactDescription: "Beratungs- und Personalkosten der Behebung.",
  // Feld 3.15 misst den Zeitraum zwischen Feld 3.2 und Feld 4.8.
  durationHours: "5",
};

const intermediateReport = { ...initialReport, ...section3 };
const finalReport = { ...intermediateReport, ...section4 };

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
    group: "Meldungstypen und Meldepflicht (Art. 19 DORA, Art. 5 ITS)",
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
          r.status === 200 &&
          r.body.nextDeadlines[0]?.reportType === "final",
      },
      {
        id: "Vollständige Abschlussmeldung",
        want: "angenommen, keine weitere Frist",
        report: finalReport,
        check: (r) => r.status === 200 && r.body.nextDeadlines.length === 0,
      },
      {
        id: "Nicht schwerwiegender Vorfall ohne freiwillige Meldung",
        want: "abgelehnt – keine Meldepflicht (HTTP 409)",
        report: { ...initialReport, classification: "non_major" },
        check: (r) => r.status === 409,
      },
      {
        id: "Nicht schwerwiegender Vorfall als freiwillige Meldung",
        want: "angenommen (Art. 19 Abs. 2 DORA)",
        report: {
          ...initialReport,
          classification: "non_major",
          classificationCriteria: [],
          voluntary: true,
        },
        check: (r) => r.status === 200,
      },
      {
        id: "Rückstufung mit Begründung",
        want: "angenommen, keine weitere Frist",
        report: {
          ...initialReport,
          reportType: "reclassification",
          classification: "non_major",
          classificationCriteria: [],
          bafinIncidentId: "MLD-20260907-ABC123",
          additionalInformation:
            "Die Auswirkungen blieben unterhalb sämtlicher Schwellenwerte.",
        },
        check: (r) => r.status === 200 && r.body.nextDeadlines.length === 0,
      },
      {
        id: "Rückstufung ohne Begründung in Feld 2.10",
        want: "abgelehnt – die Gründe sind darzulegen",
        report: {
          ...initialReport,
          reportType: "reclassification",
          classification: "non_major",
          classificationCriteria: [],
          bafinIncidentId: "MLD-20260907-ABC123",
        },
        check: (r) => r.checks.includes("reclassification_reason"),
      },
      {
        id: "Folgemeldung ohne Vorgangsnummer der Behörde",
        want: "abgelehnt – Feld 3.1 ist bei Folgemeldungen Pflicht",
        report: { ...intermediateReport, bafinIncidentId: "" },
        check: (r) => r.checks.includes("missing_incident_id"),
      },
    ],
  },
  {
    group: "Feld 1.x – Identifikation",
    cases: [
      {
        id: "Ungültiger LEI des einreichenden Unternehmens",
        want: "abgelehnt – 20 alphanumerische Zeichen (HTTP 422)",
        report: { ...initialReport, submittingEntityCode: "529900" },
        check: (r) => r.status === 422 && r.body.issues !== undefined,
      },
      {
        id: "Zwei betroffene Unternehmen mit zwei LEI",
        want: "angenommen – aggregierte Meldung nach Art. 7 ITS",
        report: {
          ...initialReport,
          affectedEntityNames: "Musterbank AG; Musterbank Direkt AG",
          affectedEntityLeis:
            "529900MUSTERBANK0001;529900MUSTERBANK0002",
        },
        check: (r) => r.status === 200,
      },
      {
        id: "Zweiter LEI unvollständig",
        want: "abgelehnt – jeder LEI muss 20 Zeichen haben",
        report: {
          ...initialReport,
          affectedEntityNames: "Musterbank AG; Musterbank Direkt AG",
          affectedEntityLeis: "529900MUSTERBANK0001;529900",
        },
        check: (r) => r.status === 422 && r.body.issues !== undefined,
      },
      {
        id: "Berichtswährung ohne ISO-Code",
        want: "abgelehnt – ISO 4217, drei Buchstaben",
        report: { ...initialReport, reportingCurrency: "Euro" },
        check: (r) => r.status === 422 && r.body.issues !== undefined,
      },
    ],
  },
  {
    group: "Feld 2.5 / 2.6 – Klassifikationskriterien und Mitgliedstaaten",
    cases: [
      {
        id: "Meldepflicht ohne Kriterium „Kritische Dienste“",
        want: "abgelehnt – Art. 8 Abs. 1 RTS verlangt das Kriterium",
        report: {
          ...initialReport,
          classificationCriteria: ["duration_downtime"],
        },
        check: (r) => r.checks.includes("missing_critical_services"),
      },
      {
        id: "Zwei Mitgliedstaaten ohne Kriterium „Geografische Ausbreitung“",
        want: "abgelehnt – das Kriterium ist zusätzlich zu wählen",
        report: { ...initialReport, affectedMemberStates: ["DE", "AT"] },
        check: (r) => r.checks.includes("states_without_criterion"),
      },
      {
        id: "Kriterium „Geografische Ausbreitung“ mit nur einem Staat",
        want: "abgelehnt – es sind mindestens zwei Mitgliedstaaten",
        report: {
          ...initialReport,
          classificationCriteria: [
            "critical_services",
            "geographical_spread",
          ],
        },
        check: (r) => r.checks.includes("criterion_without_states"),
      },
      {
        id: "Zwei Mitgliedstaaten mit passendem Kriterium",
        want: "angenommen",
        report: {
          ...initialReport,
          affectedMemberStates: ["DE", "AT"],
          classificationCriteria: [
            "critical_services",
            "geographical_spread",
          ],
        },
        check: (r) => r.status === 200,
      },
    ],
  },
  {
    group: "Feld 2.2 / 2.3 / 3.x – Zeitpunkte",
    cases: [
      {
        id: "Einstufung vor der Entdeckung",
        want: "abgelehnt – die Reihenfolge ist unmöglich",
        report: { ...initialReport, classifiedAt: hoursAgo(4) },
        check: (r) => r.checks.includes("classified_before_detected"),
      },
      {
        id: "Vorfall nach seiner Entdeckung eingetreten",
        want: "abgelehnt – Feld 3.2 kann nicht nach Feld 2.2 liegen",
        report: { ...intermediateReport, occurredAt: hoursAgo(1) },
        check: (r) => r.checks.includes("occurred_after_detected"),
      },
      {
        id: "Wiederherstellung vor dem Eintreten",
        want: "abgelehnt – Feld 3.3 kann nicht vor Feld 3.2 liegen",
        report: { ...intermediateReport, servicesRestoredAt: hoursAgo(8) },
        check: (r) => r.checks.includes("restored_before_occurred"),
      },
      {
        id: "Behebung vor dem Eintreten",
        want: "abgelehnt – Feld 4.8 kann nicht vor Feld 3.2 liegen",
        report: { ...finalReport, incidentResolvedAt: hoursAgo(9) },
        check: (r) => r.checks.includes("resolved_before_occurred"),
      },
    ],
  },
  {
    group: "Felder mit „Sonstiges“ – Spezifizierungspflicht",
    cases: [
      {
        id: "Vorfallsart „Sonstiges“ ohne Feld 3.24",
        want: "abgelehnt – die Art ist anzugeben",
        report: {
          ...intermediateReport,
          incidentTypes: ["system_failure", "other"],
        },
        check: (r) => r.checks.includes("incident_type_unspecified"),
      },
      {
        id: "Technik „Sonstiges“ ohne Feld 3.26",
        want: "abgelehnt – die Technik ist anzugeben",
        report: { ...intermediateReport, threatTechniques: ["other"] },
        check: (r) => r.checks.includes("technique_unspecified"),
      },
      {
        id: "Behörde „Andere“ ohne Feld 3.32",
        want: "abgelehnt – die Behörde ist zu benennen",
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
    group: "Felder 4.1–4.5 – Ursachen der Abschlussmeldung",
    cases: [
      {
        id: "Detailursache ohne übergeordnete Kategorie",
        want: "abgelehnt – Feld 4.2 setzt Feld 4.1 voraus",
        report: {
          ...finalReport,
          rootCauseCategories: ["human_error"],
          rootCauseDetails: ["system_failure.hardware_capacity"],
        },
        check: (r) => r.checks.includes("detail_without_category"),
      },
      {
        id: "Detailursache ohne die verlangte weitergehende Einstufung",
        want: "abgelehnt – Feld 4.3 ist hier Pflichtangabe",
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
        id: "Ursache „Sonstiges“ ohne Feld 4.4",
        want: "abgelehnt – die Ursache ist anzugeben",
        report: {
          ...finalReport,
          rootCauseCategories: ["external_event"],
          rootCauseDetails: ["external_event.other"],
        },
        check: (r) => r.checks.includes("root_cause_unspecified"),
      },
      {
        id: "Abschlussmeldung ohne Ursachenanalyse",
        want: "abgelehnt – Feld 4.5 ist wesentlicher Bestandteil",
        report: { ...finalReport, rootCauseDescription: "" },
        check: (r) => r.checks.includes("root_cause_without_description"),
      },
      {
        id: "Wiederholte Vorfälle ohne Zeitpunkt in Feld 4.16",
        want: "abgelehnt – Datum und Uhrzeit sind anzugeben",
        report: { ...finalReport, recurringIncidents: true },
        check: (r) => r.checks.includes("recurring_without_date"),
      },
    ],
  },
];

async function main() {
  console.log(`Meldung nach Anhang I ITS – Prüfung gegen ${ENDPOINT}\n`);

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
      console.log(
        `    Body:     ${JSON.stringify(result.body).slice(0, 400)}`,
      );
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
