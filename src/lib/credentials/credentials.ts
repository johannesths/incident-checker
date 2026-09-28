import { z } from "zod";
import {
  API_KEY_HEADER,
  CLAUDE_MODELS,
  DEFAULT_CLAUDE_MODEL,
  MODEL_HEADER,
  type ClaudeModel,
} from "@/lib/ai/models";

/**
 * Zugangsschlüssel, die die Anwendung im Auftrag des Nutzers verwendet: der
 * Schlüssel für die Claude-API, mit dem die KI-gestützte Bewertung laufen
 * wird, und der Schlüssel des Unternehmens für den angebundenen Managed
 * Service.
 *
 * Die Schlüssel gehören nicht zum Unternehmensprofil: Sie sind Geheimnisse,
 * keine Stammdaten, und dürfen weder in eine Meldung noch in eine
 * Zusammenfassung gelangen. Sie liegen ausschließlich im Browser (siehe
 * ./store); der Server dieser Anwendung erhält den API-Schlüssel nur für die
 * Dauer einer Anfrage und speichert ihn nicht.
 *
 * Der API-Schlüssel ist befristet: Nach dem letzten Gültigkeitstag verwendet
 * die Anwendung ihn nicht mehr und verlangt einen neuen. Der Schlüssel des
 * Managed Service kennt keine Frist.
 *
 * VORLÄUFIG: Die Schlüssel werden je Browser eingegeben und liegen dort im
 * Klartext. Das ist der Stand für die Entwicklung; für einen gemeinsamen
 * Unternehmensschlüssel ist der Server der richtige Ort (Umgebungsvariablen
 * des Containers, die Oberfläche zeigt dann nur den Status). Speicherort und
 * Übergabe der Schlüssel werden sich daher noch ändern – Aufrufer sollten nur
 * über activeAnthropicApiKey() und useCredentials() darauf zugreifen.
 */
const modelIds = CLAUDE_MODELS.map((m) => m.id) as [
  ClaudeModel,
  ...ClaudeModel[],
];

export const credentialsSchema = z.object({
  /** Schlüssel für die Claude-API; Anthropic-Schlüssel beginnen mit "sk-ant-". */
  anthropicApiKey: z.string(),
  /** Letzter Gültigkeitstag des API-Schlüssels als ISO-Datum (JJJJ-MM-TT). */
  anthropicApiKeyValidUntil: z.string(),
  /**
   * Modell, mit dem die Bewertung läuft – kein Geheimnis, aber dieselbe
   * Einstellung. Die Liste kann sich ändern; eine nicht mehr angebotene Wahl
   * fällt auf den Standard zurück, ohne die Schlüssel zu verwerfen.
   */
  anthropicModel: z.enum(modelIds).catch(DEFAULT_CLAUDE_MODEL),
  /** Schlüssel des Unternehmens für den Managed Service. */
  managedServiceKey: z.string(),
});

export type Credentials = z.infer<typeof credentialsSchema>;

export const EMPTY_CREDENTIALS: Credentials = {
  anthropicApiKey: "",
  anthropicApiKeyValidUntil: "",
  anthropicModel: DEFAULT_CLAUDE_MODEL,
  managedServiceKey: "",
};

/** Ab so vielen verbleibenden Tagen weist die Oberfläche auf das Ablaufen hin. */
export const EXPIRY_WARNING_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Ergänzt einen gespeicherten Stand um fehlende Felder und fängt unbrauchbare
 * Inhalte ab – wie normalizeProfile für das Unternehmensprofil.
 */
export function normalizeCredentials(stored: unknown): Credentials {
  if (!stored || typeof stored !== "object") return EMPTY_CREDENTIALS;
  const parsed = credentialsSchema.safeParse({
    ...EMPTY_CREDENTIALS,
    ...(stored as Partial<Credentials>),
  });
  return parsed.success ? parsed.data : EMPTY_CREDENTIALS;
}

/** Heutiges Datum als ISO-Datum in Ortszeit – der kleinste zulässige Wert für "gültig bis". */
export function todayIsoDate(now: Date = new Date()): string {
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * Ende des angegebenen Tages in Ortszeit – ein Schlüssel gilt den ganzen
 * letzten Tag über. null, wenn die Angabe kein Datum ist.
 */
export function endOfIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day, 23, 59, 59, 999);
  // Der Date-Konstruktor rollt ungültige Tage über (31.02. → 03.03.); das
  // Datum muss unverändert zurückkommen.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export type ApiKeyStatus =
  | { state: "missing" }
  | { state: "valid"; validUntil: Date; daysLeft: number }
  | { state: "expiring"; validUntil: Date; daysLeft: number }
  | { state: "expired"; validUntil: Date };

/**
 * Stand des Claude-API-Schlüssels: fehlt, gültig, läuft bald ab oder ist
 * abgelaufen. Ein Schlüssel ohne lesbares Datum gilt als abgelaufen – die
 * Frist ist Teil der Angabe, nicht Beiwerk.
 */
export function apiKeyStatus(
  credentials: Credentials,
  now: Date = new Date(),
): ApiKeyStatus {
  if (credentials.anthropicApiKey.trim() === "") return { state: "missing" };
  const validUntil = endOfIsoDate(credentials.anthropicApiKeyValidUntil);
  if (!validUntil) {
    return { state: "expired", validUntil: new Date(NaN) };
  }
  if (validUntil.getTime() < now.getTime()) {
    return { state: "expired", validUntil };
  }
  const daysLeft = Math.ceil((validUntil.getTime() - now.getTime()) / DAY_MS);
  return {
    state: daysLeft <= EXPIRY_WARNING_DAYS ? "expiring" : "valid",
    validUntil,
    daysLeft,
  };
}

/** Der API-Schlüssel, sofern hinterlegt und noch gültig; sonst null. */
export function activeAnthropicApiKey(
  credentials: Credentials,
  now: Date = new Date(),
): string | null {
  const status = apiKeyStatus(credentials, now);
  return status.state === "valid" || status.state === "expiring"
    ? credentials.anthropicApiKey.trim()
    : null;
}

/** Ein Schlüssel ist ein einzelnes Token – Leerzeichen deuten auf einen Kopierfehler hin. */
export function keyProblem(value: string): string | null {
  if (/\s/.test(value.trim())) {
    return "Der Schlüssel darf keine Leerzeichen enthalten.";
  }
  return null;
}

/**
 * Beanstandungen je Feld. Ein API-Schlüssel ohne Frist ist unvollständig;
 * eine Frist in der Vergangenheit wäre sofort wirkungslos.
 */
export function validateCredentials(
  form: Credentials,
  now: Date = new Date(),
): Partial<Record<keyof Credentials, string>> {
  const errors: Partial<Record<keyof Credentials, string>> = {};
  const apiKey = form.anthropicApiKey.trim();
  const apiKeyError = keyProblem(apiKey);
  if (apiKeyError) errors.anthropicApiKey = apiKeyError;

  const validUntil = form.anthropicApiKeyValidUntil.trim();
  if (apiKey !== "" && validUntil === "") {
    errors.anthropicApiKeyValidUntil =
      "Bitte geben Sie an, bis wann der Schlüssel gültig ist.";
  } else if (validUntil !== "") {
    const end = endOfIsoDate(validUntil);
    if (!end) {
      errors.anthropicApiKeyValidUntil =
        "Bitte geben Sie ein gültiges Datum an.";
    } else if (end.getTime() < now.getTime()) {
      errors.anthropicApiKeyValidUntil =
        "Das Datum liegt in der Vergangenheit.";
    }
  }

  const serviceKeyError = keyProblem(form.managedServiceKey);
  if (serviceKeyError) errors.managedServiceKey = serviceKeyError;
  return errors;
}

/** Bereinigt die Eingaben vor dem Speichern; ohne Schlüssel entfällt die Frist. */
export function trimCredentials(form: Credentials): Credentials {
  const anthropicApiKey = form.anthropicApiKey.trim();
  return {
    anthropicApiKey,
    anthropicApiKeyValidUntil:
      anthropicApiKey === "" ? "" : form.anthropicApiKeyValidUntil.trim(),
    anthropicModel: form.anthropicModel,
    managedServiceKey: form.managedServiceKey.trim(),
  };
}

/**
 * Kopfzeilen für Anfragen an die Bewertungs-API: die Modellwahl immer, der
 * Schlüssel nur, solange er gültig ist – ein abgelaufener Schlüssel verlässt
 * den Browser nicht.
 */
export function aiRequestHeaders(
  credentials: Credentials,
  now: Date = new Date(),
): Record<string, string> {
  const headers: Record<string, string> = {
    [MODEL_HEADER]: credentials.anthropicModel,
  };
  const apiKey = activeAnthropicApiKey(credentials, now);
  if (apiKey) headers[API_KEY_HEADER] = apiKey;
  return headers;
}

export function hasCredentials(credentials: Credentials): boolean {
  return (
    credentials.anthropicApiKey !== "" || credentials.managedServiceKey !== ""
  );
}
