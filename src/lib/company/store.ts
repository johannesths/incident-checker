"use client";

import { useMemo } from "react";
import { clearStored, saveStored, useStoredValue } from "@/lib/web-storage";
import { normalizeProfile, type CompanyProfile } from "./profile";

/**
 * Das Unternehmensprofil gilt für alle Vorfälle und liegt deshalb – anders als
 * die Vorfallentwürfe – im localStorage: Es überdauert Tab und Sitzung. Ist
 * nichts gespeichert, greift das Demo-Profil.
 */
export const COMPANY_PROFILE_KEY = "indincident:company:profile";

/**
 * Das aktuelle Profil. `undefined`, solange der Speicher nicht gelesen wurde
 * (Server-Rendering bzw. Hydration) – danach immer ein vollständiges Profil.
 */
export function useCompanyProfile(): CompanyProfile | undefined {
  const stored = useStoredValue<Partial<CompanyProfile>>(
    "local",
    COMPANY_PROFILE_KEY,
  );
  return useMemo(
    () => (stored === undefined ? undefined : normalizeProfile(stored)),
    [stored],
  );
}

export function saveCompanyProfile(profile: CompanyProfile): void {
  saveStored("local", COMPANY_PROFILE_KEY, profile);
}

/** Verwirft die Anpassungen; danach gilt wieder das Demo-Profil. */
export function resetCompanyProfile(): void {
  clearStored("local", COMPANY_PROFILE_KEY);
}
