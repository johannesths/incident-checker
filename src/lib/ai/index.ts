import "server-only";
import { MockSeverityService, MockTriageService } from "./mock";
import { ClaudeTriageService } from "./claude/triage";
import type { AiRequestOptions } from "./request";
import type { SeverityService, TriageService } from "./types";

/**
 * Zentrale Stelle, an der die konkrete KI-Implementierung gewählt wird.
 *
 * Triage: Claude, sobald ein API-Schlüssel vorliegt – aus dem Browser des
 * Nutzers oder aus der Umgebung des Servers (siehe ./request). Ohne Schlüssel
 * bleibt das regelbasierte Platzhalter-Verfahren, damit die Anwendung auch
 * ohne Zugang vorführbar bleibt; das Ergebnis nennt seine Herkunft.
 *
 * Schweregrad: noch das regelbasierte Verfahren.
 */

export function getTriageService(options: AiRequestOptions): TriageService {
  return options.apiKey
    ? new ClaudeTriageService(options.apiKey, options.model)
    : new MockTriageService();
}

export function getSeverityService(): SeverityService {
  return new MockSeverityService();
}

export type { SeverityService, TriageService } from "./types";
