/**
 * Plausibilitätsprüfungen der Vorfallmeldung.
 *
 * Das Meldeformular verlangt an mehreren Stellen, dass Angaben zueinander
 * passen: Die in Feld 2.5 gewählten Klassifikationskriterien müssen zu den
 * Schwellenwertangaben der übrigen Felder passen, Zeitpunkte müssen in einem
 * plausiblen Verhältnis stehen, und "Sonstiges"-Auswahlen sind zu
 * spezifizieren. Die Regeln stammen aus den "Ergänzungen durch die BaFin" zu
 * den einzelnen Feldern sowie aus Anhang II der Durchführungsverordnung (EU)
 * 2025/302.
 *
 * Die Prüfungen laufen im Formular (als Hinweis) und in der API (vor der
 * Übermittlung) – deshalb liegen sie hier und nicht in der Seite.
 */

import type { ReportInput } from "@/lib/schemas";
import { coversSection, isFollowUp } from "./reporting";
import {
  INITIAL_DEADLINE_AFTER_CLASSIFICATION_HOURS,
  INITIAL_DEADLINE_AFTER_DETECTION_HOURS,
  ROOT_CAUSE_BY_ID,
  type RootCauseCategory,
} from "./report-fields";
import { DORA_THRESHOLDS } from "./criteria";

/**
 * "error": Die Angaben widersprechen einander; die Meldung wird so nicht
 * angenommen. "warning": Die Angaben sind zulässig, aber erklärungsbedürftig.
 */
export type CheckSeverity = "error" | "warning";

export interface ReportCheck {
  id: string;
  severity: CheckSeverity;
  /** Feldnummer des Meldeformulars, auf die sich der Befund bezieht. */
  field: string;
  message: string;
}

const HOUR_MS = 60 * 60 * 1000;

function toNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Kategorie einer zusammengesetzten Detailkennung ("kategorie.detail"). */
function categoryOf(detailId: string): string {
  return detailId.split(".")[0] ?? "";
}

export function checkReport(
  input: ReportInput,
  now: Date = new Date(),
): ReportCheck[] {
  const checks: ReportCheck[] = [];
  const add = (
    id: string,
    severity: CheckSeverity,
    field: string,
    message: string,
  ) => checks.push({ id, severity, field, message });

  const criteria = input.classificationCriteria;
  const section3 = coversSection(input.reportType, 3);
  const section4 = coversSection(input.reportType, 4);

  /* --- Abschnitt 1 und 2 -------------------------------------------------- */

  if (isFollowUp(input.reportType) && !input.bafinIncidentId.trim()) {
    add(
      "missing_incident_id",
      "error",
      "3.1",
      "Folgemeldungen verweisen auf die Vorgangsnummer, die die Behörde mit der Erstmeldung vergeben hat.",
    );
  }

  if (input.reportingCurrency !== "EUR" && !input.additionalInformation.trim()) {
    add(
      "currency_reason",
      "warning",
      "2.10",
      "Eine von EUR abweichende Berichtswährung ist in Feld 2.10 zu begründen.",
    );
  }

  const detectedAt = toDate(input.detectedAt);
  const classifiedAt = toDate(input.classifiedAt);
  if (detectedAt && classifiedAt && classifiedAt < detectedAt) {
    add(
      "classified_before_detected",
      "error",
      "2.3",
      "Die Einstufung als schwerwiegend kann nicht vor der Entdeckung des Vorfalls liegen.",
    );
  }

  // Art. 19 Abs. 4 Buchst. a DORA: 4 Stunden nach der Einstufung, jedenfalls
  // 24 Stunden nach der Entdeckung. Eine Überschreitung ist zu begründen.
  if (input.reportType === "initial" && !input.additionalInformation.trim()) {
    const lateAfterDetection =
      detectedAt !== null &&
      now.getTime() - detectedAt.getTime() >
        INITIAL_DEADLINE_AFTER_DETECTION_HOURS * HOUR_MS;
    const lateAfterClassification =
      classifiedAt !== null &&
      now.getTime() - classifiedAt.getTime() >
        INITIAL_DEADLINE_AFTER_CLASSIFICATION_HOURS * HOUR_MS;
    if (lateAfterDetection || lateAfterClassification) {
      add(
        "late_initial_report",
        "warning",
        "2.10",
        `Die Erstmeldung liegt außerhalb der Frist (${INITIAL_DEADLINE_AFTER_CLASSIFICATION_HOURS} Stunden nach der Einstufung, spätestens ${INITIAL_DEADLINE_AFTER_DETECTION_HOURS} Stunden nach der Entdeckung). Bitte begründen Sie die Verzögerung in Feld 2.10.`,
      );
    }
  }

  if (
    input.reportType === "reclassification" &&
    !input.additionalInformation.trim()
  ) {
    add(
      "reclassification_reason",
      "error",
      "2.10",
      "Bei einer Rückstufung sind in Feld 2.10 die Gründe darzulegen, aus denen der Vorfall die Einstufungskriterien nicht mehr erfüllt.",
    );
  }

  // BaFin zu 2.5: Ohne das Kriterium "Betroffene kritische Dienstleistungen"
  // liegt nie ein schwerwiegender Vorfall vor (Art. 8 Abs. 1 RTS).
  if (
    input.classification === "major" &&
    input.reportType !== "reclassification" &&
    !criteria.includes("critical_services")
  ) {
    add(
      "missing_critical_services",
      "error",
      "2.5",
      "Das Kriterium „Kritikalität der betroffenen Dienste“ ist bei jedem meldepflichtigen Vorfall auszuwählen (Art. 8 Abs. 1 RTS).",
    );
  }

  // BaFin zu 2.6: Deutschland zählt selbst als betroffener Mitgliedstaat.
  const states = input.affectedMemberStates.length;
  if (states > 1 && !criteria.includes("geographical_spread")) {
    add(
      "states_without_criterion",
      "error",
      "2.5",
      "Bei Auswirkungen in mehr als einem Mitgliedstaat ist in Feld 2.5 zusätzlich „Geografische Ausbreitung“ auszuwählen.",
    );
  }
  if (criteria.includes("geographical_spread") && states < 2) {
    add(
      "criterion_without_states",
      "error",
      "2.6",
      "Das Kriterium „Geografische Ausbreitung“ setzt Auswirkungen in mindestens zwei Mitgliedstaaten voraus – bitte wählen Sie diese in Feld 2.6 aus.",
    );
  }

  if (input.originatesFromThirdParty && !input.thirdPartyDetails.trim()) {
    add(
      "third_party_unnamed",
      "error",
      "2.8",
      "Bitte nennen Sie den Dritten mit vollständiger Bezeichnung, Identifikationscode und Art des Codes.",
    );
  }

  if (input.businessContinuityActivated && !input.additionalInformation.trim()) {
    add(
      "continuity_reason",
      "warning",
      "2.10",
      "Die Gründe für die Aktivierung des Geschäftsfortführungsplans sind in Feld 2.10 zu erläutern.",
    );
  }

  if (!section3) return checks;

  /* --- Abschnitt 3 --------------------------------------------------------- */

  const occurredAt = toDate(input.occurredAt);
  const restoredAt = toDate(input.servicesRestoredAt);
  if (occurredAt && detectedAt && occurredAt > detectedAt) {
    add(
      "occurred_after_detected",
      "error",
      "3.2",
      "Der Vorfall kann nicht nach seiner Entdeckung eingetreten sein.",
    );
  }
  if (restoredAt && occurredAt && restoredAt < occurredAt) {
    add(
      "restored_before_occurred",
      "error",
      "3.3",
      "Die Wiederherstellung der Dienste kann nicht vor dem Eintreten des Vorfalls liegen.",
    );
  }

  const duration = toNumber(input.durationHours);
  const downtime = toNumber(input.downtimeHours);
  if (duration !== null && downtime !== null && downtime > duration) {
    add(
      "downtime_exceeds_duration",
      "warning",
      "3.16",
      "Die Ausfallzeit übersteigt die Dauer des Vorfalls. Beides ist voneinander abzugrenzen (Felder 3.15 und 3.16) – bitte prüfen Sie die Angaben.",
    );
  }

  if (input.reputationalImpactConditions.length > 0) {
    if (!criteria.includes("reputational_impact")) {
      add(
        "reputation_without_criterion",
        "warning",
        "2.5",
        "Zum Reputationsschaden liegen Angaben vor – prüfen Sie, ob das Kriterium „Reputationsauswirkung“ in Feld 2.5 auszuwählen ist.",
      );
    }
    if (!input.reputationalImpactContext.trim()) {
      add(
        "reputation_without_context",
        "warning",
        "3.14",
        "Bitte spezifizieren Sie die Auswirkungen auf die Reputation (Medienberichte, Kundenbeschwerden, nicht erfüllte Anforderungen).",
      );
    }
  }

  if (input.memberStateImpactTypes.length > 0) {
    if (!criteria.includes("geographical_spread")) {
      add(
        "impact_types_without_criterion",
        "warning",
        "2.5",
        "Zu den Auswirkungen in anderen Mitgliedstaaten liegen Angaben vor – prüfen Sie, ob das Kriterium „Geografische Ausbreitung“ auszuwählen ist.",
      );
    }
    if (!input.memberStateImpactDescription.trim()) {
      add(
        "impact_without_description",
        "warning",
        "3.19",
        "Bitte beschreiben Sie die Auswirkungen auf die in Feld 2.6 gewählten Mitgliedstaaten.",
      );
    }
  }

  if (input.dataLossDimensions.length > 0) {
    if (!criteria.includes("data_losses")) {
      add(
        "data_loss_without_criterion",
        "warning",
        "2.5",
        "Zu den Datenverlusten liegen Angaben vor – prüfen Sie, ob das Kriterium „Datenverluste“ in Feld 2.5 auszuwählen ist.",
      );
    }
    if (!input.dataLossDescription.trim()) {
      add(
        "data_loss_without_description",
        "warning",
        "3.21",
        "Bitte teilen Sie mit, welche Daten betroffen sind und welche Folgen die Beeinträchtigung hat.",
      );
    }
  }

  if (criteria.includes("critical_services") && !input.criticalServicesDescription.trim()) {
    add(
      "critical_services_without_description",
      "warning",
      "3.22",
      "Bitte benennen Sie die betroffenen kritischen Dienste in Klarschrift.",
    );
  }

  // BaFin zu 3.23: Ein Vorfall bei einem Dritten ist stets auch ein externes
  // Ereignis.
  if (
    input.originatesFromThirdParty &&
    !input.incidentTypes.includes("external_event")
  ) {
    add(
      "third_party_not_external",
      "warning",
      "3.23",
      "Vorfälle, die bei einem Dritten aufgetreten sind, sind zusätzlich als „Externes Ereignis“ zu kennzeichnen.",
    );
  }

  if (input.incidentTypes.includes("other") && !input.incidentTypeOther.trim()) {
    add(
      "incident_type_unspecified",
      "error",
      "3.24",
      "Bitte geben Sie die sonstige Art des Vorfalls an.",
    );
  }
  if (
    input.threatTechniques.includes("other") &&
    !input.threatTechniqueOther.trim()
  ) {
    add(
      "technique_unspecified",
      "error",
      "3.26",
      "Bitte geben Sie die sonstige Technik an.",
    );
  }
  if (
    input.notifiedAuthorities.includes("other") &&
    !input.notifiedAuthoritiesOther.trim()
  ) {
    add(
      "authority_unspecified",
      "error",
      "3.32",
      "Bitte geben Sie an, welche weitere Behörde informiert wurde.",
    );
  }
  if (
    input.notifiedAuthorities.includes("none") &&
    input.notifiedAuthorities.length > 1
  ) {
    add(
      "authorities_contradictory",
      "error",
      "3.31",
      "„Keine“ schließt die Angabe weiterer Behörden aus.",
    );
  }

  if (
    input.infrastructureAffected === "yes" &&
    !input.infrastructureDescription.trim()
  ) {
    add(
      "infrastructure_without_description",
      "warning",
      "3.29",
      "Bitte benennen Sie die betroffenen Infrastrukturkomponenten in Klarschrift.",
    );
  }

  if (!input.temporaryMeasuresDescription.trim()) {
    add(
      "temporary_measures_without_description",
      "warning",
      "3.34",
      input.temporaryMeasuresTaken
        ? "Bitte beschreiben Sie die ergriffenen oder geplanten Sofortmaßnahmen samt Zeitpunkt der Umsetzung."
        : "Wurden keine befristeten Maßnahmen ergriffen, ist der Grund anzugeben.",
    );
  }

  if (!section4) return checks;

  /* --- Abschnitt 4 --------------------------------------------------------- */

  const resolvedAt = toDate(input.incidentResolvedAt);
  const causeAddressedAt = toDate(input.rootCauseAddressedAt);
  if (resolvedAt && occurredAt && resolvedAt < occurredAt) {
    add(
      "resolved_before_occurred",
      "error",
      "4.8",
      "Die Behebung des Vorfalls kann nicht vor seinem Eintreten liegen.",
    );
  }
  if (causeAddressedAt && occurredAt && causeAddressedAt < occurredAt) {
    add(
      "cause_addressed_before_occurred",
      "error",
      "4.7",
      "Die Beseitigung der Ursache kann nicht vor dem Eintreten des Vorfalls liegen.",
    );
  }

  // Feld 3.15 meint den Zeitraum zwischen den Feldern 3.2 und 4.8.
  if (duration !== null && occurredAt && resolvedAt) {
    const actualHours =
      (resolvedAt.getTime() - occurredAt.getTime()) / HOUR_MS;
    if (Math.abs(actualHours - duration) > 1) {
      add(
        "duration_mismatch",
        "warning",
        "3.15",
        `Die angegebene Dauer weicht vom Zeitraum zwischen den Feldern 3.2 und 4.8 (${actualHours.toFixed(1)} Stunden) ab. Schätzungen sind in der Abschlussmeldung zu korrigieren.`,
      );
    }
  }

  // Ursachen: 4.2 nur innerhalb der in 4.1 gewählten Kategorien, 4.3 als
  // Pflichtangabe zu den Detailkategorien, die weiter aufzuschlüsseln sind.
  const selectedCategories = new Set<string>(input.rootCauseCategories);
  for (const detailId of input.rootCauseDetails) {
    if (!selectedCategories.has(categoryOf(detailId))) {
      add(
        "detail_without_category",
        "error",
        "4.2",
        "Es ist eine detaillierte Ursache ausgewählt, deren übergeordnete Kategorie in Feld 4.1 fehlt.",
      );
      break;
    }
  }
  for (const detailId of input.rootCauseDetails) {
    const category = ROOT_CAUSE_BY_ID[categoryOf(detailId) as RootCauseCategory];
    const detail = category?.details.find(
      (d) => `${category.id}.${d.id}` === detailId,
    );
    if (detail?.further && detail.further.length > 0) {
      const covered = input.rootCauseFurther.some((f) =>
        f.startsWith(`${detailId}.`),
      );
      if (!covered) {
        add(
          `further_required_${detailId}`,
          "error",
          "4.3",
          `Zur Ursache „${detail.label}“ ist die weitergehende Einstufung eine Pflichtangabe.`,
        );
      }
    }
    if (detail?.id === "other" && !input.rootCauseOther.trim()) {
      add(
        "root_cause_unspecified",
        "error",
        "4.4",
        "Bitte geben Sie die sonstige Art der Ursache an.",
      );
    }
  }
  if (input.rootCauseCategories.length > 0 && !input.rootCauseDescription.trim()) {
    add(
      "root_cause_without_description",
      "error",
      "4.5",
      "Die Ursachenanalyse ist wesentlicher Bestandteil der Abschlussmeldung; der Hinweis auf fehlende Erkenntnisse genügt nicht.",
    );
  }

  // BaFin zu 4.1: Vorfälle bei Dritten sind als externes Ereignis mit der
  // Detailursache "Ausfälle bei Dritten" einzustufen.
  if (input.originatesFromThirdParty) {
    if (!input.rootCauseCategories.includes("external_event")) {
      add(
        "third_party_not_external_cause",
        "warning",
        "4.1",
        "Bei einem Vorfall, der bei einem Dritten aufgetreten ist, ist in Feld 4.1 „Externes Ereignis“ auszuwählen.",
      );
    } else if (
      !input.rootCauseDetails.includes("external_event.third_party_outage")
    ) {
      add(
        "third_party_not_outage",
        "warning",
        "4.2",
        "Bei einem Vorfall, der bei einem Dritten aufgetreten ist, ist in Feld 4.2 „Ausfälle bei Dritten“ auszuwählen.",
      );
    }
  }

  const grossCosts = toNumber(input.grossCostsAndLosses);
  const recoveries = toNumber(input.financialRecoveries);
  if (
    grossCosts !== null &&
    grossCosts > DORA_THRESHOLDS.economicImpactEur &&
    !criteria.includes("economic_impact")
  ) {
    add(
      "costs_without_criterion",
      "warning",
      "2.5",
      "Die angegebenen Kosten und Verluste überschreiten die Schwelle des Kriteriums „Wirtschaftliche Auswirkung“ – prüfen Sie Feld 2.5.",
    );
  }
  if (grossCosts !== null && recoveries !== null && recoveries > grossCosts) {
    add(
      "recoveries_exceed_costs",
      "warning",
      "4.14",
      "Die finanziellen Rückflüsse übersteigen die Bruttokosten. Feld 4.13 ist brutto, also ohne Verrechnung von Rückflüssen anzugeben.",
    );
  }
  if (grossCosts !== null && grossCosts > 0 && !input.economicImpactDescription.trim()) {
    add(
      "costs_without_description",
      "warning",
      "4.12",
      "Bitte machen Sie nähere Angaben, wodurch die in Feld 4.13 angegebenen Kosten und Verluste entstanden sind.",
    );
  }

  if (input.recurringIncidents && !input.firstRecurringIncidentAt) {
    add(
      "recurring_without_date",
      "error",
      "4.16",
      "Bei wiederholten Vorfällen sind Datum und Uhrzeit des ersten Vorfalls anzugeben.",
    );
  }

  return checks;
}

/** Befunde, die eine Übermittlung ausschließen. */
export function blockingChecks(checks: ReportCheck[]): ReportCheck[] {
  return checks.filter((c) => c.severity === "error");
}
