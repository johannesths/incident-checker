import { MockSeverityService, MockTriageService } from "./mock";
import type { SeverityService, TriageService } from "./types";

/**
 * Zentrale Stelle, an der die konkrete KI-Implementierung gewählt wird.
 *
 * Aktuell: Mock-Implementierungen
 */

export function getTriageService(): TriageService {
  return new MockTriageService();
}

export function getSeverityService(): SeverityService {
  return new MockSeverityService();
}

export type { SeverityService, TriageService } from "./types";
