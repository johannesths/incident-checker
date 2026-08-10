"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** pending = noch nicht bearbeitet, skipped = als nicht zutreffend abgehakt. */
export type StepStatus = "pending" | "done" | "skipped";

const MARKER_STYLE: Record<StepStatus, string> = {
  pending: "border-border/70 bg-background text-muted-foreground",
  done: "border-success/40 bg-success/15 text-success",
  skipped: "border-border/70 bg-muted text-muted-foreground",
};

/**
 * Eine Stufe eines Erfassungsbaums: Kopfzeile mit Status und Kurzfassung,
 * aufklappbarer Inhalt. Wird als <li> in eine <ol> gesetzt; die Verbindungslinie
 * zur nächsten Stufe zeichnet die Stufe selbst (außer der letzten).
 */
export function StepRow({
  marker,
  status,
  title,
  article,
  summary,
  open = false,
  isLast = false,
  trailing,
  onToggle,
  children,
}: {
  marker: React.ReactNode;
  status: StepStatus;
  title: string;
  article?: string;
  summary: string;
  open?: boolean;
  isLast?: boolean;
  trailing?: React.ReactNode;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <li className="relative pl-14">
      {!isLast && (
        <span
          aria-hidden
          className="absolute -bottom-3 left-[19px] top-11 w-px bg-border/70"
        />
      )}
      <span
        className={cn(
          "absolute left-0 top-1 flex size-10 items-center justify-center rounded-full border text-sm font-semibold",
          MARKER_STYLE[status],
          open && "border-primary bg-primary/10 text-primary",
        )}
      >
        {marker}
      </span>
      <div
        className={cn(
          "overflow-hidden rounded-xl border transition-colors",
          open
            ? "border-primary/40 bg-card/80 backdrop-blur"
            : "border-border/60 bg-muted/20",
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={children ? open : undefined}
          className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/40"
        >
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold tracking-tight">
                {title}
              </span>
              {article && (
                <span className="rounded-full border border-border/60 bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {article}
                </span>
              )}
            </span>
            {!open && summary && (
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {summary}
              </span>
            )}
          </span>
          {trailing ?? (
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          )}
        </button>
        {open && children && (
          <div className="space-y-4 border-t border-border/60 p-4">
            {children}
          </div>
        )}
      </div>
    </li>
  );
}
