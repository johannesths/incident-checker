import type {
  TriageInput,
  TriageResult,
  SeverityInput,
  SeverityResult,
  SeverityExtraction,
  SeverityExtractionInput,
} from "@/lib/schemas";

/**
 * Vertrag zwischen UI/API und der (späteren) KI-Schicht.
 *
 * Die UI kennt nur diese Interfaces. Aktuell liefert eine Mock-Implementierung
 * (siehe ./mock) deterministische Ergebnisse. Später wird eine echte
 * Implementierung (z. B. ./claude) eingehängt, ohne dass sich UI oder API
 * ändern müssen.
 */

export interface TriageService {
  classify(input: TriageInput): Promise<TriageResult>;
}

export interface SeverityService {
  assess(input: SeverityInput): Promise<SeverityResult>;
}

/**
 * Trägt die Angaben zu den Kriterien aus einer Beschreibung zusammen. Die
 * Bewertung bleibt dem SeverityService – und damit der Regelbasis –
 * vorbehalten.
 */
export interface SeverityExtractionService {
  extract(input: SeverityExtractionInput): Promise<SeverityExtraction>;
}
