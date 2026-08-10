import { NextResponse } from "next/server";
import { getReportingService } from "@/lib/bafin";
import { reportInputSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Request-Body." }, { status: 400 });
  }

  const parsed = reportInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validierung fehlgeschlagen.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  // Nicht meldepflichtige Vorfälle nur als ausdrücklich freiwillige Meldung
  // annehmen (Art. 19 Abs. 1 und 2 DORA).
  if (parsed.data.classification === "non_major" && !parsed.data.voluntary) {
    return NextResponse.json(
      {
        error:
          "Der Vorfall ist nicht schwerwiegend und damit nicht meldepflichtig. Eine Übermittlung ist nur als freiwillige Meldung möglich.",
      },
      { status: 409 },
    );
  }

  const receipt = await getReportingService().submit(parsed.data);
  return NextResponse.json(receipt);
}
