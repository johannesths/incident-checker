import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Ein Client je Anfrage. Der Schlüssel kommt aus dem Browser des Nutzers und
 * darf den Server nur für die Dauer der Anfrage berühren – deshalb kein
 * Modul-Cache. Der Aufbau kostet nichts Nennenswertes.
 *
 * Keine automatische Wiederholung: Sie würde auch eine Antwort, die nur zu
 * lange dauert, ein zweites Mal anfordern – doppelte Kosten, doppelte Wartezeit.
 * Bei Überlast oder Netzfehlern sagt die Oberfläche Bescheid, und der Nutzer
 * fordert selbst erneut an.
 */
export function createClaudeClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, maxRetries: 0, timeout: 90_000 });
}
