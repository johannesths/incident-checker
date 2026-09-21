import { Text, View } from "@react-pdf/renderer";
import {
  DATA_LOSS_DIMENSIONS,
  DORA_CRITERIA,
  REPUTATION_CONDITIONS,
} from "@/lib/dora/criteria";
import {
  REPORT_TYPE_BY_ID,
  SUBMISSION_KIND_BY_ID,
  coversArticle,
  isFollowUp,
  type ReportType,
  type SubmissionKind,
} from "@/lib/dora/reporting";
import {
  DETECTION_SOURCES,
  DURATION_BASES,
  EXTERNAL_ORIGINS,
  FIGURE_BASES,
  FUNCTIONAL_AREAS,
  IMPACT_TYPES,
  INCIDENT_ORIGINS,
  INCIDENT_TYPES,
  INFRASTRUCTURE_ANSWERS,
  MEMBER_STATES,
  NOTIFIED_AUTHORITIES,
  RESOLUTION_RISK_ANSWERS,
  ROOT_CAUSE_TREE,
  THREAT_ACTIVITY_CHANGES,
  THREAT_STATUSES,
  THREAT_TECHNIQUES,
  rootCauseDetailId,
} from "@/lib/dora/report-fields";
import { ENTITY_TYPES } from "@/lib/company/profile";
import type {
  CyberThreatInput,
  ReportInput,
  ReportReceipt,
} from "@/lib/schemas";
import {
  Banner,
  Labeled,
  List,
  Paragraph,
  Row,
  Section,
  SummaryDocument,
  TitleBlock,
  formatDateTime,
  formatNumber,
  labelOf,
  labelsOf,
  styles,
  yesNo,
} from "./document";

/**
 * Der Inhalt der Meldung, wie ihn das Formular in Schritt 03 hält: die Angaben
 * beider Meldungen ohne die Zusätze der Anwendung. Alles ist optional, damit
 * auch ein Entwurf aus einer früheren Fassung der Seite gerendert wird.
 */
type ContentFields = Omit<
  ReportInput & CyberThreatInput,
  "classification" | "competentAuthority" | "nis2EssentialEntity"
>;

export type ReportContent = Partial<{
  [K in keyof ContentFields]: Exclude<ContentFields[K], undefined>;
}>;

const RTS = "Delegierte Verordnung (EU) 2025/301";

/** Klartexte; die Auswahl "Sonstiges"/"Andere" wird um die Angabe ergänzt. */
function labelsWithOther(
  items: readonly { id: string; label: string }[],
  ids: readonly string[] | undefined,
  other: string | undefined,
): string[] {
  if (!ids || ids.length === 0) return [];
  const detail = other?.trim();
  return items
    .filter((i) => ids.includes(i.id))
    .map((i) =>
      i.id === "other" && detail ? `${i.label}: ${detail}` : i.label,
    );
}

function amount(
  value: string | undefined,
  currency: string | undefined,
): string {
  return formatNumber(value, currency || undefined);
}

function hours(value: string | undefined): string {
  return formatNumber(value, "Stunden");
}

function percent(value: string | undefined): string {
  return value && value.trim() !== "" ? `${formatNumber(value)} %` : "";
}

/**
 * Die dreistufige Einstufung der Ursachen (Art. 4 Buchst. a) als eingerückte
 * Liste: Kategorie, darunter die Detailkategorien, darunter die weitergehende
 * Einstufung.
 */
function RootCauses({ form }: { form: ReportContent }) {
  const categories = form.rootCauseCategories ?? [];
  const details = form.rootCauseDetails ?? [];
  const further = form.rootCauseFurther ?? [];
  const selected = ROOT_CAUSE_TREE.filter((c) =>
    (categories as string[]).includes(c.id),
  );
  if (selected.length === 0) return <List items={[]} />;
  return (
    <View>
      {selected.map((category) => (
        <View key={category.id}>
          <Text>{category.label}</Text>
          {category.details
            .filter((d) =>
              details.includes(rootCauseDetailId(category.id, d.id)),
            )
            .map((detail) => {
              const detailId = rootCauseDetailId(category.id, detail.id);
              return (
                <View key={detail.id} style={{ paddingLeft: 12 }}>
                  <Text>– {detail.label}</Text>
                  {(detail.further ?? [])
                    .filter((f) => further.includes(`${detailId}.${f.id}`))
                    .map((f) => (
                      <Text key={f.id} style={{ paddingLeft: 12 }}>
                        · {f.label}
                      </Text>
                    ))}
                </View>
              );
            })}
        </View>
      ))}
    </View>
  );
}

/* ---------------------------------------------------------------------------
 * Art. 1 – Allgemeine Informationen (beide Meldungen)
 * ------------------------------------------------------------------------- */

function GeneralInformation({
  form,
  kind,
  reportType,
}: {
  form: ReportContent;
  kind: SubmissionKind;
  reportType: ReportType;
}) {
  return (
    <>
      <Section title="Art der Meldung" note={`Art. 1 Buchst. a ${RTS}`}>
        <Row label="Meldung" value={SUBMISSION_KIND_BY_ID[kind].label} />
        {kind === "incident" && (
          <>
            <Row
              label="Art der Übermittlung"
              value={REPORT_TYPE_BY_ID[reportType].label}
            />
            {isFollowUp(reportType) && (
              <Row
                label="Von der zuständigen Behörde mitgeteilter Referenzcode"
                value={form.authorityReferenceCode}
                mono
              />
            )}
          </>
        )}
      </Section>

      <Section
        title="Meldendes Finanzunternehmen"
        note={`Art. 1 Buchst. b bis d, f und g ${RTS}`}
      >
        <Row label="Name des Finanzunternehmens" value={form.entityName} />
        <Row label="LEI-Code" value={form.entityLei} mono />
        <Row
          label="Art des Finanzunternehmens"
          value={labelOf(ENTITY_TYPES, form.entityType)}
        />
        <Row
          label="Übermittelndes Unternehmen"
          value={[form.submittingEntityName, form.submittingEntityCode]
            .filter((v): v is string => Boolean(v?.trim()))
            .join(" · ")}
          optional
        />
        <Row
          label="Weitere Finanzunternehmen einer aggregierten Meldung"
          value={form.aggregatedEntityNames}
          optional
        />
        <Row
          label="Deren LEI-Codes"
          value={form.aggregatedEntityLeis}
          mono
          optional
        />
        <Row
          label="Mutterunternehmen der Gruppe"
          value={[form.groupParentName, form.groupParentLei]
            .filter((v): v is string => Boolean(v?.trim()))
            .join(" · ")}
          optional
        />
        <Row label="Währung monetärer Beträge" value={form.reportingCurrency} />
      </Section>

      <Section
        title="Verantwortliche für die Kommunikation mit der Behörde"
        note={`Art. 1 Buchst. e ${RTS}`}
      >
        <Row label="Name" value={form.primaryContactName} />
        <Row label="E-Mail-Adresse" value={form.primaryContactEmail} />
        <Row label="Telefonnummer" value={form.primaryContactPhone} />
        <Row
          label="Zweite Person oder Team"
          value={form.secondContactName}
          optional
        />
        <Row
          label="E-Mail-Adresse"
          value={form.secondContactName ? form.secondContactEmail : ""}
          optional
        />
        <Row
          label="Telefonnummer"
          value={form.secondContactName ? form.secondContactPhone : ""}
          optional
        />
      </Section>
    </>
  );
}

/* ---------------------------------------------------------------------------
 * Art. 2 – Erstmeldung
 * ------------------------------------------------------------------------- */

function InitialReport({ form }: { form: ReportContent }) {
  const origin = form.incidentOrigin ?? null;
  return (
    <>
      <Section
        title="Referenzcode, Erkennung und Einstufung"
        note={`Art. 2 Buchst. a und b ${RTS}`}
      >
        <Row
          label="Referenzcode des Vorfalls"
          value={form.incidentReferenceCode}
          mono
        />
        <Row
          label="Erkennung des Vorfalls"
          value={formatDateTime(form.detectedAt)}
        />
        <Row
          label="Einstufung als schwerwiegend"
          value={formatDateTime(form.classifiedAt)}
        />
        <Row
          label="Gründe für die verspätete Übermittlung"
          value={form.delayReason}
          optional
        />
      </Section>

      <Section
        title="Beschreibung des Vorfalls"
        note={`Art. 2 Buchst. c und j ${RTS}`}
      >
        <Paragraph
          label="Beschreibung des IKT-bezogenen Vorfalls"
          value={form.description}
        />
        <Paragraph
          label="Sonstige zweckdienliche Informationen"
          value={form.additionalInformation}
          optional
        />
      </Section>

      <Section
        title="Einstufungskriterien und betroffene Mitgliedstaaten"
        note={`Art. 2 Buchst. d und e ${RTS}`}
      >
        <Labeled label="Kriterien, auf deren Grundlage der Vorfall als schwerwiegend eingestuft wurde">
          <List items={labelsOf(DORA_CRITERIA, form.classificationCriteria)} />
        </Labeled>
        <Row
          label="Betroffene Mitgliedstaaten"
          value={labelsOf(MEMBER_STATES, form.affectedMemberStates)}
        />
      </Section>

      <Section
        title="Erkennung, Ursprung und Geschäftsfortführung"
        note={`Art. 2 Buchst. f bis h ${RTS}`}
      >
        <Row
          label="Wie wurde der Vorfall erkannt?"
          value={labelOf(DETECTION_SOURCES, form.detectionSource)}
        />
        <Row
          label="Ursprung des Vorfalls"
          value={labelOf(INCIDENT_ORIGINS, origin)}
        />
        {origin && EXTERNAL_ORIGINS.includes(origin) && (
          <Row
            label="Bezeichnung des Dritten"
            value={form.originEntityDetails}
          />
        )}
        <Row
          label="Geschäftsfortführungsplan aktiviert"
          value={yesNo(form.businessContinuityActivated ?? false)}
        />
      </Section>

      <Section
        title="Neueinstufung als nicht schwerwiegend"
        note={`Art. 2 Buchst. i ${RTS}`}
      >
        <Row
          label="Neueinstufung als nicht schwerwiegend"
          value={yesNo(form.reclassifiedAsNonMajor ?? false)}
        />
        {form.reclassifiedAsNonMajor && (
          <Paragraph
            label="Gründe der Neueinstufung"
            value={form.reclassificationDetails}
          />
        )}
      </Section>
    </>
  );
}

/* ---------------------------------------------------------------------------
 * Art. 3 – Zwischenmeldung
 * ------------------------------------------------------------------------- */

function IntermediateReport({ form }: { form: ReportContent }) {
  const currency = form.reportingCurrency;
  return (
    <>
      <Section
        title="Eintreten und Wiederaufnahme des Geschäftsbetriebs"
        note={`Art. 3 Buchst. b und c ${RTS}`}
      >
        <Row
          label="Eintreten des Vorfalls"
          value={formatDateTime(form.occurredAt)}
        />
        <Row
          label="Wiederaufnahme des regulären Geschäftsbetriebs"
          value={formatDateTime(form.regularOperationsResumedAt)}
        />
      </Section>

      <Section
        title="Betroffene Kunden, Gegenparteien, Transaktionen und Reputation"
        note={`Art. 3 Buchst. d ${RTS} i. V. m. Art. 1 und 2 DelVO (EU) 2024/1772`}
      >
        <Row
          label="Betroffene Kunden (Anzahl)"
          value={formatNumber(form.clientsAffected)}
        />
        <Row
          label="Betroffene Kunden (% der Dienstnutzer)"
          value={percent(form.clientsAffectedPercent)}
        />
        <Row
          label="Betroffene Gegenparteien (Anzahl)"
          value={formatNumber(form.counterpartsAffected)}
        />
        <Row
          label="Betroffene Gegenparteien (%)"
          value={percent(form.counterpartsAffectedPercent)}
        />
        <Row
          label="Betroffene Transaktionen (Anzahl)"
          value={formatNumber(form.transactionsAffected)}
        />
        <Row
          label="Betroffene Transaktionen (%)"
          value={percent(form.transactionsAffectedPercent)}
        />
        <Row
          label="Wert der betroffenen Transaktionen"
          value={amount(form.transactionsValue, currency)}
        />
        <Row
          label="Werte ermittelt oder geschätzt"
          value={labelOf(FIGURE_BASES, form.figuresBasis)}
        />
        <Row
          label="Auswirkungen auf relevante Kunden oder Gegenparteien"
          value={form.relevantClientsImpact}
          optional
        />
        <Row
          label="Reputationsschaden"
          value={labelsOf(
            REPUTATION_CONDITIONS,
            form.reputationalImpactConditions,
          )}
        />
        <Row
          label="Erläuterung des Reputationsschadens"
          value={form.reputationalImpactContext}
          optional
        />
      </Section>

      <Section
        title="Dauer, Ausfallzeit und Auswirkungen in den Mitgliedstaaten"
        note={`Art. 3 Buchst. d ${RTS} i. V. m. Art. 3 und 4 DelVO (EU) 2024/1772`}
      >
        <Row label="Dauer des Vorfalls" value={hours(form.durationHours)} />
        <Row
          label="Ausfallzeit des Dienstes"
          value={hours(form.downtimeHours)}
        />
        <Row
          label="Dauer und Ausfallzeit ermittelt oder geschätzt"
          value={labelOf(DURATION_BASES, form.durationBasis)}
        />
        <Row
          label="Bereiche mit Auswirkungen in den Mitgliedstaaten"
          value={labelsOf(IMPACT_TYPES, form.memberStateImpactTypes)}
        />
        <Row
          label="Beschreibung der Auswirkungen je Mitgliedstaat"
          value={form.memberStateImpactDescription}
          optional
        />
      </Section>

      <Section
        title="Datenverluste und betroffene kritische Dienste"
        note={`Art. 3 Buchst. d ${RTS} i. V. m. Art. 5 und 6 DelVO (EU) 2024/1772`}
      >
        <Row
          label="Betroffene Schutzziele der Daten"
          value={labelsOf(DATA_LOSS_DIMENSIONS, form.dataLossDimensions)}
        />
        <Row
          label="Beschreibung der Datenverluste"
          value={form.dataLossDescription}
          optional
        />
        <Row
          label="Betroffene kritische Dienste"
          value={form.criticalServicesDescription}
        />
      </Section>

      <Section
        title="Art des Vorfalls und Vorgehen des Angreifers"
        note={`Art. 3 Buchst. e und f ${RTS}`}
      >
        <Row
          label="Art des IKT-bezogenen Vorfalls"
          value={labelsWithOther(
            INCIDENT_TYPES,
            form.incidentTypes,
            form.incidentTypeOther,
          )}
        />
        <Row
          label="Bedrohungen und Techniken des Angreifers"
          value={labelsWithOther(
            THREAT_TECHNIQUES,
            form.threatTechniques,
            form.threatTechniqueOther,
          )}
        />
      </Section>

      <Section
        title="Funktionsbereiche, Infrastruktur und Kundeninteressen"
        note={`Art. 3 Buchst. g bis i ${RTS}`}
      >
        <Row
          label="Betroffene Funktionsbereiche"
          value={labelsOf(FUNCTIONAL_AREAS, form.functionalAreas)}
        />
        <Row
          label="Betroffene Geschäftsprozesse"
          value={form.affectedProcesses}
          optional
        />
        <Row
          label="Infrastrukturkomponenten betroffen"
          value={labelOf(INFRASTRUCTURE_ANSWERS, form.infrastructureAffected)}
        />
        <Row
          label="Beschreibung der betroffenen Infrastrukturkomponenten"
          value={form.infrastructureDescription}
          optional
        />
        <Row
          label="Finanzielle Interessen von Kunden betroffen"
          value={yesNo(form.clientFinancialInterestAffected ?? false)}
        />
      </Section>

      <Section
        title="Andere Behörden, befristete Maßnahmen und Indikatoren"
        note={`Art. 3 Buchst. j bis l ${RTS}`}
      >
        <Row
          label="Benachrichtigte Behörden"
          value={labelsWithOther(
            NOTIFIED_AUTHORITIES,
            form.notifiedAuthorities,
            form.notifiedAuthoritiesOther,
          )}
        />
        <Row
          label="Befristete Maßnahmen ergriffen oder geplant"
          value={yesNo(form.temporaryMeasuresTaken ?? false)}
        />
        {form.temporaryMeasuresTaken && (
          <Row
            label="Beschreibung der befristeten Maßnahmen"
            value={form.temporaryMeasuresDescription}
          />
        )}
        <Row
          label="Kompromittierungsindikatoren"
          value={form.indicatorsOfCompromise}
          optional
        />
      </Section>
    </>
  );
}

/* ---------------------------------------------------------------------------
 * Art. 4 – Abschlussmeldung
 * ------------------------------------------------------------------------- */

function FinalReport({ form }: { form: ReportContent }) {
  const currency = form.reportingCurrency;
  return (
    <>
      <Section title="Ursachen des Vorfalls" note={`Art. 4 Buchst. a ${RTS}`}>
        <Labeled label="Einstufung der Ursachen">
          <RootCauses form={form} />
        </Labeled>
        <Row
          label="Sonstige Art der Ursache"
          value={form.rootCauseOther}
          optional
        />
        <Paragraph
          label="Angaben zu den Ursachen des Vorfalls"
          value={form.rootCauseDescription}
        />
      </Section>

      <Section
        title="Behebung des Vorfalls"
        note={`Art. 4 Buchst. b und c ${RTS}`}
      >
        <Row
          label="Behebung des Vorfalls"
          value={formatDateTime(form.incidentResolvedAt)}
        />
        <Row
          label="Beseitigung der zugrunde liegenden Ursache"
          value={formatDateTime(form.rootCauseAddressedAt)}
        />
        <Paragraph
          label="Angaben dazu, wie dem Vorfall entgegengewirkt wurde"
          value={form.counterMeasures}
        />
      </Section>

      <Section
        title="Für die Abwicklungsbehörden relevante Informationen"
        note={`Art. 4 Buchst. d ${RTS}`}
      >
        <Row
          label="Risiko für kritische Funktionen"
          value={labelOf(RESOLUTION_RISK_ANSWERS, form.resolutionRisk)}
        />
        <Row
          label="Informationen für die Abwicklungsbehörden"
          value={form.resolutionAuthorityInformation}
          optional
        />
      </Section>

      <Section
        title="Kosten, Verluste und finanzielle Wiedereinziehungen"
        note={`Art. 4 Buchst. e ${RTS}`}
      >
        <Row
          label="Direkte und indirekte Kosten und Verluste (brutto)"
          value={amount(form.grossCostsAndLosses, currency)}
        />
        <Row
          label="Finanzielle Wiedereinziehungen"
          value={amount(form.financialRecoveries, currency)}
        />
        <Row
          label="Erläuterung der Kosten und Verluste"
          value={form.economicImpactDescription}
          optional
        />
      </Section>

      <Section title="Wiederholte Vorfälle" note={`Art. 4 Buchst. f ${RTS}`}>
        <Row
          label="Nicht schwerwiegende Vorfälle, die zusammen als schwerwiegend zu betrachten sind"
          value={yesNo(form.recurringIncidents ?? false)}
        />
        {form.recurringIncidents && (
          <>
            <Row
              label="Anzahl der wiederholten Vorfälle"
              value={formatNumber(form.recurringIncidentCount)}
            />
            <Row
              label="Eintreten des ersten Vorfalls"
              value={formatDateTime(form.firstRecurringIncidentAt)}
            />
          </>
        )}
      </Section>
    </>
  );
}

/* ---------------------------------------------------------------------------
 * Art. 6 – Freiwillige Meldung erheblicher Cyberbedrohungen
 * ------------------------------------------------------------------------- */

function CyberThreatReport({ form }: { form: ReportContent }) {
  return (
    <>
      <Section
        title="Erkennung der Cyberbedrohung"
        note={`Art. 6 Buchst. b ${RTS}`}
      >
        <Row
          label="Erkennung der erheblichen Cyberbedrohung"
          value={formatDateTime(form.detectedAt)}
        />
        <Row
          label="Sonstige relevante Zeitstempel"
          value={form.relevantTimestamps}
          optional
        />
      </Section>

      <Section
        title="Beschreibung und mögliche Auswirkungen"
        note={`Art. 6 Buchst. c, d und j ${RTS}`}
      >
        <Paragraph
          label="Beschreibung der erheblichen Cyberbedrohung"
          value={form.description}
        />
        <Paragraph
          label="Mögliche Auswirkungen der Cyberbedrohung"
          value={form.potentialImpact}
        />
        <Paragraph
          label="Sonstige zweckdienliche Informationen"
          value={form.additionalInformation}
          optional
        />
      </Section>

      <Section
        title="Kriterien, die eine Meldepflicht ausgelöst hätten"
        note={`Art. 6 Buchst. e ${RTS}`}
      >
        <List items={labelsOf(DORA_CRITERIA, form.classificationCriteria)} />
      </Section>

      <Section
        title="Status der Bedrohung und ergriffene Maßnahmen"
        note={`Art. 6 Buchst. f und g ${RTS}`}
      >
        <Row
          label="Status der Cyberbedrohung"
          value={labelOf(THREAT_STATUSES, form.threatStatus)}
        />
        <Row
          label="Veränderung der Bedrohungsaktivität"
          value={labelOf(THREAT_ACTIVITY_CHANGES, form.threatActivityChange)}
        />
        <Row
          label="Maßnahmen zur Verhinderung des Eintretens"
          value={form.preventiveMeasures}
          optional
        />
      </Section>

      <Section
        title="Benachrichtigte Behörden und Finanzunternehmen"
        note={`Art. 6 Buchst. h ${RTS}`}
      >
        <Row
          label="Benachrichtigte Behörden"
          value={labelsWithOther(
            NOTIFIED_AUTHORITIES,
            form.notifiedAuthorities,
            form.notifiedAuthoritiesOther,
          )}
        />
        <Row
          label="Benachrichtigte andere Finanzunternehmen"
          value={form.notifiedFinancialEntities}
          optional
        />
      </Section>

      <Section
        title="Kompromittierungsindikatoren"
        note={`Art. 6 Buchst. i ${RTS}`}
      >
        <Paragraph value={form.indicatorsOfCompromise} />
      </Section>
    </>
  );
}

/* ---------------------------------------------------------------------------
 * Quittung
 * ------------------------------------------------------------------------- */

function Receipt({ receipt }: { receipt: ReportReceipt }) {
  return (
    <>
      <Section
        title="Quittung der Übermittlung"
        note="Die Übermittlung wurde lokal quittiert; eine Meldeschnittstelle der Behörde ist nicht angebunden."
      >
        <Row
          label="Referenzcode der Behörde"
          value={receipt.submissionId}
          mono
        />
        <Row label="Zeitpunkt" value={formatDateTime(receipt.submittedAt)} />
        <Row label="Finanzunternehmen" value={receipt.entityName} />
        <Row
          label="Zuständige Behörde"
          value={receipt.competentAuthority}
          optional
        />
        <Row
          label="Referenzcode des Vorfalls"
          value={receipt.incidentReferenceCode}
          mono
          optional
        />
        <Row label="Übertragungsweg" value={receipt.channel} />
      </Section>

      <Section title="Weitere Fristen" note={`Art. 5 ${RTS}`}>
        {receipt.nextDeadlines.length === 0 ? (
          <Text style={styles.groupText}>
            {receipt.kind === "cyber_threat"
              ? "Die freiwillige Meldung einer erheblichen Cyberbedrohung löst keine weiteren Fristen aus."
              : "Mit der Abschlussmeldung ist der Meldezyklus für diesen Vorfall beendet."}
          </Text>
        ) : (
          receipt.nextDeadlines.map((deadline) => (
            <Row
              key={deadline.reportType}
              label={REPORT_TYPE_BY_ID[deadline.reportType].label}
              value={`fällig bis ${formatDateTime(deadline.dueAt)} (${deadline.basis})`}
            />
          ))
        )}
      </Section>
    </>
  );
}

/* ---------------------------------------------------------------------------
 * Dokument
 * ------------------------------------------------------------------------- */

/**
 * Zusammenfassung der Meldung: Quittung, sofern übermittelt, und der Inhalt in
 * der Reihenfolge der Artikel, die die jeweilige Meldung verlangt.
 */
export function ReportSummaryPdf({
  kind,
  form,
  receipt,
  generatedAt,
}: {
  kind: SubmissionKind;
  /** Inhalt der Meldung; fehlt er, zeigt das Dokument nur die Quittung. */
  form?: ReportContent | null;
  receipt?: ReportReceipt | null;
  generatedAt: Date;
}) {
  const content = form ?? {};
  const reportType: ReportType =
    receipt?.reportType ?? content.reportType ?? "initial";
  const kindDef = SUBMISSION_KIND_BY_ID[kind];
  const articles =
    kind === "incident"
      ? REPORT_TYPE_BY_ID[reportType].articles.join(" und ")
      : "1 und 6";
  const title =
    kind === "incident" ? REPORT_TYPE_BY_ID[reportType].label : kindDef.label;

  return (
    <SummaryDocument
      title={title}
      subject={kindDef.label}
      kind="Schritt 03 · Meldung nach Art. 19 DORA"
      generatedAt={generatedAt}
    >
      <TitleBlock
        step="Schritt 03 · Meldung"
        title={title}
        description={`${kindDef.description} Inhalt nach Art. ${articles} der ${RTS}.`}
      />

      {receipt ? (
        <Banner
          tone="success"
          title="Meldung erfasst"
          subtitle={`Referenzcode ${receipt.submissionId} · ${formatDateTime(receipt.submittedAt)}`}
        />
      ) : (
        <Banner
          tone="neutral"
          title="Entwurf"
          subtitle="Die Meldung wurde noch nicht übermittelt."
        />
      )}

      {receipt && <Receipt receipt={receipt} />}

      {form && (
        <>
          <GeneralInformation
            form={content}
            kind={kind}
            reportType={reportType}
          />
          {kind === "incident" && coversArticle(reportType, 2) && (
            <InitialReport form={content} />
          )}
          {kind === "incident" && coversArticle(reportType, 3) && (
            <IntermediateReport form={content} />
          )}
          {kind === "incident" && coversArticle(reportType, 4) && (
            <FinalReport form={content} />
          )}
          {kind === "cyber_threat" && <CyberThreatReport form={content} />}
        </>
      )}
    </SummaryDocument>
  );
}
