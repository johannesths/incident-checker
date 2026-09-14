/**
 * Rechtsträgerkennung (Legal Entity Identifier, ISO 17442).
 *
 * Ein LEI besteht aus 20 alphanumerischen Zeichen: vier Zeichen der
 * vergebenden Stelle, zwei reservierte Nullen, zwölf Zeichen für den
 * Rechtsträger und zwei Prüfziffern. Die Prüfziffern folgen ISO 7064
 * MOD 97-10 wie bei der IBAN: Buchstaben werden zu Zahlen (A = 10 … Z = 35),
 * und die so entstehende Zahl lässt bei Division durch 97 den Rest 1.
 *
 * Die Prüfung greift, was ein Regex nicht kann: Zahlendreher und vertauschte
 * Zeichen. Ein LEI, der sie nicht besteht, würde von der Behörde
 * zurückgewiesen.
 */

const SHAPE = /^[A-Z0-9]{20}$/;

/** Buchstaben zu Zahlen nach ISO 7064 (A = 10 … Z = 35). */
function toDigits(value: string): string {
  let digits = "";
  for (const char of value) {
    digits += /[A-Z]/.test(char)
      ? String(char.charCodeAt(0) - 55)
      : char;
  }
  return digits;
}

/** Rest der Division durch 97, ziffernweise – die Zahl übersteigt 2^53. */
function mod97(digits: string): number {
  let remainder = 0;
  for (const digit of digits) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder;
}

/** Hat der Wert die Form eines LEI und stimmen seine Prüfziffern? */
export function isValidLei(value: string): boolean {
  return SHAPE.test(value) && mod97(toDigits(value)) === 1;
}

/**
 * Warum ein Wert kein gültiger LEI ist – für die Anzeige am Feld. `null`,
 * wenn er gültig ist.
 */
export function leiProblem(value: string): string | null {
  if (!SHAPE.test(value)) {
    return `Der LEI besteht aus 20 alphanumerischen Zeichen – angegeben sind ${value.length}.`;
  }
  if (mod97(toDigits(value)) !== 1) {
    return "Die Prüfziffern des LEI stimmen nicht.";
  }
  return null;
}
