import type { TriageInput } from "@/lib/schemas";

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
  transactionsAffected: string;
  durationHours: string;
  downtimeHours: string;
  memberStatesAffected: string;
  dataLosses: string;
  criticalServicesAffected: boolean;
  maliciousUnauthorizedAccess: boolean;
  reputationalImpact: string;
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
      transactionsAffected: "35000",
      durationHours: "30",
      downtimeHours: "6",
      memberStatesAffected: "3",
      dataLosses: "Verfügbarkeit beeinträchtigt, Integrität in Prüfung",
      criticalServicesAffected: true,
      maliciousUnauthorizedAccess: true,
      reputationalImpact: "Medienberichterstattung, zahlreiche Kundenbeschwerden",
      economicImpactEur: "750000",
    },
  },
  {
    id: "malicious-access",
    label: "Gezielter Angriff",
    hint: "erwartet: schwerwiegend (Override)",
    data: {
      description:
        "Böswilliger unbefugter Zugriff auf das Kernbankensystem mit möglichem Datenverlust, sonst geringe messbare Auswirkung.",
      clientsAffected: "",
      clientsAffectedPercent: "",
      transactionsAffected: "",
      durationHours: "2",
      downtimeHours: "0",
      memberStatesAffected: "0",
      dataLosses: "Mögliche Exfiltration vertraulicher Daten",
      criticalServicesAffected: true,
      maliciousUnauthorizedAccess: true,
      reputationalImpact: "",
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
      transactionsAffected: "",
      durationHours: "1",
      downtimeHours: "0",
      memberStatesAffected: "0",
      dataLosses: "",
      criticalServicesAffected: true,
      maliciousUnauthorizedAccess: false,
      reputationalImpact: "",
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
      transactionsAffected: "",
      durationHours: "1",
      downtimeHours: "0.5",
      memberStatesAffected: "0",
      dataLosses: "",
      criticalServicesAffected: false,
      maliciousUnauthorizedAccess: false,
      reputationalImpact: "",
      economicImpactEur: "0",
    },
  },
];
