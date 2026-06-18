import { NextResponse } from "next/server";
import { getSeverityService } from "@/lib/ai";
import { severityInputSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Request-Body." }, { status: 400 });
  }

  const parsed = severityInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validierung fehlgeschlagen.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const result = await getSeverityService().assess(parsed.data);
  return NextResponse.json(result);
}
