import { NextResponse } from "next/server";
import { getSeverityExtractionService } from "@/lib/ai";
import { describeAiError } from "@/lib/ai/claude/errors";
import {
  aiAvailability,
  aiOptionsFromRequest,
  isSameOrigin,
} from "@/lib/ai/request";
import { severityExtractionInputSchema } from "@/lib/schemas";

/** Womit der Server übernehmen kann; die Seite blendet das Angebot danach ein. */
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

  const parsed = severityExtractionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validierung fehlgeschlagen.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const service = getSeverityExtractionService(aiOptionsFromRequest(request));
  if (!service) {
    return NextResponse.json(
      {
        error:
          "Für die Übernahme aus einer Beschreibung wird ein Claude-API-Schlüssel benötigt.",
        code: "no_key",
      },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await service.extract(parsed.data));
  } catch (error) {
    const failure = describeAiError(error);
    // Nur Art und Text des Fehlers – weder Schlüssel noch Beschreibung.
    console.error(
      "Übernahme fehlgeschlagen:",
      error instanceof Error ? `${error.name}: ${error.message}` : error,
    );
    return NextResponse.json(
      {
        error: failure?.message ?? "Die Übernahme ist fehlgeschlagen.",
        code: failure?.code ?? "upstream_error",
      },
      { status: failure?.status ?? 502 },
    );
  }
}
