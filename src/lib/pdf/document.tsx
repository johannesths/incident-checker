import type { ReactNode } from "react";
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

/**
 * Grundgerüst der PDF-Zusammenfassungen: Seite mit Kopf- und Fußzeile,
 * Titelblock, Abschnitte und Zeilen aus Bezeichnung und Wert. Die Bausteine
 * folgen der Gestaltung der Anwendung – Schwarz für Schrift, Grau für Linien
 * und ruhige Flächen, Orange nur als Signatur.
 *
 * Der Renderer bringt die Standardschrift Helvetica mit; sie deckt den
 * westeuropäischen Zeichensatz einschließlich Umlauten, ß und € ab und muss
 * nicht geladen werden. Zeichen außerhalb davon – etwa Symbole oder Emojis in
 * Freitexten – stellt das PDF nicht dar.
 *
 * Dieses Modul wird erst beim Klick auf die Schaltfläche geladen (siehe
 * @/components/pdf-download-button), damit der Renderer nicht in das Bündel der
 * Seite gelangt.
 */

// Die eingebaute Silbentrennung folgt englischen Regeln; deutsche Wörter würde
// sie an falschen Stellen trennen. Umbruch daher nur an Leerzeichen.
Font.registerHyphenationCallback((word) => [word]);

/** Farben der Anwendung (siehe globals.css), soweit das PDF sie braucht. */
export const COLORS = {
  ink: "#000000",
  inkSoft: "#444b54",
  line: "#dfe3e6",
  surface: "#f5f7f8",
  accent: "#fd5108",
  destructive: "#b3190a",
  success: "#157f4c",
  warning: "#b45309",
} as const;

export type Tone = "destructive" | "success" | "warning" | "neutral";

const TONE_COLOR: Record<Tone, string> = {
  destructive: COLORS.destructive,
  success: COLORS.success,
  warning: COLORS.warning,
  neutral: COLORS.inkSoft,
};

const PAGE_MARGIN_X = 52;

export const styles = StyleSheet.create({
  page: {
    paddingTop: 68,
    paddingBottom: 64,
    paddingHorizontal: PAGE_MARGIN_X,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    lineHeight: 1.45,
    color: COLORS.ink,
  },

  /* Kopf- und Fußzeile, auf jeder Seite wiederholt */
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  headerRule: { height: 3, backgroundColor: COLORS.accent },
  headerRow: {
    marginHorizontal: PAGE_MARGIN_X,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 0.75,
    borderBottomColor: COLORS.line,
  },
  wordmark: { fontSize: 11, fontWeight: 700 },
  headerKind: { fontSize: 8, color: COLORS.inkSoft },
  /*
   * Die Fußzeile besteht aus zwei unabhängig positionierten Elementen, beide
   * von oben gemessen (842 pt ist die Höhe einer A4-Seite): Die Seitenzahl
   * entsteht erst beim Umbruch (render-Prop), und der Renderer lässt sie – oder
   * ihren Nachbarn – aus, sobald sie in einer Zeile mit anderem Text steht
   * oder von unten verankert ist.
   */
  footer: {
    position: "absolute",
    top: 782,
    left: PAGE_MARGIN_X,
    right: PAGE_MARGIN_X,
    paddingTop: 8,
    paddingRight: 90,
    borderTopWidth: 0.75,
    borderTopColor: COLORS.line,
  },
  footerText: { fontSize: 7.5, color: COLORS.inkSoft, lineHeight: 1.35 },
  pageNumber: {
    position: "absolute",
    top: 790,
    right: PAGE_MARGIN_X,
    fontSize: 7.5,
    color: COLORS.inkSoft,
    lineHeight: 1.35,
    textAlign: "right",
  },

  /* Titelblock (vgl. PageHeader der Anwendung) */
  titleBlock: { marginBottom: 18 },
  step: {
    fontSize: 7.5,
    fontWeight: 700,
    color: COLORS.accent,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  title: { fontSize: 18, fontWeight: 700, lineHeight: 1.25 },
  description: { fontSize: 9.5, color: COLORS.inkSoft, marginTop: 4 },

  /* Hervorgehobener Kasten, etwa für die Gesamteinstufung */
  banner: {
    backgroundColor: COLORS.surface,
    borderLeftWidth: 4,
    padding: 12,
    paddingLeft: 14,
  },
  bannerTitle: { fontSize: 13, fontWeight: 700, lineHeight: 1.3 },
  bannerSubtitle: { fontSize: 9, color: COLORS.inkSoft, marginTop: 2 },
  bannerBody: { marginTop: 8 },

  /*
   * Abschnitte, Gruppen und Absätze halten ihren Abstand nach oben, und zwar
   * als eigenes Element statt als Rand. Zwei Eigenheiten des Umbruchs
   * verlangen das: Ein unterer Rand zählt zum Element, sodass ein Abschnitt,
   * dessen Inhalt gerade noch auf die Seite passt, allein wegen des Rands auf
   * die nächste Seite rutschen würde. Und das erste Kind eines Containers
   * wird nie auf die nächste Seite verschoben – erst mit dem Abstandhalter
   * davor greift minPresenceAhead der Überschrift, damit sie nicht allein am
   * Seitenende steht.
   */
  sectionSpacer: { height: 16 },
  sectionHeading: {
    paddingBottom: 4,
    marginBottom: 6,
    borderBottomWidth: 0.75,
    borderBottomColor: COLORS.line,
  },
  sectionTitle: { fontSize: 11, fontWeight: 700 },
  sectionNote: { fontSize: 8, color: COLORS.inkSoft, marginTop: 1 },

  /* Untergruppen innerhalb eines Abschnitts */
  groupSpacer: { height: 8 },
  groupHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 3,
  },
  groupTitle: { fontSize: 10, fontWeight: 700 },
  groupText: { color: COLORS.inkSoft, marginBottom: 4 },

  /* Zeilen aus Bezeichnung und Wert */
  row: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.line,
  },
  rowLabel: { width: "36%", color: COLORS.inkSoft, fontSize: 8.5 },
  rowValue: { flex: 1 },
  empty: { color: COLORS.inkSoft, fontStyle: "italic" },
  mono: { fontFamily: "Courier" },

  /* Fließtext, etwa Beschreibungen */
  paragraphSpacer: { height: 6 },
  paragraphLabel: { color: COLORS.inkSoft, fontSize: 8.5, marginBottom: 2 },

  /* Aufzählungen */
  listItem: { flexDirection: "row", gap: 6 },
  listBullet: { width: 8, color: COLORS.inkSoft },
  listText: { flex: 1 },

  /* Statusmarke, etwa "Schwelle erreicht" */
  chip: {
    fontSize: 7.5,
    fontWeight: 700,
    // Die Schrift sitzt oben in ihrer Zeile; der Ausgleich unten hält sie mittig.
    lineHeight: 1.15,
    paddingHorizontal: 6,
    paddingTop: 2.5,
    paddingBottom: 1,
    borderRadius: 8,
    borderWidth: 0.75,
  },
});

/* ---------------------------------------------------------------------------
 * Formatierung
 * ------------------------------------------------------------------------- */

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

const numberFormat = new Intl.NumberFormat("de-DE");

/** Zeitpunkt in deutscher Schreibweise; unlesbare Werte bleiben, wie sie sind. */
export function formatDateTime(
  value: string | Date | undefined | null,
): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime())
    ? String(value)
    : dateTimeFormat.format(date);
}

/** Zahl aus einem Textfeld mit Tausenderpunkten; leer bleibt leer. */
export function formatNumber(
  value: string | number | undefined | null,
  unit?: string,
): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string" && value.trim() === "") return "";
  const parsed = Number(value);
  const text = Number.isFinite(parsed)
    ? numberFormat.format(parsed)
    : String(value);
  return unit ? `${text} ${unit}` : text;
}

export function yesNo(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  return value ? "Ja" : "Nein";
}

/** Klartext zu einer Kennung aus einer Werteliste. */
export function labelOf(
  items: readonly { id: string; label: string }[],
  id: string | null | undefined,
): string {
  return items.find((i) => i.id === id)?.label ?? "";
}

/** Klartexte zu mehreren Kennungen, in der Reihenfolge der Werteliste. */
export function labelsOf(
  items: readonly { id: string; label: string }[],
  ids: readonly string[] | undefined,
): string[] {
  if (!ids || ids.length === 0) return [];
  return items.filter((i) => ids.includes(i.id)).map((i) => i.label);
}

/* ---------------------------------------------------------------------------
 * Bausteine
 * ------------------------------------------------------------------------- */

export function SummaryDocument({
  title,
  subject,
  kind,
  generatedAt,
  children,
}: {
  /** Titel des Dokuments (Metadaten). */
  title: string;
  subject?: string;
  /** Kurzbezeichnung in der Kopfzeile, z. B. "Schweregradbestimmung". */
  kind: string;
  generatedAt: Date;
  children: ReactNode;
}) {
  return (
    <Document
      title={title}
      subject={subject}
      author="Threatly"
      creator="Threatly"
      producer="Threatly"
      language="de"
      creationDate={generatedAt}
    >
      <Page size="A4" style={styles.page}>
        <View fixed style={styles.header}>
          <View style={styles.headerRule} />
          <View style={styles.headerRow}>
            <Text style={styles.wordmark}>Threatly</Text>
            <Text style={styles.headerKind}>{kind}</Text>
          </View>
        </View>

        {children}

        <View fixed style={styles.footer}>
          <Text style={styles.footerText}>
            Erstellt am {formatDateTime(generatedAt)} mit Threatly. Die
            Anwendung unterstützt die Entscheidung, sie ersetzt sie nicht; die
            Angaben sind gegen den aktuellen Verordnungstext zu prüfen.
          </Text>
        </View>
        <Text
          fixed
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `Seite ${pageNumber} von ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}

export function TitleBlock({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description?: string;
}) {
  return (
    <View style={styles.titleBlock}>
      <Text style={styles.step}>{step}</Text>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
    </View>
  );
}

export function Banner({
  tone,
  title,
  subtitle,
  children,
}: {
  tone: Tone;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <View
      style={[styles.banner, { borderLeftColor: TONE_COLOR[tone] }]}
      wrap={false}
    >
      <Text style={styles.bannerTitle}>{title}</Text>
      {subtitle && <Text style={styles.bannerSubtitle}>{subtitle}</Text>}
      {children && <View style={styles.bannerBody}>{children}</View>}
    </View>
  );
}

/**
 * Abschnitt mit Überschrift. Die Überschrift wird weder geteilt noch allein
 * am Seitenende zurückgelassen (minPresenceAhead, siehe sectionSpacer).
 */
export function Section({
  title,
  note,
  children,
}: {
  title: string;
  /** Fundstelle oder Erläuterung, z. B. "Art. 2 der Delegierten Verordnung". */
  note?: string;
  children: ReactNode;
}) {
  return (
    <View>
      <View style={styles.sectionSpacer} />
      <View style={styles.sectionHeading} minPresenceAhead={48} wrap={false}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {note && <Text style={styles.sectionNote}>{note}</Text>}
      </View>
      {children}
    </View>
  );
}

/** Untergruppe eines Abschnitts, etwa ein Kriterium mit seinen Angaben. */
export function Group({
  title,
  trailing,
  text,
  children,
}: {
  title: string;
  /** Rechts neben dem Titel, etwa eine Statusmarke. */
  trailing?: ReactNode;
  /** Erläuterung unter dem Titel. */
  text?: string;
  children?: ReactNode;
}) {
  return (
    <View>
      <View style={styles.groupSpacer} />
      <View style={styles.groupHeading} minPresenceAhead={32} wrap={false}>
        <Text style={styles.groupTitle}>{title}</Text>
        {trailing}
      </View>
      {text && <Text style={styles.groupText}>{text}</Text>}
      {children}
    </View>
  );
}

const EMPTY = "keine Angabe";

/** Ab dieser Länge darf eine Zeile über den Seitenumbruch laufen. */
const WRAP_THRESHOLD = 240;

/**
 * Bezeichnung und Wert nebeneinander. Ein leerer Wert wird als "keine Angabe"
 * ausgewiesen, sofern die Zeile nicht ganz entfallen soll (`optional`).
 */
export function Row({
  label,
  value,
  mono = false,
  optional = false,
}: {
  label: string;
  value: string | string[] | null | undefined;
  /** Kennungen und Codes in nichtproportionaler Schrift. */
  mono?: boolean;
  /** Zeile bei fehlendem Wert weglassen statt "keine Angabe" auszuweisen. */
  optional?: boolean;
}) {
  const text = Array.isArray(value) ? value.join(", ") : (value ?? "");
  if (optional && text === "") return null;
  return (
    <View style={styles.row} wrap={text.length > WRAP_THRESHOLD}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValue}>
        {text === "" ? (
          <Text style={styles.empty}>{EMPTY}</Text>
        ) : (
          <Text style={mono ? styles.mono : undefined}>{text}</Text>
        )}
      </View>
    </View>
  );
}

/** Mehrzeiliger Freitext unter seiner Bezeichnung. */
export function Paragraph({
  label,
  value,
  optional = false,
}: {
  label?: string;
  value: string | null | undefined;
  optional?: boolean;
}) {
  const text = value?.trim() ?? "";
  if (optional && text === "") return null;
  return (
    <View>
      <View style={styles.paragraphSpacer} />
      {label && (
        <Text style={styles.paragraphLabel} minPresenceAhead={24} wrap={false}>
          {label}
        </Text>
      )}
      {text === "" ? (
        <Text style={styles.empty}>{EMPTY}</Text>
      ) : (
        <Text>{text}</Text>
      )}
    </View>
  );
}

/** Bezeichnung über beliebigem Inhalt, etwa einer Aufzählung. */
export function Labeled({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View>
      <View style={styles.paragraphSpacer} />
      <Text style={styles.paragraphLabel} minPresenceAhead={24} wrap={false}>
        {label}
      </Text>
      {children}
    </View>
  );
}

/** Aufzählung; leer wird als "keine Angabe" ausgewiesen. */
export function List({ items }: { items: string[] }) {
  if (items.length === 0) return <Text style={styles.empty}>{EMPTY}</Text>;
  return (
    <View>
      {items.map((item, index) => (
        <View key={index} style={styles.listItem}>
          <Text style={styles.listBullet}>–</Text>
          <Text style={styles.listText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function Chip({ tone, children }: { tone: Tone; children: string }) {
  const color = TONE_COLOR[tone];
  return (
    <Text style={[styles.chip, { color, borderColor: color }]}>{children}</Text>
  );
}
