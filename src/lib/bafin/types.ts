import type { ReportInput, ReportReceipt } from "@/lib/schemas";

/**
 * Vertrag zwischen UI/API und der Meldeschnittstelle der BaFin.
 *
 * Eine solche Schnittstelle steht derzeit nicht zur Verfügung. Die UI kennt
 * ausschließlich dieses Interface, sodass ein echter Konnektor später ohne
 * Änderungen an UI oder API eingehängt werden kann (siehe ./index).
 */
export interface ReportingService {
  submit(input: ReportInput): Promise<ReportReceipt>;
}
