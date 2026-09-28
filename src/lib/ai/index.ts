import "server-only";
import { MockSeverityService, MockTriageService } from "./mock";
import { ClaudeTriageService } from "./claude/triage";
import { ClaudeSeverityExtractionService } from "./claude/severity-extract";
import type { AiRequestOptions } from "./request";
import type {
  SeverityExtractionService,
  SeverityService,
  TriageService,
} from "./types";

/**
 * Zentrale Stelle, an der die konkrete KI-Implementierung gewählt wird.
 *
 * Triage: Claude, sobald ein API-Schlüssel vorliegt – aus dem Browser des
 * Nutzers oder aus der Umgebung des Servers (siehe ./request). Ohne Schlüssel
 * bleibt das regelbasierte Platzhalter-Verfahren, damit die Anwendung auch
 * ohne Zugang vorführbar bleibt; das Ergebnis nennt seine Herkunft.
 *
 * Schweregrad: Die Einstufung bleibt regelbasiert – sie muss reproduzierbar
 * und begründbar sein. Claude hilft nur beim Zusammentragen der Angaben aus
 * einer Beschreibung, sofern ein Schlüssel vorliegt.
 */

export function getTriageService(options: AiRequestOptions): TriageService {
  return options.apiKey
    ? new ClaudeTriageService(options.apiKey, options.model)
    : new MockTriageService();
}

/** null, solange kein Schlüssel vorliegt – ohne Modell gibt es nichts zu übernehmen. */
export function getSeverityExtractionService(
  options: AiRequestOptions,
): SeverityExtractionService | null {
  return options.apiKey
    ? new ClaudeSeverityExtractionService(options.apiKey, options.model)
    : null;
}

export function getSeverityService(): SeverityService {
  return new MockSeverityService();
}

export type {
  SeverityExtractionService,
  SeverityService,
  TriageService,
} from "./types";
