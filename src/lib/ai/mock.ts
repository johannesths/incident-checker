import {
  DORA_CRITERIA,
  DORA_THRESHOLDS,
  DATA_LOSS_DIMENSIONS,
  type DataLossDimension,
} from "@/lib/dora/criteria";
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

const DATA_LOSS_LABEL = Object.fromEntries(
  DATA_LOSS_DIMENSIONS.map((d) => [d.id, d.label]),
) as Record<DataLossDimension, string>;

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
          const counterpartsPct = input.counterpartsAffectedPercent ?? 0;
          const txCountPct = input.transactionsCountPercent ?? 0;
          const txValuePct = input.transactionsValuePercent ?? 0;
          const relevantAffected = Boolean(input.relevantClientsAffected);
          thresholdMet =
            clientsPct > DORA_THRESHOLDS.clientsPercent ||
            clients > DORA_THRESHOLDS.clientsAbsolute ||
            counterpartsPct > DORA_THRESHOLDS.counterpartsPercent ||
            txCountPct > DORA_THRESHOLDS.transactionsCountPercent ||
            txValuePct > DORA_THRESHOLDS.transactionsValuePercent ||
            relevantAffected;
          assessment =
            `Kunden: ${clients} (${clientsPct} %), Gegenparteien: ${counterpartsPct} %, ` +
            `Transaktionen: ${txCountPct} % (Anzahl) / ${txValuePct} % (Wert)` +
            (relevantAffected
              ? ", als relevant identifizierte Kunden/Gegenparteien betroffen"
              : "");
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
        case "data_losses": {
          const dims = input.dataLossDimensions ?? [];
          const adverseImpact = Boolean(input.dataLossAdverseImpact);
          // Art. 9 Abs. 5 Buchst. a: Beeinträchtigung allein genügt nicht –
          // erst nachteilige Auswirkungen auf Geschäftsziele oder
          // regulatorische Anforderungen erreichen die Schwelle.
          thresholdMet = dims.length > 0 && adverseImpact;
          assessment =
            dims.length === 0
              ? "Keine Datenbeeinträchtigung angegeben."
              : `Beeinträchtigt: ${dims.map((d) => DATA_LOSS_LABEL[d]).join(", ")} – ` +
                (adverseImpact
                  ? "mit nachteiligen Auswirkungen auf Geschäftsziele/regulatorische Anforderungen (Art. 9 Abs. 5 Buchst. a erfüllt)."
                  : "ohne nachteilige Auswirkungen auf Geschäftsziele/regulatorische Anforderungen (Schwelle nicht erreicht).");
          break;
        }
        case "critical_services": {
          const conditions = [
            input.criticalFunctionAffected &&
              "kritische/wichtige Funktion betroffen (Buchst. a)",
            input.regulatedServicesAffected &&
              "regulierte Finanzdienstleistung betroffen (Buchst. b)",
            input.maliciousUnauthorizedAccess &&
              "erfolgreicher böswilliger unbefugter Zugriff (Buchst. c)",
          ].filter((c): c is string => Boolean(c));
          thresholdMet = conditions.length > 0;
          assessment = thresholdMet
            ? `Art. 6 RTS erfüllt: ${conditions.join("; ")}.`
            : "Kein Tatbestand des Art. 6 RTS als erfüllt markiert.";
          break;
        }
        case "economic_impact":
          thresholdMet = (input.economicImpactEur ?? 0) > DORA_THRESHOLDS.economicImpactEur;
          assessment = `Geschätzte Kosten/Verluste: ${input.economicImpactEur ?? 0} EUR`;
          break;
        case "reputational_impact": {
          const level = input.reputationalImpactLevel ?? "none";
          thresholdMet = level === "significant";
          assessment =
            level === "significant"
              ? "Erhebliche Reputationsauswirkung."
              : level === "low"
                ? "Geringe Reputationsauswirkung."
                : "Keine Reputationsauswirkung angegeben.";
          break;
        }
      }

      return { criterionId: criterion.id, thresholdMet, assessment };
    });

    const metCount = findings.filter((f) => f.thresholdMet).length;
    // Erreichte Schwellen ohne das Kriterium "Kritikalität der Dienste" selbst.
    const otherMetCount = findings.filter(
      (f) => f.thresholdMet && f.criterionId !== "critical_services",
    ).length;

    // Klassifizierungslogik (Art. 8 Abs. 1 RTS):
    // 1. Ohne erfüllten Tatbestand des Kriteriums "Kritikalität der betroffenen
    //    Dienste" (Art. 6: kritische/wichtige Funktion, regulierte
    //    Finanzdienstleistung oder böswilliger unbefugter Zugriff) nie
    //    schwerwiegend.
    // 2. Andernfalls schwerwiegend, wenn ein böswilliger unbefugter Zugriff mit
    //    möglichem Datenverlust vorliegt (Art. 9 Abs. 5 Buchst. b, Art. 8
    //    Abs. 1 Buchst. a) ODER mindestens zwei weitere Kriterien ihre Schwelle
    //    erreichen (Art. 8 Abs. 1 Buchst. b).
    const criticalityMet =
      Boolean(input.criticalFunctionAffected) ||
      Boolean(input.regulatedServicesAffected) ||
      Boolean(input.maliciousUnauthorizedAccess);
    const accessWithDataLossRisk =
      Boolean(input.maliciousUnauthorizedAccess) &&
      Boolean(input.maliciousAccessDataLossPossible);
    const major = criticalityMet && (accessWithDataLossRisk || otherMetCount >= 2);
    const classification = major ? "major" : "non_major";

    let summary: string;
    if (!criticalityMet) {
      summary =
        "Kein Tatbestand des Kriteriums „Kritikalität der betroffenen Dienste“ (Art. 6 RTS) erfüllt – " +
        `daher kein schwerwiegender Vorfall, unabhängig von den übrigen Kriterien (${metCount} von ${findings.length} erreicht). [Mock]`;
    } else if (accessWithDataLossRisk) {
      summary =
        "Erfolgreicher böswilliger unbefugter Zugriff auf die Netzwerk- und Informationssysteme, " +
        "der zu Datenverlusten führen kann – stets schwerwiegender Vorfall (Art. 8 Abs. 1 Buchst. a RTS). [Mock]";
    } else if (otherMetCount >= 2) {
      summary =
        `Kritikalitätskriterium erfüllt und ${otherMetCount} weitere Kriterien erreichen ihre Schwelle ` +
        `(${metCount} von ${findings.length} insgesamt). Einstufung als schwerwiegend (Art. 8 Abs. 1 Buchst. b RTS). [Mock]`;
    } else {
      summary =
        `Kritikalitätskriterium erfüllt, jedoch erreichen weniger als zwei weitere Kriterien ihre Schwelle ` +
        `(${otherMetCount} erreicht) und kein böswilliger Zugriff mit möglichem Datenverlust – daher kein schwerwiegender Vorfall. [Mock]`;
    }

    return {
      classification,
      findings,
      summary,
      confidence: 0.5,
    };
  }
}
