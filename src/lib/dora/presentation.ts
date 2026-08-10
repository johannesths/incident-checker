import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import type { SeverityResult } from "@/lib/schemas";

/** Darstellung der Gesamteinstufung – geteilt von Formular- und Ergebnisseite. */
export const CLASSIFICATION: Record<
  SeverityResult["classification"],
  { label: string; icon: typeof ShieldAlert; bar: string; chip: string }
> = {
  major: {
    label: "Schwerwiegender Vorfall",
    icon: ShieldAlert,
    bar: "bg-destructive",
    chip: "bg-destructive/10 text-destructive",
  },
  non_major: {
    label: "Kein schwerwiegender Vorfall",
    icon: ShieldCheck,
    bar: "bg-success",
    chip: "bg-success/15 text-success",
  },
  indeterminate: {
    label: "Nicht eindeutig bestimmbar",
    icon: ShieldQuestion,
    bar: "bg-warning",
    chip: "bg-warning/15 text-warning",
  },
};
