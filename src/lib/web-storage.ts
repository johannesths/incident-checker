"use client";

import { useSyncExternalStore } from "react";

/**
 * Zugriff auf die Browser-Speicher über useSyncExternalStore: Der Speicher ist
 * damit die einzige Quelle der Wahrheit und es braucht kein Nachladen per
 * Effekt.
 *
 * "session" für alles, was zum laufenden Vorfall gehört (Entwürfe, Ergebnisse)
 * – es soll mit dem Tab enden. "local" für dauerhafte Konfiguration wie das
 * Unternehmensprofil, das über Sitzungen hinweg erhalten bleibt.
 */
export type StorageArea = "session" | "local";

const listeners = new Set<() => void>();

/** Zwischenspeicher je Bereich/Schlüssel, damit getSnapshot stabile Referenzen liefert. */
const snapshots = new Map<string, { raw: string | null; value: unknown }>();

function storage(area: StorageArea): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return area === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    // Privater Modus o. Ä. – die Anwendung funktioniert auch ohne Speicherung.
    return null;
  }
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function emit(): void {
  for (const listener of listeners) listener();
}

function readRaw(area: StorageArea, key: string): string | null {
  try {
    return storage(area)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function getSnapshot<T>(area: StorageArea, key: string): T | null {
  const raw = readRaw(area, key);
  const cacheKey = `${area}:${key}`;
  const cached = snapshots.get(cacheKey);
  if (cached && cached.raw === raw) return cached.value as T | null;

  let value: unknown = null;
  if (raw !== null) {
    try {
      value = JSON.parse(raw);
    } catch {
      value = null;
    }
  }
  snapshots.set(cacheKey, { raw, value });
  return value as T | null;
}

/**
 * Liefert den gespeicherten Wert. `undefined` bedeutet, dass der Speicher noch
 * nicht gelesen wurde (Server-Rendering bzw. Hydration) – erst danach steht
 * `null` für "kein Wert vorhanden".
 */
export function useStoredValue<T>(
  area: StorageArea,
  key: string,
): T | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot<T>(area, key),
    () => undefined,
  );
}

export function saveStored<T>(area: StorageArea, key: string, value: T): void {
  try {
    storage(area)?.setItem(key, JSON.stringify(value));
  } catch {
    // s. o.
  }
  emit();
}

/** Aktualisiert einen Wert auf Basis des aktuell gespeicherten Stands. */
export function updateStored<T>(
  area: StorageArea,
  key: string,
  updater: (current: T | null) => T,
): void {
  saveStored(area, key, updater(getSnapshot<T>(area, key)));
}

export function clearStored(area: StorageArea, ...keys: string[]): void {
  try {
    const target = storage(area);
    for (const key of keys) target?.removeItem(key);
  } catch {
    // s. o.
  }
  emit();
}
