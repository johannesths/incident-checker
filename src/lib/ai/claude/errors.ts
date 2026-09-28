import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Antwort der Anwendung, wenn die Bewertung durch das Modell scheitert.
 *
 * Der Status ist der dieser Anwendung, nicht der der Claude-API: Eine 401 der
 * Claude-API wird nicht zur 401 dieser Anwendung, die sonst wie eine
 * abgelaufene Anmeldung aussähe. Was genau scheiterte, sagt der Code.
 */
export interface AiFailure {
  status: 502 | 503;
  code:
    | "upstream_auth"
    | "upstream_permission"
    | "upstream_credit"
    | "upstream_model"
    | "upstream_busy"
    | "upstream_unreachable"
    | "upstream_error"
    | "unusable_response";
  message: string;
}

/**
 * Die Antwort des Modells war nicht verwertbar – etwa abgeschnitten oder
 * nicht im vereinbarten Format. Kein Fehler der Schnittstelle, sondern des
 * Ergebnisses.
 */
export class UnusableResponseError extends Error {
  constructor(reason: string) {
    super(`Die Antwort des Modells war nicht verwertbar: ${reason}`);
    this.name = "UnusableResponseError";
  }
}

const BUSY: AiFailure = {
  status: 503,
  code: "upstream_busy",
  message:
    "Die Claude-API ist ausgelastet – bitte versuchen Sie es gleich noch einmal.",
};

/**
 * Übersetzt einen Fehler der Claude-API in Status, Code und Klartext für die
 * Oberfläche. Von speziell nach allgemein; APIConnectionError ist im
 * TypeScript-SDK eine Unterklasse von APIError und muss davor stehen. Die
 * Texte nennen weder Schlüssel noch Antwortinhalte.
 */
export function describeAiError(error: unknown): AiFailure | null {
  if (error instanceof Anthropic.AuthenticationError) {
    return {
      status: 502,
      code: "upstream_auth",
      message: "Der Claude-API-Schlüssel wurde nicht akzeptiert.",
    };
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return {
      status: 502,
      code: "upstream_permission",
      message:
        "Der Claude-API-Schlüssel ist für diese Anfrage nicht freigegeben.",
    };
  }
  if (error instanceof Anthropic.NotFoundError) {
    return {
      status: 502,
      code: "upstream_model",
      message:
        "Das gewählte Modell steht diesem Claude-API-Schlüssel nicht zur Verfügung.",
    };
  }
  if (error instanceof Anthropic.RateLimitError) return BUSY;
  if (error instanceof Anthropic.APIConnectionError) {
    return {
      status: 502,
      code: "upstream_unreachable",
      message: "Die Claude-API ist nicht erreichbar.",
    };
  }
  if (error instanceof Anthropic.APIError) {
    // Die Art des Fehlers steht in der Antwort und ist verlässlicher als ihr
    // Status: Ein erschöpftes Guthaben ist je nach Fall eine 400 oder eine
    // 402, meldet aber stets "billing_error".
    if (error.type === "billing_error" || error.status === 402) {
      return {
        status: 502,
        code: "upstream_credit",
        message:
          "Das Guthaben des Claude-API-Kontos ist erschöpft. Bitte laden Sie es auf oder hinterlegen Sie einen anderen Schlüssel.",
      };
    }
    // 529 ist die Überlastmeldung der Claude-API; das SDK führt sie als
    // Serverfehler.
    if (error.type === "overloaded_error" || error.status === 529) return BUSY;
    return {
      status: 502,
      code: "upstream_error",
      message: `Die Claude-API hat die Anfrage nicht beantwortet (${error.status ?? "Verbindungsfehler"}).`,
    };
  }
  if (error instanceof UnusableResponseError) {
    return { status: 502, code: "unusable_response", message: error.message };
  }
  return null;
}
