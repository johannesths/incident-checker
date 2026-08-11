#!/usr/bin/env node
/**
 * Prüft die Klassifizierungslogik der Schweregradbestimmung gegen die
 * Schwellen der Delegierten VO (EU) 2024/1772 (RTS).
 *
 * Der Test spricht die laufende Anwendung über /api/severity an – damit deckt
 * er Schema, Route und Bewertungslogik gemeinsam ab. Voraussetzung ist ein
 * laufender Server:
 *
 *   npm run dev
 *   npm run test:severity
 *
 * Andere Adresse: BASE_URL=http://127.0.0.1:3001 npm run test:severity
 * Rückgabewert: 0 = alle Fälle bestanden, 1 = Abweichungen, 2 = kein Server.
 */

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const ENDPOINT = `${BASE_URL}/api/severity`;

/** Leeres Formular – die Fälle setzen jeweils nur die relevanten Felder. */
const base = {
  description: "Testfall zur Prüfung der Klassifizierungslogik.",
  clientsAffected: "",
  clientsAffectedPercent: "",
  counterpartsAffectedPercent: "",
  transactionsCountPercent: "",
  transactionsValuePercent: "",
  relevantClientsAffected: false,
  durationHours: "",
  downtimeHours: "",
  memberStatesAffected: "",
  geoImpactAreas: [],
  dataLossDimensions: [],
  dataLossAdverseImpact: false,
  criticalFunctionAffected: false,
  regulatedServicesAffected: false,
  maliciousUnauthorizedAccess: false,
  maliciousAccessDataLossPossible: false,
  reputationalImpactConditions: [],
  economicImpactEur: "",
};

async function classify(patch) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...base, ...patch }),
  });
  if (!res.ok) {
    return { status: res.status, body: await res.json().catch(() => ({})) };
  }
  const data = await res.json();
  return {
    status: 200,
    classification: data.classification,
    summary: data.summary,
    // Befunde nach Kriterium adressierbar machen.
    f: Object.fromEntries(data.findings.map((x) => [x.criterionId, x])),
  };
}

const CASES = [
  {
    group: "Dauer & Ausfallzeit (Art. 3, Art. 9 Abs. 3 RTS)",
    cases: [
      {
        id: "Dauer 25 h ohne kritische Funktion",
        want: "Schwelle erreicht – die 24-Stunden-Grenze gilt unabhängig von der Kritikalität",
        patch: { durationHours: "25" },
        check: (r) => r.f.duration_downtime.thresholdMet === true,
      },
      {
        id: "Dauer exakt 24 h",
        want: "Schwelle nicht erreicht – die Grenze ist strikt (mehr als 24 Stunden)",
        patch: { durationHours: "24" },
        check: (r) => r.f.duration_downtime.thresholdMet === false,
      },
      {
        id: "Dauer 24,5 h",
        want: "Schwelle erreicht",
        patch: { durationHours: "24.5" },
        check: (r) => r.f.duration_downtime.thresholdMet === true,
      },
      {
        id: "Ausfallzeit 3 h mit kritischer Funktion",
        want: "Schwelle erreicht (Art. 9 Abs. 3 Buchst. b)",
        patch: { downtimeHours: "3", criticalFunctionAffected: true },
        check: (r) => r.f.duration_downtime.thresholdMet === true,
      },
      {
        id: "Ausfallzeit 3 h ohne kritische Funktion",
        want: "Schwelle nicht erreicht, mit Hinweis auf die Unanwendbarkeit",
        patch: { downtimeHours: "3" },
        check: (r) =>
          r.f.duration_downtime.thresholdMet === false &&
          /nicht anwendbar/.test(r.f.duration_downtime.assessment),
      },
      {
        id: "Ausfallzeit exakt 2 h mit kritischer Funktion",
        want: "Schwelle nicht erreicht – die Grenze ist strikt",
        patch: { downtimeHours: "2", criticalFunctionAffected: true },
        check: (r) => r.f.duration_downtime.thresholdMet === false,
      },
      {
        id: "Ausfallzeit 3 h, nur regulierte Finanzdienstleistung",
        want:
          "Schwelle nicht erreicht – maßgeblich ist Art. 6 Buchst. a, nicht die Vorfrage insgesamt",
        patch: { downtimeHours: "3", regulatedServicesAffected: true },
        check: (r) => r.f.duration_downtime.thresholdMet === false,
      },
      {
        id: "keine Zeitangaben",
        want: "Schwelle nicht erreicht",
        patch: {},
        check: (r) => r.f.duration_downtime.thresholdMet === false,
      },
      {
        id: "Ausfallzeit größer als Gesamtdauer",
        want:
          "Schwelle über die Ausfallzeit erreicht; die Angaben sind widersprüchlich und werden im Formular als Hinweis markiert",
        patch: {
          durationHours: "1",
          downtimeHours: "10",
          criticalFunctionAffected: true,
        },
        check: (r) => r.f.duration_downtime.thresholdMet === true,
      },
      {
        id: "negative Dauer",
        want: "Validierung greift (HTTP 422)",
        patch: { durationHours: "-5" },
        check: (r) => r.status === 422,
      },
    ],
  },
  {
    group: "Gesamteinstufung (Art. 8 Abs. 1 RTS)",
    cases: [
      {
        id: "Kritikalität und nur ein weiteres Kriterium",
        want: "nicht schwerwiegend – Buchst. b verlangt zwei weitere Kriterien",
        patch: { criticalFunctionAffected: true, durationHours: "25" },
        check: (r) => r.classification === "non_major",
      },
      {
        id: "Kritikalität und zwei weitere Kriterien",
        want: "schwerwiegend (Art. 8 Abs. 1 Buchst. b)",
        patch: {
          criticalFunctionAffected: true,
          durationHours: "25",
          economicImpactEur: "200000",
        },
        check: (r) => r.classification === "major",
      },
      {
        id: "Kritikalität allein",
        want: "nicht schwerwiegend",
        patch: { criticalFunctionAffected: true },
        check: (r) => r.classification === "non_major",
      },
      {
        id: "kein Tatbestand des Art. 6, alle übrigen Werte hoch",
        want: "nicht schwerwiegend – ohne Art. 6 nie schwerwiegend",
        patch: {
          durationHours: "100",
          economicImpactEur: "9000000",
          clientsAffected: "500000",
          memberStatesAffected: "5",
          geoImpactAreas: ["clients_counterparts"],
          reputationalImpactConditions: ["media_coverage"],
        },
        check: (r) => r.classification === "non_major",
      },
      {
        id: "böswilliger Zugriff mit möglichem Datenverlust",
        want: "schwerwiegend (Art. 8 Abs. 1 Buchst. a)",
        patch: {
          maliciousUnauthorizedAccess: true,
          maliciousAccessDataLossPossible: true,
        },
        check: (r) => r.classification === "major",
      },
      {
        id: "regulierte Finanzdienstleistung und zwei weitere Kriterien",
        want: "schwerwiegend – Art. 6 Buchst. b öffnet die Einstufung ebenso",
        patch: {
          regulatedServicesAffected: true,
          durationHours: "25",
          economicImpactEur: "200000",
        },
        check: (r) => r.classification === "major",
      },
      {
        id: "Kritikalität, Ausfallzeit 3 h und wirtschaftlicher Schaden",
        want: "schwerwiegend",
        patch: {
          criticalFunctionAffected: true,
          downtimeHours: "3",
          economicImpactEur: "200000",
        },
        check: (r) => r.classification === "major",
      },
    ],
  },
  {
    group: "Einzelbefunde und Grenzwerte",
    cases: [
      {
        id: "Datenverluste beim böswilligen Zugriff",
        want:
          "Befund erfüllt (Art. 9 Abs. 5 Buchst. b) – die Einstufung darf ihrem eigenen Grund nicht widersprechen",
        patch: {
          maliciousUnauthorizedAccess: true,
          maliciousAccessDataLossPossible: true,
        },
        check: (r) => r.f.data_losses.thresholdMet === true,
      },
      {
        id: "wirtschaftliche Auswirkung exakt 100.000 EUR",
        want: "Schwelle nicht erreicht – die Grenze ist strikt",
        patch: { economicImpactEur: "100000" },
        check: (r) => r.f.economic_impact.thresholdMet === false,
      },
      {
        id: "exakt 100.000 betroffene Kunden",
        want: "Schwelle nicht erreicht – die Grenze ist strikt",
        patch: { clientsAffected: "100000" },
        check: (r) => r.f.clients_transactions.thresholdMet === false,
      },
      {
        id: "zwei Mitgliedstaaten ohne erheblich betroffenen Bereich",
        want: "Schwelle nicht erreicht (Art. 4 RTS)",
        patch: { memberStatesAffected: "2" },
        check: (r) => r.f.geographical_spread.thresholdMet === false,
      },
    ],
  },
];

async function main() {
  try {
    await fetch(BASE_URL, { method: "HEAD" });
  } catch {
    console.error(
      `Kein Server unter ${BASE_URL} erreichbar. Bitte "npm run dev" starten ` +
        `oder BASE_URL setzen.`,
    );
    process.exit(2);
  }

  let passed = 0;
  const failures = [];

  for (const { group, cases } of CASES) {
    console.log(`\n${group}`);
    for (const testCase of cases) {
      const result = await classify(testCase.patch);
      let ok = false;
      try {
        ok = testCase.check(result) === true;
      } catch {
        ok = false;
      }
      if (ok) {
        passed++;
        console.log(`  ✓ ${testCase.id}`);
      } else {
        failures.push({ testCase, result });
        console.log(`  ✗ ${testCase.id}`);
      }
    }
  }

  const total = CASES.reduce((n, g) => n + g.cases.length, 0);

  if (failures.length > 0) {
    console.log("\nAbweichungen:");
    for (const { testCase, result } of failures) {
      console.log(`\n  ${testCase.id}`);
      console.log(`    erwartet: ${testCase.want}`);
      console.log(`    Eingabe:  ${JSON.stringify(testCase.patch)}`);
      console.log(
        `    Antwort:  HTTP ${result.status}` +
          (result.classification ? ` · ${result.classification}` : ""),
      );
      for (const finding of Object.values(result.f ?? {})) {
        console.log(
          `      ${finding.criterionId.padEnd(20)} erfüllt=${finding.thresholdMet}` +
            ` :: ${finding.assessment}`,
        );
      }
      if (result.body) {
        console.log(`    Body:     ${JSON.stringify(result.body).slice(0, 300)}`);
      }
    }
  }

  console.log(
    `\n${passed} von ${total} Fällen bestanden` +
      (failures.length ? `, ${failures.length} Abweichung(en)` : ""),
  );
  process.exit(failures.length > 0 ? 1 : 0);
}

await main();
