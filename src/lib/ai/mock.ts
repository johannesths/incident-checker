import {
  DORA_CRITERIA,
  DORA_THRESHOLDS,
  DATA_LOSS_DIMENSIONS,
  REPUTATION_CONDITIONS,
  GEO_IMPACT_AREAS,
  type DataLossDimension,
  type ReputationCondition,
  type GeoImpactArea,
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

const REPUTATION_LABEL = Object.fromEntries(
  REPUTATION_CONDITIONS.map((c) => [c.id, c.label]),
) as Record<ReputationCondition, string>;

const GEO_AREA_LABEL = Object.fromEntries(
  GEO_IMPACT_AREAS.map((a) => [a.id, a.label]),
) as Record<GeoImpactArea, string>;

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
          "Die Beschreibung deutet auf ein Standard-Supportanliegen hin (z. B. Zugang/Hardware).",
        confidence: 0.6,
        openQuestions: [],
        manipulationDetected: false,
        source: "rules",
      };
    }

    if (looksLikeIncident) {
      return {
        isIncident: true,
        recommendation:
          "Möglicher IKT-bezogener Vorfall – an das Incident-Response-Team weiterleiten und Schweregrad bestimmen.",
        reasoning:
          "Die Beschreibung enthält Hinweise auf eine Störung oder einen sicherheitsrelevanten Vorfall.",
        confidence: 0.65,
        openQuestions: [],
        manipulationDetected: false,
        source: "rules",
      };
    }

    return {
      isIncident: false,
      recommendation: "Unklar – bitte zusätzliche Informationen einholen.",
      reasoning:
        "Aus der Beschreibung lässt sich keine eindeutige Einordnung ableiten.",
      confidence: 0.4,
      openQuestions: [],
      manipulationDetected: false,
      source: "rules",
    };
  }
}

export class MockSeverityService implements SeverityService {
  async assess(input: SeverityInput): Promise<SeverityResult> {
    const findings: CriterionFinding[] = DORA_CRITERIA.map((criterion) => {
      let thresholdMet = false;
      let assessment = "Keine ausreichenden Angaben zur Bewertung.";

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
        case "duration_downtime": {
          const duration = input.durationHours ?? 0;
          const downtime = input.downtimeHours ?? 0;
          // Die Ausfallzeit-Schwelle des Art. 9 Abs. 3 Buchst. b gilt nur für
          // IKT-Dienste, die kritische oder wichtige Funktionen unterstützen
          // (vgl. Art. 6 Buchst. a).
          const downtimeApplies = Boolean(input.criticalFunctionAffected);
          thresholdMet =
            duration > DORA_THRESHOLDS.durationHours ||
            (downtimeApplies && downtime > DORA_THRESHOLDS.downtimeHours);
          assessment =
            `Dauer: ${duration} h, Ausfallzeit: ${downtime} h` +
            (!downtimeApplies && downtime > DORA_THRESHOLDS.downtimeHours
              ? " – Ausfallzeit-Schwelle nicht anwendbar, da kein IKT-Dienst kritischer/wichtiger Funktionen betroffen."
              : "");
          break;
        }
        case "geographical_spread": {
          const states = input.memberStatesAffected ?? 0;
          const areas = input.geoImpactAreas ?? [];
          const countMet = states >= DORA_THRESHOLDS.memberStates;
          // Art. 9 Abs. 4 verlangt Auswirkungen in ≥ 2 Mitgliedstaaten "nach
          // Maßgabe des Art. 4" – also erhebliche Auswirkungen auf mindestens
          // einen der dort genannten Bereiche.
          thresholdMet = countMet && areas.length > 0;
          assessment =
            `Betroffene Mitgliedstaaten: ${states}` +
            (areas.length
              ? `, erhebliche Auswirkungen auf: ${areas.map((a) => GEO_AREA_LABEL[a]).join(", ")}`
              : "") +
            (countMet && areas.length === 0
              ? " – Schwelle nicht erreicht, da keine erheblichen Auswirkungen in anderen Mitgliedstaaten angegeben."
              : "");
          break;
        }
        case "data_losses": {
          const dims = input.dataLossDimensions ?? [];
          const adverseImpact = Boolean(input.dataLossAdverseImpact);
          // Art. 9 Abs. 5 Buchst. b: Ein böswilliger unbefugter Zugriff, der zu
          // Datenverlusten führen kann, erreicht die Schwelle für sich genommen
          // – unabhängig von den angegebenen Schutzzielen.
          const accessWithDataLossRisk =
            Boolean(input.maliciousUnauthorizedAccess) &&
            Boolean(input.maliciousAccessDataLossPossible);
          // Art. 9 Abs. 5 Buchst. a: Beeinträchtigung allein genügt nicht –
          // erst nachteilige Auswirkungen auf Geschäftsziele oder
          // regulatorische Anforderungen erreichen die Schwelle.
          thresholdMet = (dims.length > 0 && adverseImpact) || accessWithDataLossRisk;
          const dimensionNote =
            dims.length === 0
              ? "Keine Datenbeeinträchtigung angegeben."
              : `Beeinträchtigt: ${dims.map((d) => DATA_LOSS_LABEL[d]).join(", ")} – ` +
                (adverseImpact
                  ? "mit nachteiligen Auswirkungen auf Geschäftsziele/regulatorische Anforderungen – Schwelle erreicht."
                  : "ohne nachteilige Auswirkungen auf Geschäftsziele/regulatorische Anforderungen (Schwelle nicht erreicht).");
          assessment = accessWithDataLossRisk
            ? `${dimensionNote} Böswilliger unbefugter Zugriff mit möglichem Datenverlust – Schwelle erreicht.`
            : dimensionNote;
          break;
        }
        case "critical_services": {
          const conditions = [
            input.criticalFunctionAffected &&
              "kritische/wichtige Funktion betroffen",
            input.regulatedServicesAffected &&
              "regulierte Finanzdienstleistung betroffen",
            input.maliciousUnauthorizedAccess &&
              "erfolgreicher böswilliger unbefugter Zugriff",
          ].filter((c): c is string => Boolean(c));
          thresholdMet = conditions.length > 0;
          assessment = thresholdMet
            ? `Erfüllt: ${conditions.join("; ")}.`
            : "Kein Tatbestand als erfüllt markiert.";
          break;
        }
        case "economic_impact":
          thresholdMet = (input.economicImpactEur ?? 0) > DORA_THRESHOLDS.economicImpactEur;
          assessment = `Geschätzte Kosten/Verluste: ${input.economicImpactEur ?? 0} EUR`;
          break;
        case "reputational_impact": {
          const conditions = input.reputationalImpactConditions ?? [];
          // Art. 9 Abs. 2: Schwelle erreicht, sobald eine Bedingung des
          // Art. 2 Abs. 1 Buchst. a–d erfüllt ist.
          thresholdMet = conditions.length > 0;
          assessment = conditions.length
            ? `Erfüllt: ${conditions.map((c) => REPUTATION_LABEL[c]).join(", ")}.`
            : "Keine Bedingung als erfüllt markiert.";
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
        "Kein Tatbestand des Kriteriums „Kritikalität der betroffenen Dienste“ erfüllt – " +
        `daher kein schwerwiegender Vorfall, unabhängig von den übrigen Kriterien (${metCount} von ${findings.length} erreicht).`;
    } else if (accessWithDataLossRisk) {
      summary =
        "Erfolgreicher böswilliger unbefugter Zugriff auf die Netzwerk- und Informationssysteme, " +
        "der zu Datenverlusten führen kann – stets schwerwiegender Vorfall.";
    } else if (otherMetCount >= 2) {
      summary =
        `Kritikalitätskriterium erfüllt und ${otherMetCount} weitere Kriterien erreichen ihre Schwelle ` +
        `(${metCount} von ${findings.length} insgesamt). Einstufung als schwerwiegend.`;
    } else {
      summary =
        `Kritikalitätskriterium erfüllt, jedoch erreichen weniger als zwei weitere Kriterien ihre Schwelle ` +
        `(${otherMetCount} erreicht) und kein böswilliger Zugriff mit möglichem Datenverlust – daher kein schwerwiegender Vorfall.`;
    }

    return {
      classification,
      findings,
      summary,
      confidence: 0.5,
    };
  }
}
