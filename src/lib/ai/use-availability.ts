"use client";

import { useEffect, useState } from "react";
import { DEFAULT_CLAUDE_MODEL, type AiAvailability } from "./models";

/** Bis die Antwort da ist, gilt: kein Schlüssel auf dem Server. */
const NO_SERVER_KEY: AiAvailability = {
  serverKey: false,
  defaultModel: DEFAULT_CLAUDE_MODEL,
};

/**
 * Fragt den Server, ob er ohne Schlüssel aus dem Browser bewerten kann. Erst
 * mit der Antwort stimmt der Hinweis in jedem Fall – ohne sie stünde dort
 * "regelbasiert", obwohl der Server einen Unternehmensschlüssel hat.
 *
 * `null`, solange die Antwort aussteht.
 */
export function useAiAvailability(endpoint: string): AiAvailability | null {
  const [availability, setAvailability] = useState<AiAvailability | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(endpoint)
      .then((res) => (res.ok ? (res.json() as Promise<AiAvailability>) : null))
      .then((data) => {
        if (!cancelled) setAvailability(data ?? NO_SERVER_KEY);
      })
      .catch(() => {
        if (!cancelled) setAvailability(NO_SERVER_KEY);
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint]);
  return availability;
}
