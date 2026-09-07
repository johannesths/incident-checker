"use client";

import {
  clearStored,
  saveStored,
  updateStored,
  useStoredValue,
} from "@/lib/web-storage";

/**
 * Ergebnisse und Formularentwürfe liegen im sessionStorage: Die Ergebnisseite
 * kann so eigenständig gerendert und neu geladen werden, und der Weg zurück ins
 * Formular erhält die bereits erfassten Eingaben. Mit dem Tab endet der Vorgang.
 *
 * Dauerhafte Konfiguration – das Unternehmensprofil – liegt dagegen im
 * localStorage (siehe @/lib/company/store).
 */
export const STORAGE_KEYS = {
  triageDraft: "indincident:triage:draft",
  triageResult: "indincident:triage:result",
  severityDraft: "indincident:severity:draft",
  severityResult: "indincident:severity:result",
  reportDraft: "indincident:report:draft",
  reportReceipt: "indincident:report:receipt",
} as const;

/**
 * Liefert den gespeicherten Wert. `undefined` bedeutet, dass der Speicher noch
 * nicht gelesen wurde (Server-Rendering bzw. Hydration) – erst danach steht
 * `null` für "kein Wert vorhanden".
 */
export function useSessionValue<T>(key: string): T | null | undefined {
  return useStoredValue<T>("session", key);
}

export function saveSession<T>(key: string, value: T): void {
  saveStored("session", key, value);
}

/** Aktualisiert einen Wert auf Basis des aktuell gespeicherten Stands. */
export function updateSession<T>(
  key: string,
  updater: (current: T | null) => T,
): void {
  updateStored("session", key, updater);
}

export function clearSession(...keys: string[]): void {
  clearStored("session", ...keys);
}
