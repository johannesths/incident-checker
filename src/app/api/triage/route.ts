import { NextResponse } from "next/server";
import { getTriageService } from "@/lib/ai";
import { describeAiError } from "@/lib/ai/claude/errors";
import {
  aiAvailability,
  aiOptionsFromRequest,
  isSameOrigin,
} from "@/lib/ai/request";
import { triageInputSchema } from "@/lib/schemas";

/** Womit der Server bewerten kann; die Triage-Seite richtet ihren Hinweis danach. */
export async function GET() {
  return NextResponse.json(aiAvailability());
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: "Anfragen sind nur aus der Anwendung selbst möglich." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiger Request-Body." },
      { status: 400 },
    );
  }

  const parsed = triageInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validierung fehlgeschlagen.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  // Schlüssel und Modell gelten nur für diese Anfrage; der Dienst wird je
  // Anfrage gebaut und nichts davon behalten.
  const options = aiOptionsFromRequest(request);
  try {
    const result = await getTriageService(options).classify(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    const failure = describeAiError(error);
    // Nur Art und Text des Fehlers – weder Schlüssel noch Meldungsinhalt.
    console.error(
      "Triage fehlgeschlagen:",
      error instanceof Error ? `${error.name}: ${error.message}` : error,
    );
    return NextResponse.json(
      {
        error: failure?.message ?? "Die Bewertung ist fehlgeschlagen.",
        code: failure?.code ?? "upstream_error",
      },
      { status: failure?.status ?? 502 },
    );
  }
}
