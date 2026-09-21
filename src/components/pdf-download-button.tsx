"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { DocumentProps } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { downloadPdf } from "@/lib/pdf/download";

/**
 * Schaltfläche, die eine Zusammenfassung als PDF speichert. Das Dokument wird
 * erst beim Klick aufgebaut: `buildDocument` lädt das Modul mit dem Dokument – und
 * damit den Renderer – dynamisch nach, damit beides nicht in das Bündel der
 * Seite gelangt.
 */
export function PdfDownloadButton({
  buildDocument,
  filename,
  children = "Als PDF speichern",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "onClick" | "children"> & {
  buildDocument: () => Promise<ReactElement<DocumentProps>>;
  filename: string;
  children?: ReactNode;
}) {
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      await downloadPdf(await buildDocument(), filename);
    } catch (err) {
      console.error(err);
      toast.error("Die PDF-Datei konnte nicht erstellt werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="outline"
      {...props}
      onClick={onClick}
      disabled={busy || props.disabled}
      aria-busy={busy}
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <FileDown className="size-4" />
      )}
      {busy ? "PDF wird erstellt …" : children}
    </Button>
  );
}
