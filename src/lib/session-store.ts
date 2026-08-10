"use client";

import { useSyncExternalStore } from "react";

/**
 * Ergebnisse und Formularentwürfe liegen im sessionStorage: Die Ergebnisseite
 * kann so eigenständig gerendert und neu geladen werden, und der Weg zurück ins
 * Formular erhält die bereits erfassten Eingaben.
 *
 * Der Zugriff läuft über useSyncExternalStore – der Speicher ist damit die
 * einzige Quelle der Wahrheit und es braucht kein Nachladen per Effekt.
 */
export const STORAGE_KEYS = {
  triageDraft: "indincident:triage:draft",
  triageResult: "indincident:triage:result",
  severityDraft: "indincident:severity:draft",
  severityResult: "indincident:severity:result",
  reportDraft: "indincident:report:draft",
  reportReceipt: "indincident:report:receipt",
} as const;

const listeners = new Set<() => void>();

/** Zwischenspeicher je Schlüssel, damit getSnapshot stabile Referenzen liefert. */
const snapshots = new Map<string, { raw: string | null; value: unknown }>();

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function emit(): void {
  for (const listener of listeners) listener();
}

function readRaw(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    // Privater Modus o. Ä. – die Anwendung funktioniert auch ohne Speicherung.
    return null;
  }
}

function getSnapshot<T>(key: string): T | null {
  const raw = readRaw(key);
  const cached = snapshots.get(key);
  if (cached && cached.raw === raw) return cached.value as T | null;

  let value: unknown = null;
  if (raw !== null) {
    try {
      value = JSON.parse(raw);
    } catch {
      value = null;
    }
  }
  snapshots.set(key, { raw, value });
  return value as T | null;
}

/**
 * Liefert den gespeicherten Wert. `undefined` bedeutet, dass der Speicher noch
 * nicht gelesen wurde (Server-Rendering bzw. Hydration) – erst danach steht
 * `null` für "kein Wert vorhanden".
 */
export function useSessionValue<T>(key: string): T | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot<T>(key),
    () => undefined,
  );
}

export function saveSession<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // s. o.
  }
  emit();
}

/** Aktualisiert einen Wert auf Basis des aktuell gespeicherten Stands. */
export function updateSession<T>(
  key: string,
  updater: (current: T | null) => T,
): void {
  saveSession(key, updater(getSnapshot<T>(key)));
}

export function clearSession(...keys: string[]): void {
  if (typeof window === "undefined") return;
  try {
    for (const key of keys) window.sessionStorage.removeItem(key);
  } catch {
    // s. o.
  }
  emit();
}
