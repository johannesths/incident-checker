import type { ReportReceipt, SubmissionInput } from "@/lib/schemas";

/**
 * Vertrag zwischen UI/API und der Meldeschnittstelle der BaFin.
 *
 * Eine solche Schnittstelle steht derzeit nicht zur Verfügung. Die UI kennt
 * ausschließlich dieses Interface, sodass ein echter Konnektor später ohne
 * Änderungen an UI oder API eingehängt werden kann (siehe ./index).
 *
 * Übermittelt werden beide Meldungen des Art. 19 DORA: die Meldung eines
 * schwerwiegenden Vorfalls und die freiwillige Meldung einer erheblichen
 * Cyberbedrohung.
 */
export interface ReportingService {
  submit(input: SubmissionInput): Promise<ReportReceipt>;
}
