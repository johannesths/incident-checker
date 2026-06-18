import type {
  TriageInput,
  TriageResult,
  SeverityInput,
  SeverityResult,
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
