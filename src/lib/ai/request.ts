import "server-only";
import {
  API_KEY_HEADER,
  DEFAULT_CLAUDE_MODEL,
  MODEL_HEADER,
  isClaudeModel,
  type AiAvailability,
  type ClaudeModel,
} from "./models";

/** Was der Server je Anfrage über den KI-Zugang weiß. */
export interface AiRequestOptions {
  /** null: kein Schlüssel – die Bewertung läuft regelbasiert. */
  apiKey: string | null;
  model: ClaudeModel;
}

/**
 * Schlüssel und Modell einer Anfrage. Der Schlüssel kommt aus dem Browser des
 * Nutzers (vorläufig, siehe @/lib/credentials); fehlt er, gilt der des Servers
 * aus ANTHROPIC_API_KEY – der spätere Regelfall für einen gemeinsamen
 * Unternehmensschlüssel. Das Modell wird gegen die Liste geprüft, damit über
 * die Kopfzeile nichts anderes gewählt werden kann.
 */
export function aiOptionsFromRequest(request: Request): AiRequestOptions {
  const headerKey = request.headers.get(API_KEY_HEADER)?.trim();
  const envKey = process.env.ANTHROPIC_API_KEY?.trim();
  const apiKey = headerKey || envKey || null;

  const headerModel = request.headers.get(MODEL_HEADER)?.trim();
  const envModel = process.env.ANTHROPIC_MODEL?.trim();
  const model = isClaudeModel(headerModel)
    ? headerModel
    : isClaudeModel(envModel)
      ? envModel
      : DEFAULT_CLAUDE_MODEL;

  return { apiKey, model };
}

export function aiAvailability(): AiAvailability {
  const envModel = process.env.ANTHROPIC_MODEL?.trim();
  return {
    serverKey: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
    defaultModel: isClaudeModel(envModel) ? envModel : DEFAULT_CLAUDE_MODEL,
  };
}

/**
 * Nur Aufrufe aus der Anwendung selbst: Ein fremder Ursprung könnte sonst mit
 * dem Sitzungs-Cookie des Nutzers Bewertungen auf Rechnung des
 * Unternehmensschlüssels auslösen. Browser setzen Sec-Fetch-Site selbst und
 * lassen es sich nicht nehmen; wo es fehlt (Prüfskripte, ältere Browser),
 * entscheidet Origin – und wo auch das fehlt, ruft kein Browser.
 */
export function isSameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin" || site === "none";
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("host");
  try {
    return host !== null && new URL(origin).host === host;
  } catch {
    return false;
  }
}
