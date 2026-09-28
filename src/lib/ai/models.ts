/**
 * Modelle, unter denen der Nutzer in den Einstellungen wählt.
 *
 * Die Liste ist abschließend: Die Auswahl kommt als Kopfzeile aus dem Browser,
 * und der Server reicht nur weiter, was hier steht. Sobald der
 * Unternehmensschlüssel auf dem Server liegt, entscheidet diese Liste, welche
 * Modelle auf seine Rechnung laufen – nicht die Kopfzeile.
 *
 * Beide Modelle nehmen dieselben Parameter (adaptives Denken, Aufwandsstufe).
 * Haiku 4.5 fehlt bewusst: Es verlangt eine andere Denk-Konfiguration und
 * kennt keine Aufwandsstufe.
 */
export const CLAUDE_MODELS = [
  {
    id: "claude-sonnet-5",
    label: "Claude Sonnet 5",
    hint: "Standard – schnell und günstig, für die Triage ausreichend.",
  },
  {
    id: "claude-opus-5",
    label: "Claude Opus 5",
    hint: "Gründlicher bei unklaren Sachverhalten, etwa das Zweieinhalbfache im Preis.",
  },
] as const;

export type ClaudeModel = (typeof CLAUDE_MODELS)[number]["id"];

export const DEFAULT_CLAUDE_MODEL: ClaudeModel = "claude-sonnet-5";

export const CLAUDE_MODEL_BY_ID: Record<
  ClaudeModel,
  (typeof CLAUDE_MODELS)[number]
> = Object.fromEntries(CLAUDE_MODELS.map((m) => [m.id, m])) as Record<
  ClaudeModel,
  (typeof CLAUDE_MODELS)[number]
>;

export function isClaudeModel(value: unknown): value is ClaudeModel {
  return CLAUDE_MODELS.some((m) => m.id === value);
}

/** Klartext zu einer Modellkennung; unbekannte Kennungen bleiben, wie sie sind. */
export function claudeModelLabel(id: string): string {
  return isClaudeModel(id) ? CLAUDE_MODEL_BY_ID[id].label : id;
}

/**
 * Kopfzeilen, mit denen der Browser Schlüssel und Modellwahl je Anfrage
 * mitgibt. Ein eigener Name für den Schlüssel, nicht "Authorization": Die
 * Anwendung läuft hinter einem Reverse-Proxy mit eigener Anmeldung, der diese
 * Kopfzeile für sich beanspruchen könnte.
 */
export const API_KEY_HEADER = "x-anthropic-api-key";
export const MODEL_HEADER = "x-anthropic-model";

/**
 * Was der Server ohne Schlüssel aus dem Browser leisten kann (GET
 * /api/triage) – für den Hinweis auf der Triage-Seite, damit er auch dann
 * stimmt, wenn nur der Unternehmensschlüssel aus der Umgebung vorliegt.
 */
export interface AiAvailability {
  /** Ein Schlüssel aus der Umgebung des Servers liegt vor. */
  serverKey: boolean;
  /** Modell, das ohne Wahl im Browser gilt. */
  defaultModel: ClaudeModel;
}
