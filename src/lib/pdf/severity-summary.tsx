import { Text } from "@react-pdf/renderer";
import {
  CRITERION_BY_ID,
  DATA_LOSS_DIMENSIONS,
  GEO_IMPACT_AREAS,
  REPUTATION_CONDITIONS,
  type CriterionId,
  type DataLossDimension,
  type GeoImpactArea,
  type ReputationCondition,
} from "@/lib/dora/criteria";
import { CLASSIFICATION } from "@/lib/dora/presentation";
import {
  REPORT_TYPE_BY_ID,
  getReportObligation,
  type ObligationLevel,
} from "@/lib/dora/reporting";
import {
  entityTypeLabel,
  formatProfileNumber,
  type CompanyProfile,
} from "@/lib/company/profile";
import type { SeverityResult } from "@/lib/schemas";
import {
  Banner,
  Chip,
  Group,
  Paragraph,
  Row,
  Section,
  SummaryDocument,
  TitleBlock,
  formatNumber,
  labelsOf,
  yesNo,
  type Tone,
} from "./document";

/**
 * Der in Schritt 02 erfasste Stand, soweit die Zusammenfassung ihn zeigt – ein
 * lesender Ausschnitt des Entwurfs im sessionStorage (vgl. SeverityEcho in der
 * Meldung). Alles ist optional: Ein Entwurf aus einer früheren Fassung oder die
 * unmittelbare Einstufung bei böswilligem Zugriff füllen nicht jedes Feld.
 */
export interface SeveritySnapshot {
  gateAnswers?: Partial<
    Record<
      | "criticalFunctionAffected"
      | "regulatedServicesAffected"
      | "maliciousUnauthorizedAccess",
      boolean | null
    >
  >;
  dataLossAnswer?: boolean | null;
  form?: Partial<{
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
    geoImpactAreas: GeoImpactArea[];
    dataLossDimensions: DataLossDimension[];
    dataLossAdverseImpact: boolean | null;
    reputationalImpactConditions: ReputationCondition[];
    economicImpactEur: string;
  }>;
}

const CLASSIFICATION_TONE: Record<SeverityResult["classification"], Tone> = {
  major: "destructive",
  non_major: "success",
  indeterminate: "warning",
};

const OBLIGATION_TONE: Record<ObligationLevel, Tone> = {
  required: "destructive",
  unclear: "warning",
  none: "success",
};

function percent(value: string | undefined): string {
  return value && value.trim() !== "" ? `${formatNumber(value)} %` : "";
}

/**
 * Die zu einem Kriterium erfassten Angaben. Die Bezeichnungen folgen dem
 * Formular in Schritt 02.
 */
function CriterionInputs({
  id,
  snapshot,
}: {
  id: CriterionId;
  snapshot: SeveritySnapshot;
}) {
  const f = snapshot.form ?? {};
  const gates = snapshot.gateAnswers ?? {};
  switch (id) {
    case "clients_transactions":
      return (
        <>
          <Row
            label="Kunden (Anzahl)"
            value={formatNumber(f.clientsAffected)}
          />
          <Row
            label="Kunden (% der Dienstnutzer)"
            value={percent(f.clientsAffectedPercent)}
          />
          <Row
            label="Finanzielle Gegenparteien (%)"
            value={percent(f.counterpartsAffectedPercent)}
          />
          <Row
            label="Transaktionen (% der tägl. Ø-Anzahl)"
            value={percent(f.transactionsCountPercent)}
          />
          <Row
            label="Transaktionswert (% des tägl. Ø-Werts)"
            value={percent(f.transactionsValuePercent)}
          />
          <Row
            label="Relevante Kunden/Gegenparteien betroffen"
            value={yesNo(f.relevantClientsAffected ?? false)}
          />
        </>
      );
    case "reputational_impact":
      return (
        <Row
          label="Erfüllte Bedingungen"
          value={labelsOf(
            REPUTATION_CONDITIONS,
            f.reputationalImpactConditions,
          )}
        />
      );
    case "duration_downtime":
      return (
        <>
          <Row label="Dauer" value={formatNumber(f.durationHours, "Stunden")} />
          <Row
            label="Ausfallzeit krit./wichtiger Dienste"
            value={formatNumber(f.downtimeHours, "Stunden")}
          />
        </>
      );
    case "geographical_spread":
      return (
        <>
          <Row
            label="Mitgliedstaaten mit Auswirkungen"
            value={formatNumber(f.memberStatesAffected)}
          />
          <Row
            label="Erheblich betroffene Bereiche"
            value={labelsOf(GEO_IMPACT_AREAS, f.geoImpactAreas)}
          />
        </>
      );
    case "data_losses":
      return (
        <>
          <Row
            label="Betroffene Schutzziele"
            value={labelsOf(DATA_LOSS_DIMENSIONS, f.dataLossDimensions)}
          />
          <Row
            label="Nachteilige Auswirkungen auf Geschäftsziele oder regulatorische Anforderungen"
            value={yesNo(f.dataLossAdverseImpact)}
          />
          <Row
            label="Böswilliger Zugriff mit möglichem Datenverlust"
            value={yesNo(snapshot.dataLossAnswer)}
            optional
          />
        </>
      );
    case "critical_services":
      return (
        <>
          <Row
            label="Kritische oder wichtige Funktionen betroffen (Art. 6 Buchst. a)"
            value={yesNo(gates.criticalFunctionAffected)}
          />
          <Row
            label="Regulierte Finanzdienstleistungen betroffen (Art. 6 Buchst. b)"
            value={yesNo(gates.regulatedServicesAffected)}
          />
          <Row
            label="Erfolgreicher böswilliger unbefugter Zugriff (Art. 6 Buchst. c)"
            value={yesNo(gates.maliciousUnauthorizedAccess)}
          />
        </>
      );
    case "economic_impact":
      return (
        <Row
          label="Kosten und Verluste"
          value={formatNumber(f.economicImpactEur, "EUR")}
        />
      );
  }
}

/**
 * Zusammenfassung der Schweregradbestimmung: Gesamteinstufung, Meldepflicht,
 * Befund je Kriterium samt den erfassten Angaben.
 */
export function SeveritySummaryPdf({
  result,
  snapshot,
  profile,
  generatedAt,
}: {
  result: SeverityResult;
  snapshot?: SeveritySnapshot | null;
  profile?: CompanyProfile;
  generatedAt: Date;
}) {
  const tone = CLASSIFICATION[result.classification];
  const metCount = result.findings.filter((f) => f.thresholdMet).length;
  const obligation = getReportObligation(result.classification);
  const snap = snapshot ?? {};
  const description = snap.form?.description?.trim() ?? "";

  return (
    <SummaryDocument
      title="Einstufung nach DORA"
      subject="Zusammenfassung der Schweregradbestimmung"
      kind="Schritt 02 · Schweregradbestimmung"
      generatedAt={generatedAt}
    >
      <TitleBlock
        step="Schritt 02 · Ergebnis"
        title="Einstufung nach DORA"
        description="Gesamteinstufung und Bewertung der einzelnen Klassifizierungskriterien nach der Delegierten Verordnung (EU) 2024/1772."
      />

      <Banner
        tone={CLASSIFICATION_TONE[result.classification]}
        title={tone.label}
        subtitle={`${metCount} von ${result.findings.length} Kriterien erreichen die Schwelle`}
      >
        <Text>{result.summary}</Text>
      </Banner>

      <Section title="Meldepflicht" note="Art. 19 DORA">
        <Group
          title={obligation.label}
          trailing={
            <Chip tone={OBLIGATION_TONE[obligation.level]}>
              {obligation.level === "required"
                ? "Meldung erforderlich"
                : obligation.level === "unclear"
                  ? "Zu klären"
                  : "Keine Meldung"}
            </Chip>
          }
          text={obligation.explanation}
        >
          {obligation.level !== "none" && (
            <Row
              label={REPORT_TYPE_BY_ID.initial.label}
              value={REPORT_TYPE_BY_ID.initial.deadline}
            />
          )}
        </Group>
      </Section>

      {profile && (
        <Section title="Finanzunternehmen">
          <Row label="Name" value={profile.name} />
          <Row label="LEI" value={profile.lei} mono />
          <Row
            label="Art des Finanzunternehmens"
            value={entityTypeLabel(profile)}
          />
          <Row label="Zuständige Behörde" value={profile.competentAuthority} />
          <Row
            label="Referenzwerte"
            value={[
              formatProfileNumber(profile.totalClients) &&
                `${formatProfileNumber(profile.totalClients)} Kunden`,
              formatProfileNumber(profile.dailyTransactionsCount) &&
                `${formatProfileNumber(profile.dailyTransactionsCount)} Transaktionen täglich`,
              formatProfileNumber(profile.dailyTransactionsValueEur) &&
                `${formatProfileNumber(profile.dailyTransactionsValueEur)} EUR Transaktionswert täglich`,
              formatProfileNumber(profile.memberStatesOfOperation) &&
                `tätig in ${formatProfileNumber(profile.memberStatesOfOperation)} Mitgliedstaaten`,
            ].filter((v): v is string => Boolean(v))}
            optional
          />
        </Section>
      )}

      {description !== "" && (
        <Section title="Vorfall">
          <Paragraph value={description} />
        </Section>
      )}

      <Section
        title="Einzelkriterien"
        note="Befund je Klassifizierungskriterium mit den zugrunde liegenden Angaben"
      >
        {result.findings.map((finding) => (
          <Group
            key={finding.criterionId}
            title={CRITERION_BY_ID[finding.criterionId].label}
            trailing={
              <Chip tone={finding.thresholdMet ? "destructive" : "neutral"}>
                {finding.thresholdMet ? "Schwelle erreicht" : "Unkritisch"}
              </Chip>
            }
            text={finding.assessment}
          >
            <CriterionInputs id={finding.criterionId} snapshot={snap} />
          </Group>
        ))}
      </Section>
    </SummaryDocument>
  );
}
