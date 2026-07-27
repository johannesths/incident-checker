import type { TriageInput } from "@/lib/schemas";
import type { DataLossDimension, ReputationCondition } from "@/lib/dora/criteria";

/**
 * Beispiel-Szenarien zum Vorführen des Tools ohne echte Eingaben.
 * Bewusst so gewählt, dass die Platzhalter-Heuristik unterschiedliche
 * Ergebnisse liefert (Vorfall / kein Vorfall / unklar bzw. major / non-major).
 */

export interface TriageScenario {
  id: string;
  label: string;
  hint: string;
  data: TriageInput;
}

export const TRIAGE_SCENARIOS: TriageScenario[] = [
  {
    id: "ransomware",
    label: "Ransomware-Verdacht",
    hint: "erwartet: Vorfall",
    data: {
      description:
        "Mehrere Mitarbeitende melden, dass Dateien auf dem Fileserver verschlüsselt sind und eine Lösegeldforderung angezeigt wird.",
      affectedSystem: "Zentraler Fileserver, Windows-Domäne",
      reportedBy: "IT-Betrieb / mehrere Fachabteilungen",
      symptoms:
        "Dateien nicht mehr lesbar, Erpressernachricht, ungewöhnliche Netzwerkaktivität, Server nicht erreichbar.",
    },
  },
  {
    id: "password-reset",
    label: "Passwort vergessen",
    hint: "erwartet: kein Vorfall (ServiceDesk)",
    data: {
      description:
        "Ein Mitarbeiter hat sein Passwort vergessen und kann sich nicht mehr am Arbeitsplatz anmelden.",
      affectedSystem: "Einzelner Arbeitsplatz / Login",
      reportedBy: "Mitarbeiter Buchhaltung",
      symptoms: "Anmeldung schlägt fehl, Zugang vergessen.",
    },
  },
  {
    id: "slow-app",
    label: "Anwendung langsam",
    hint: "erwartet: unklar",
    data: {
      description:
        "Die interne Reporting-Anwendung reagiert seit heute Morgen langsamer als gewohnt.",
      affectedSystem: "Reporting-Portal",
      reportedBy: "Controlling",
      symptoms: "Längere Ladezeiten, gelegentliche Timeouts.",
    },
  },
];

export interface SeverityScenarioData {
  description: string;
  clientsAffected: string;
  clientsAffectedPercent: string;
  counterpartsAffectedPercent: string;
  transactionsCountPercent: string;
  transactionsValuePercent: string;
  relevantClientsAffected: boolean;
  durationHours: string;
  downtimeHours: string;
  memberStatesAffected: string;
  dataLossDimensions: DataLossDimension[];
  dataLossAdverseImpact: boolean;
  criticalFunctionAffected: boolean;
  regulatedServicesAffected: boolean;
  maliciousUnauthorizedAccess: boolean;
  maliciousAccessDataLossPossible: boolean;
  reputationalImpactConditions: ReputationCondition[];
  economicImpactEur: string;
}

export interface SeverityScenario {
  id: string;
  label: string;
  hint: string;
  data: SeverityScenarioData;
}

export const SEVERITY_SCENARIOS: SeverityScenario[] = [
  {
    id: "major-outage",
    label: "Schwerer Ausfall",
    hint: "erwartet: schwerwiegend",
    data: {
      description:
        "Ausfall des Online-Bankings durch Ransomware. Kunden können keine Überweisungen tätigen.",
      clientsAffected: "120000",
      clientsAffectedPercent: "20",
      counterpartsAffectedPercent: "35",
      transactionsCountPercent: "30",
      transactionsValuePercent: "25",
      relevantClientsAffected: false,
      durationHours: "30",
      downtimeHours: "6",
      memberStatesAffected: "3",
      dataLossDimensions: ["availability", "integrity"],
      dataLossAdverseImpact: true,
      criticalFunctionAffected: true,
      regulatedServicesAffected: true,
      maliciousUnauthorizedAccess: true,
      maliciousAccessDataLossPossible: true,
      reputationalImpactConditions: ["media_coverage", "repeated_complaints"],
      economicImpactEur: "750000",
    },
  },
  {
    id: "malicious-access",
    label: "Gezielter Angriff",
    hint: "erwartet: schwerwiegend (Art. 6 Buchst. c + Art. 8 Abs. 1 Buchst. a)",
    data: {
      description:
        "Böswilliger unbefugter Zugriff auf ein internes Auswertungssystem mit möglichem Datenverlust; keine kritische oder wichtige Funktion und keine regulierte Finanzdienstleistung unmittelbar beeinträchtigt.",
      clientsAffected: "",
      clientsAffectedPercent: "",
      counterpartsAffectedPercent: "",
      transactionsCountPercent: "",
      transactionsValuePercent: "",
      relevantClientsAffected: false,
      durationHours: "2",
      downtimeHours: "0",
      memberStatesAffected: "0",
      dataLossDimensions: ["confidentiality"],
      dataLossAdverseImpact: false,
      criticalFunctionAffected: false,
      regulatedServicesAffected: false,
      maliciousUnauthorizedAccess: true,
      maliciousAccessDataLossPossible: true,
      reputationalImpactConditions: [],
      economicImpactEur: "0",
    },
  },
  {
    id: "critical-single",
    label: "Kritisch, 1 Kriterium",
    hint: "erwartet: nicht schwerwiegend",
    data: {
      description:
        "Kritische Funktion betroffen, aber nur ein weiteres Kriterium erreicht die Schwelle.",
      clientsAffected: "",
      clientsAffectedPercent: "15",
      counterpartsAffectedPercent: "",
      transactionsCountPercent: "",
      transactionsValuePercent: "",
      relevantClientsAffected: false,
      durationHours: "1",
      downtimeHours: "0",
      memberStatesAffected: "0",
      dataLossDimensions: [],
      dataLossAdverseImpact: false,
      criticalFunctionAffected: true,
      regulatedServicesAffected: false,
      maliciousUnauthorizedAccess: false,
      maliciousAccessDataLossPossible: false,
      reputationalImpactConditions: [],
      economicImpactEur: "0",
    },
  },
  {
    id: "minor-glitch",
    label: "Kleinere Störung",
    hint: "erwartet: nicht schwerwiegend",
    data: {
      description:
        "Kurzzeitige Verzögerung im internen Reporting, keine Kundenauswirkung.",
      clientsAffected: "",
      clientsAffectedPercent: "",
      counterpartsAffectedPercent: "",
      transactionsCountPercent: "",
      transactionsValuePercent: "",
      relevantClientsAffected: false,
      durationHours: "1",
      downtimeHours: "0.5",
      memberStatesAffected: "0",
      dataLossDimensions: [],
      dataLossAdverseImpact: false,
      criticalFunctionAffected: false,
      regulatedServicesAffected: false,
      maliciousUnauthorizedAccess: false,
      maliciousAccessDataLossPossible: false,
      reputationalImpactConditions: [],
      economicImpactEur: "0",
    },
  },
];
