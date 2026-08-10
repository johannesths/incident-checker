import { MockBafinReportingService } from "./mock";
import type { ReportingService } from "./types";

/**
 * Zentrale Stelle, an der der Meldekonnektor gewählt wird.
 *
 * Aktuell: Simulation (siehe ./mock) – eine Meldeschnittstelle der BaFin für
 * DORA-Vorfallmeldungen ist nicht angebunden. Sobald sie zur Verfügung steht,
 * wird die echte Implementierung hier eingehängt, z. B. gesteuert über eine
 * Umgebungsvariable. UI und API bleiben unverändert.
 */
export function getReportingService(): ReportingService {
  return new MockBafinReportingService();
}

export type { ReportingService } from "./types";
