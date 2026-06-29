import { DORA_CRITERIA, DORA_THRESHOLDS } from "@/lib/dora/criteria";
import type {
  TriageInput,
  TriageResult,
  SeverityInput,
  SeverityResult,
  CriterionFinding,
} from "@/lib/schemas";
import type { SeverityService, TriageService } from "./types";

/**
 * Platzhalter-Implementierungen mit deterministischer, regelbasierter Heuristik.
 *
 * Zweck: Die gesamte UI ist bereits ohne KI testbar. Die Heuristik ist bewusst
 * einfach und KEIN Ersatz für die spätere KI-/Fachbewertung.
 */

const SERVICE_DESK_HINTS = [
  "passwort",
  "kennwort",
  "drucker",
  "login",
  "anmeldung",
  "zugang vergessen",
  "software installation",
  "maus",
  "tastatur",
  "monitor",
];

const INCIDENT_HINTS = [
  "ausfall",
  "angriff",
  "ransomware",
  "phishing",
  "datenleck",
  "datenverlust",
  "unbefugt",
  "verschlüsselt",
  "kompromitt",
  "störung",
  "nicht erreichbar",
];

function includesAny(haystack: string, needles: string[]): boolean {
  const lower = haystack.toLowerCase();
  return needles.some((n) => lower.includes(n));
}

export class MockTriageService implements TriageService {
  async classify(input: TriageInput): Promise<TriageResult> {
    const text = `${input.description} ${input.symptoms} ${input.affectedSystem}`;
    const looksLikeServiceDesk = includesAny(text, SERVICE_DESK_HINTS);
    const looksLikeIncident = includesAny(text, INCIDENT_HINTS);

    if (looksLikeServiceDesk && !looksLikeIncident) {
      return {
        isIncident: false,
        recommendation: "Kein IKT-bezogener Vorfall – ServiceDesk ist verantwortlich.",
        reasoning:
          "Die Beschreibung deutet auf ein Standard-Supportanliegen hin (z. B. Zugang/Hardware). [Mock-Heuristik]",
        confidence: 0.6,
      };
    }

    if (looksLikeIncident) {
      return {
        isIncident: true,
        recommendation:
          "Möglicher IKT-bezogener Vorfall – an das Incident-Response-Team weiterleiten und Schweregrad bestimmen.",
        reasoning:
          "Die Beschreibung enthält Hinweise auf eine Störung oder einen sicherheitsrelevanten Vorfall. [Mock-Heuristik]",
        confidence: 0.65,
      };
    }

    return {
      isIncident: false,
      recommendation: "Unklar – bitte zusätzliche Informationen einholen.",
      reasoning:
        "Aus der Beschreibung lässt sich keine eindeutige Einordnung ableiten. [Mock-Heuristik]",
      confidence: 0.4,
    };
  }
}

export class MockSeverityService implements SeverityService {
  async assess(input: SeverityInput): Promise<SeverityResult> {
    const findings: CriterionFinding[] = DORA_CRITERIA.map((criterion) => {
      let thresholdMet = false;
      let assessment = "Keine ausreichenden Angaben zur Bewertung. [Mock]";

      switch (criterion.id) {
        case "clients_transactions": {
          const clients = input.clientsAffected ?? 0;
          const clientsPct = input.clientsAffectedPercent ?? 0;
          const transactions = input.transactionsAffected ?? 0;
          thresholdMet =
            clientsPct > DORA_THRESHOLDS.clientsPercent ||
            clients > DORA_THRESHOLDS.clientsAbsolute ||
            transactions > DORA_THRESHOLDS.transactions;
          assessment = `Betroffene Kunden: ${clients} (${clientsPct} %), Transaktionen: ${transactions}`;
          break;
        }
        case "duration_downtime":
          thresholdMet =
            (input.durationHours ?? 0) > DORA_THRESHOLDS.durationHours ||
            (input.downtimeHours ?? 0) > DORA_THRESHOLDS.downtimeHours;
          assessment = `Dauer: ${input.durationHours ?? 0} h, Ausfallzeit: ${input.downtimeHours ?? 0} h`;
          break;
        case "geographical_spread":
          thresholdMet = (input.memberStatesAffected ?? 0) >= DORA_THRESHOLDS.memberStates;
          assessment = `Betroffene Mitgliedstaaten: ${input.memberStatesAffected ?? 0}`;
          break;
        case "data_losses":
          thresholdMet = Boolean(input.dataLosses);
          assessment = input.dataLosses || "Keine Datenverluste angegeben.";
          break;
        case "critical_services":
          thresholdMet = Boolean(input.criticalServicesAffected);
          assessment = input.criticalServicesAffected
            ? "Kritische/wichtige Funktion betroffen."
            : "Keine kritische Funktion als betroffen markiert.";
          break;
        case "economic_impact":
          thresholdMet = (input.economicImpactEur ?? 0) > DORA_THRESHOLDS.economicImpactEur;
          assessment = `Geschätzte Kosten/Verluste: ${input.economicImpactEur ?? 0} EUR`;
          break;
        case "reputational_impact":
          thresholdMet = Boolean(input.reputationalImpact);
          assessment = input.reputationalImpact || "Keine Reputationsauswirkung angegeben.";
          break;
      }

      return { criterionId: criterion.id, thresholdMet, assessment };
    });

    const metCount = findings.filter((f) => f.thresholdMet).length;
    // Erreichte Schwellen ohne das Kriterium "Kritikalität der Dienste" selbst.
    const otherMetCount = findings.filter(
      (f) => f.thresholdMet && f.criterionId !== "critical_services",
    ).length;

    // Klassifizierungslogik:
    // 1. Ohne Betroffenheit einer kritischen/wichtigen Funktion nie schwerwiegend.
    // 2. Bei betroffener kritischer Funktion ist der Vorfall schwerwiegend, wenn
    //    entweder ein böswilliger unbefugter Zugriff mit möglichem Datenverlust
    //    vorliegt ODER mindestens zwei weitere Kriterien ihre Schwelle erreichen.
    const criticalAffected = Boolean(input.criticalServicesAffected);
    const maliciousAccess = Boolean(input.maliciousUnauthorizedAccess);
    const major = criticalAffected && (maliciousAccess || otherMetCount >= 2);
    const classification = major ? "major" : "non_major";

    let summary: string;
    if (!criticalAffected) {
      summary =
        "Keine kritische oder wichtige Funktion betroffen – daher kein schwerwiegender Vorfall, " +
        `unabhängig von den übrigen Kriterien (${metCount} von ${findings.length} erreicht). [Mock]`;
    } else if (maliciousAccess) {
      summary =
        "Böswilliger unbefugter Zugriff auf die Netzwerk- und Informationssysteme mit möglichem " +
        "Datenverlust bei betroffener kritischer Funktion – stets schwerwiegender Vorfall. [Mock]";
    } else if (otherMetCount >= 2) {
      summary =
        `Kritische Funktion betroffen und ${otherMetCount} weitere Kriterien erreichen ihre Schwelle ` +
        `(${metCount} von ${findings.length} insgesamt). Einstufung als schwerwiegend. [Mock]`;
    } else {
      summary =
        `Kritische Funktion betroffen, jedoch erreichen weniger als zwei weitere Kriterien ihre Schwelle ` +
        `(${otherMetCount} erreicht) und kein böswilliger Zugriff – daher kein schwerwiegender Vorfall. [Mock]`;
    }

    return {
      classification,
      findings,
      summary,
      confidence: 0.5,
    };
  }
}
