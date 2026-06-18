import { MockSeverityService, MockTriageService } from "./mock";
import type { SeverityService, TriageService } from "./types";

/**
 * Zentrale Stelle, an der die konkrete KI-Implementierung gewählt wird.
 *
 * Aktuell: Mock-Implementierungen. Sobald die echte KI-Schicht existiert
 * (z. B. ClaudeTriageService in ./claude), wird sie hier eingehängt –
 * gesteuert z. B. über eine Umgebungsvariable.
 */

export function getTriageService(): TriageService {
  return new MockTriageService();
}

export function getSeverityService(): SeverityService {
  return new MockSeverityService();
}

export type { SeverityService, TriageService } from "./types";
