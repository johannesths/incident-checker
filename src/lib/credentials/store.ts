"use client";

import { useMemo } from "react";
import { clearStored, saveStored, useStoredValue } from "@/lib/web-storage";
import {
  EMPTY_CREDENTIALS,
  normalizeCredentials,
  type Credentials,
} from "./credentials";

/**
 * Die Zugangsschlüssel liegen – wie das Unternehmensprofil – im localStorage:
 * Sie sollen bis zum Ablauf der Frist erhalten bleiben, nicht mit dem Tab
 * enden. Ein eigener Eintrag hält sie vom Profil getrennt, das mit dem
 * Beispielunternehmen zurückgesetzt und in Meldungen übernommen wird.
 *
 * Der localStorage ist für jedes Skript dieser Herkunft lesbar; die Frist des
 * API-Schlüssels begrenzt, wie lange ein entwendeter Schlüssel nützt.
 */
export const CREDENTIALS_KEY = "indincident:credentials";

/**
 * Die gespeicherten Schlüssel. `undefined`, solange der Speicher nicht gelesen
 * wurde (Server-Rendering bzw. Hydration) – danach immer ein vollständiger,
 * gegebenenfalls leerer Satz.
 */
export function useCredentials(): Credentials | undefined {
  const stored = useStoredValue<Partial<Credentials>>("local", CREDENTIALS_KEY);
  return useMemo(
    () =>
      stored === undefined
        ? undefined
        : stored === null
          ? EMPTY_CREDENTIALS
          : normalizeCredentials(stored),
    [stored],
  );
}

export function saveCredentials(credentials: Credentials): void {
  saveStored("local", CREDENTIALS_KEY, credentials);
}

/** Entfernt alle Schlüssel aus diesem Browser. */
export function clearCredentials(): void {
  clearStored("local", CREDENTIALS_KEY);
}
