/**
 * Plausibilitätsprüfungen der Meldung.
 *
 * Die Delegierte Verordnung (EU) 2025/301 verlangt Angaben, die zueinander
 * passen müssen: Die Kriterien, auf deren Grundlage eingestuft wurde
 * (Art. 2 Buchst. d), müssen sich in den Angaben zu ihrer Erfüllung
 * wiederfinden (Art. 3 Buchst. d); Zeitpunkte müssen in einer möglichen
 * Reihenfolge stehen; eine Auswahl "Sonstiges" verlangt eine Angabe, welche.
 * Hinzu kommen die Fristen des Art. 5 – wer sie überschreitet, hat die Gründe
 * für die Verzögerung mitzuteilen (Art. 5 Abs. 3).
 *
 * Die Prüfungen laufen im Formular (als Hinweis) und in der API (vor der
 * Übermittlung) – deshalb liegen sie hier und nicht in der Seite.
 */

import type { ReportInput } from "@/lib/schemas";
import {
  coversArticle,
  initialReportDeadline,
  isFollowUp,
} from "./reporting";
import {
  EXTERNAL_ORIGINS,
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
  /** Fundstelle der Angabe, auf die sich der Befund bezieht. */
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
  const article3 = coversArticle(input.reportType, 3);
  const article4 = coversArticle(input.reportType, 4);

  /* --- Art. 1 und 2 -------------------------------------------------------- */

  if (
    input.aggregatedEntityNames.trim().length > 0 !==
    input.aggregatedEntityLeis.trim().length > 0
  ) {
    add(
      "aggregated_mismatch",
      "error",
      "Art. 1 Buchst. d",
      "Zu einer aggregierten Meldung gehören Namen und LEI-Codes aller erfassten Finanzunternehmen.",
    );
  }

  if (
    input.aggregatedEntityNames.trim() &&
    input.aggregatedEntityNames.split(";").length !==
      input.aggregatedEntityLeis.split(";").length
  ) {
    add(
      "aggregated_count_mismatch",
      "error",
      "Art. 1 Buchst. d",
      "Die Reihenfolge der LEI-Codes muss der Reihenfolge der Namen entsprechen – es sind unterschiedlich viele Einträge angegeben.",
    );
  }

  if (input.submittingEntityName.trim() !== "" && !input.submittingEntityCode) {
    add(
      "submitter_without_code",
      "error",
      "Art. 1 Buchst. c",
      "Übermittelt ein anderes Unternehmen die Meldung, sind Name und Identifikationscode anzugeben.",
    );
  }

  if (isFollowUp(input.reportType) && !input.authorityReferenceCode.trim()) {
    add(
      "missing_authority_reference",
      "error",
      "Art. 3 Buchst. a",
      "Folgemeldungen führen den Referenzcode, den die zuständige Behörde für den Vorfall mitgeteilt hat.",
    );
  }

  const detectedAt = toDate(input.detectedAt);
  const classifiedAt = toDate(input.classifiedAt);
  if (detectedAt && classifiedAt && classifiedAt < detectedAt) {
    add(
      "classified_before_detected",
      "error",
      "Art. 2 Buchst. b",
      "Die Einstufung als schwerwiegend kann nicht vor der Erkennung des Vorfalls liegen.",
    );
  }

  // Art. 5 Abs. 1 Buchst. a und Abs. 2 – Fälligkeit der Erstmeldung; Abs. 3
  // verlangt bei Überschreitung die Mitteilung der Gründe.
  if (input.reportType === "initial" && detectedAt && classifiedAt) {
    const deadline = initialReportDeadline(detectedAt, classifiedAt);
    if (now > deadline.dueAt && !input.delayReason.trim()) {
      add(
        "late_initial_report",
        "warning",
        "Art. 5 Abs. 3",
        `Die Frist für die Erstmeldung ist abgelaufen (${deadline.basis}). Teilen Sie der Behörde die Gründe für die Verzögerung mit.`,
      );
    }
  }

  if (input.reclassifiedAsNonMajor && !input.reclassificationDetails.trim()) {
    add(
      "reclassification_without_details",
      "error",
      "Art. 2 Buchst. i",
      "Zur Neueinstufung als nicht schwerwiegend gehören die Gründe, aus denen der Vorfall die Einstufungskriterien nicht mehr erfüllt.",
    );
  }

  if (input.reclassifiedAsNonMajor && criteria.length > 0) {
    add(
      "reclassification_with_criteria",
      "warning",
      "Art. 2 Buchst. d",
      "Der Vorfall ist als nicht schwerwiegend neu eingestuft, es sind aber weiterhin Einstufungskriterien angegeben.",
    );
  }

  // Art. 8 Abs. 1 DelVO (EU) 2024/1772: Ohne betroffene kritische Dienste
  // liegt kein schwerwiegender Vorfall vor.
  if (
    input.classification === "major" &&
    !input.reclassifiedAsNonMajor &&
    !criteria.includes("critical_services")
  ) {
    add(
      "missing_critical_services",
      "error",
      "Art. 2 Buchst. d",
      "Das Kriterium „Kritikalität der betroffenen Dienste“ ist Voraussetzung jedes schwerwiegenden Vorfalls (Art. 8 Abs. 1 DelVO (EU) 2024/1772).",
    );
  }

  // Art. 9 Abs. 4 DelVO (EU) 2024/1772: Die geografische Ausbreitung setzt
  // Auswirkungen in mindestens zwei Mitgliedstaaten voraus.
  const states = input.affectedMemberStates.length;
  if (states > 1 && !criteria.includes("geographical_spread")) {
    add(
      "states_without_criterion",
      "error",
      "Art. 2 Buchst. d",
      "Bei Auswirkungen in mehr als einem Mitgliedstaat ist auch das Kriterium „Geografische Ausbreitung“ anzugeben.",
    );
  }
  if (criteria.includes("geographical_spread") && states < 2) {
    add(
      "criterion_without_states",
      "error",
      "Art. 2 Buchst. e",
      "Das Kriterium „Geografische Ausbreitung“ setzt Auswirkungen in mindestens zwei Mitgliedstaaten voraus – bitte geben Sie diese an.",
    );
  }

  const externalOrigin =
    input.incidentOrigin !== null &&
    input.incidentOrigin !== undefined &&
    EXTERNAL_ORIGINS.includes(input.incidentOrigin);

  if (externalOrigin && !input.originEntityDetails.trim()) {
    add(
      "origin_unnamed",
      "error",
      "Art. 2 Buchst. g",
      "Zum Ursprung bei einem Dritten gehören dessen Name, Identifikationscode und die Art des Codes.",
    );
  }

  if (!article3) return checks;

  /* --- Art. 3 -------------------------------------------------------------- */

  const occurredAt = toDate(input.occurredAt);
  const resumedAt = toDate(input.regularOperationsResumedAt);
  if (occurredAt && detectedAt && occurredAt > detectedAt) {
    add(
      "occurred_after_detected",
      "error",
      "Art. 3 Buchst. b",
      "Der Vorfall kann nicht nach seiner Erkennung eingetreten sein.",
    );
  }
  if (resumedAt && occurredAt && resumedAt < occurredAt) {
    add(
      "resumed_before_occurred",
      "error",
      "Art. 3 Buchst. c",
      "Der reguläre Geschäftsbetrieb kann nicht vor dem Eintreten des Vorfalls wiederaufgenommen worden sein.",
    );
  }

  const duration = toNumber(input.durationHours);
  const downtime = toNumber(input.downtimeHours);
  if (duration !== null && downtime !== null && downtime > duration) {
    add(
      "downtime_exceeds_duration",
      "warning",
      "Art. 3 Buchst. d",
      "Die Ausfallzeit übersteigt die Dauer des Vorfalls. Beide Angaben sind voneinander abzugrenzen (Art. 3 DelVO (EU) 2024/1772) – bitte prüfen Sie sie.",
    );
  }

  if (input.reputationalImpactConditions.length > 0) {
    if (!criteria.includes("reputational_impact")) {
      add(
        "reputation_without_criterion",
        "warning",
        "Art. 2 Buchst. d",
        "Zum Reputationsschaden liegen Angaben vor – prüfen Sie, ob das Kriterium „Reputationsauswirkung“ zur Einstufung geführt hat.",
      );
    }
    if (!input.reputationalImpactContext.trim()) {
      add(
        "reputation_without_context",
        "warning",
        "Art. 3 Buchst. d",
        "Bitte erläutern Sie den Reputationsschaden: Medien und ihre Reichweite, Kundenbeschwerden, nicht erfüllte regulatorische Anforderungen.",
      );
    }
  }

  if (input.memberStateImpactTypes.length > 0) {
    if (!criteria.includes("geographical_spread")) {
      add(
        "impact_types_without_criterion",
        "warning",
        "Art. 2 Buchst. d",
        "Zu den Auswirkungen in anderen Mitgliedstaaten liegen Angaben vor – prüfen Sie das Kriterium „Geografische Ausbreitung“.",
      );
    }
    if (!input.memberStateImpactDescription.trim()) {
      add(
        "impact_without_description",
        "warning",
        "Art. 3 Buchst. d",
        "Bitte beschreiben Sie Auswirkungen und Schwere je betroffenem Mitgliedstaat.",
      );
    }
  }

  if (input.dataLossDimensions.length > 0) {
    if (!criteria.includes("data_losses")) {
      add(
        "data_loss_without_criterion",
        "warning",
        "Art. 2 Buchst. d",
        "Zu Datenverlusten liegen Angaben vor – prüfen Sie, ob das Kriterium „Datenverluste“ zur Einstufung geführt hat.",
      );
    }
    if (!input.dataLossDescription.trim()) {
      add(
        "data_loss_without_description",
        "warning",
        "Art. 3 Buchst. d",
        "Bitte teilen Sie mit, welche Daten betroffen sind und welche Folgen die Beeinträchtigung für Geschäftsziele oder regulatorische Anforderungen hat.",
      );
    }
  }

  if (
    criteria.includes("critical_services") &&
    !input.criticalServicesDescription.trim()
  ) {
    add(
      "critical_services_without_description",
      "warning",
      "Art. 3 Buchst. d",
      "Bitte benennen Sie die betroffenen kritischen Dienste in Klarschrift.",
    );
  }

  if (externalOrigin && !input.incidentTypes.includes("external_event")) {
    add(
      "origin_not_external_type",
      "warning",
      "Art. 3 Buchst. e",
      "Ein Vorfall mit Ursprung bei einem Dritten ist zusätzlich als „Externes Ereignis“ zu kennzeichnen.",
    );
  }

  if (input.incidentTypes.includes("other") && !input.incidentTypeOther.trim()) {
    add(
      "incident_type_unspecified",
      "error",
      "Art. 3 Buchst. e",
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
      "Art. 3 Buchst. f",
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
      "Art. 3 Buchst. j",
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
      "Art. 3 Buchst. j",
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
      "Art. 3 Buchst. h",
      "Bitte benennen Sie die betroffenen Infrastrukturkomponenten in Klarschrift.",
    );
  }

  if (!input.temporaryMeasuresDescription.trim()) {
    add(
      "temporary_measures_without_description",
      "warning",
      "Art. 3 Buchst. k",
      input.temporaryMeasuresTaken
        ? "Bitte beschreiben Sie die ergriffenen oder geplanten befristeten Maßnahmen samt Zeitpunkt der Umsetzung."
        : "Wurden keine befristeten Maßnahmen ergriffen, ist der Grund anzugeben.",
    );
  }

  if (!article4) return checks;

  /* --- Art. 4 -------------------------------------------------------------- */

  const resolvedAt = toDate(input.incidentResolvedAt);
  const causeAddressedAt = toDate(input.rootCauseAddressedAt);
  if (resolvedAt && occurredAt && resolvedAt < occurredAt) {
    add(
      "resolved_before_occurred",
      "error",
      "Art. 4 Buchst. b",
      "Die Behebung des Vorfalls kann nicht vor seinem Eintreten liegen.",
    );
  }
  if (causeAddressedAt && occurredAt && causeAddressedAt < occurredAt) {
    add(
      "cause_addressed_before_occurred",
      "error",
      "Art. 4 Buchst. b",
      "Die Beseitigung der Ursache kann nicht vor dem Eintreten des Vorfalls liegen.",
    );
  }

  // Die Dauer misst den Zeitraum vom Eintreten bis zur Behebung
  // (Art. 3 Abs. 1 DelVO (EU) 2024/1772); Schätzungen sind in der
  // Abschlussmeldung zu korrigieren.
  if (duration !== null && occurredAt && resolvedAt) {
    const actualHours = (resolvedAt.getTime() - occurredAt.getTime()) / HOUR_MS;
    if (Math.abs(actualHours - duration) > 1) {
      add(
        "duration_mismatch",
        "warning",
        "Art. 3 Buchst. d",
        `Die angegebene Dauer weicht vom Zeitraum zwischen Eintreten und Behebung (${actualHours.toFixed(1)} Stunden) ab.`,
      );
    }
  }

  // Die Ursachen sind dreistufig einzustufen; die weitergehende Einstufung ist
  // Pflicht, sobald die gewählte Detailursache sie vorsieht.
  const selectedCategories = new Set<string>(input.rootCauseCategories);
  for (const detailId of input.rootCauseDetails) {
    if (!selectedCategories.has(categoryOf(detailId))) {
      add(
        "detail_without_category",
        "error",
        "Art. 4 Buchst. a",
        "Es ist eine detaillierte Ursache ausgewählt, deren übergeordnete Kategorie fehlt.",
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
          "Art. 4 Buchst. a",
          `Zur Ursache „${detail.label}“ ist die weitergehende Einstufung anzugeben.`,
        );
      }
    }
    if (detail?.id === "other" && !input.rootCauseOther.trim()) {
      add(
        "root_cause_unspecified",
        "error",
        "Art. 4 Buchst. a",
        "Bitte geben Sie die sonstige Art der Ursache an.",
      );
    }
  }
  if (input.rootCauseCategories.length > 0 && !input.rootCauseDescription.trim()) {
    add(
      "root_cause_without_description",
      "error",
      "Art. 4 Buchst. a",
      "Zur Einstufung der Ursachen gehört die Abfolge der Ereignisse, die zum Vorfall geführt haben.",
    );
  }

  if (externalOrigin && !input.rootCauseCategories.includes("external_event")) {
    add(
      "origin_not_external_cause",
      "warning",
      "Art. 4 Buchst. a",
      "Ein Vorfall mit Ursprung bei einem Dritten ist als „Externes Ereignis“ einzustufen.",
    );
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
      "Art. 2 Buchst. d",
      "Die angegebenen Kosten und Verluste überschreiten die Schwelle des Kriteriums „Wirtschaftliche Auswirkung“ – prüfen Sie die Einstufung.",
    );
  }
  if (grossCosts !== null && recoveries !== null && recoveries > grossCosts) {
    add(
      "recoveries_exceed_costs",
      "warning",
      "Art. 4 Buchst. e",
      "Die finanziellen Wiedereinziehungen übersteigen die Kosten und Verluste. Diese sind brutto, also ohne Verrechnung der Wiedereinziehungen anzugeben.",
    );
  }

  if (input.recurringIncidents && !input.firstRecurringIncidentAt) {
    add(
      "recurring_without_date",
      "error",
      "Art. 4 Buchst. f",
      "Bei wiederholten Vorfällen sind Datum und Uhrzeit des ersten Vorfalls anzugeben.",
    );
  }

  return checks;
}

/** Befunde, die eine Übermittlung ausschließen. */
export function blockingChecks(checks: ReportCheck[]): ReportCheck[] {
  return checks.filter((c) => c.severity === "error");
}
