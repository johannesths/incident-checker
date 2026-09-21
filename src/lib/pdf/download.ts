import type { ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";

/**
 * Erzeugt das PDF im Browser und reicht es als Download an den Nutzer. Der
 * Renderer wird erst hier geladen – er wiegt rund ein Megabyte und gehört
 * nicht in das Bündel der Seite. Die Daten verlassen dabei den Browser nicht.
 */
export async function downloadPdf(
  doc: ReactElement<DocumentProps>,
  filename: string,
): Promise<void> {
  const { pdf } = await import("@react-pdf/renderer");
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Erst freigeben, wenn der Browser den Download sicher angestoßen hat.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Dateiname aus Bestandteilen, z. B. ["Erstmeldung", "INC-2026-017"] am
 * 21.09.2026 → "Threatly-Erstmeldung-INC-2026-017-2026-09-21.pdf". Umlaute
 * bleiben erhalten, Sonderzeichen und Leerzeichen werden zu Bindestrichen.
 */
export function pdfFilename(
  parts: (string | null | undefined)[],
  date: Date,
): string {
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
  const safe = ["Threatly", ...parts, stamp]
    .filter((p): p is string => Boolean(p && p.trim()))
    .map((p) =>
      p
        .trim()
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-+|-+$/g, ""),
    )
    .filter(Boolean);
  return `${safe.join("-")}.pdf`;
}
