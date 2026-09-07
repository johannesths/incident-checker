import { NextResponse } from "next/server";
import { getReportingService } from "@/lib/bafin";
import { blockingChecks, checkReport } from "@/lib/dora/report-checks";
import { submissionInputSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Request-Body." }, { status: 400 });
  }

  const parsed = submissionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validierung fehlgeschlagen.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  if (parsed.data.kind === "incident") {
    // Nicht schwerwiegende Vorfälle sind nicht meldepflichtig (Art. 19 Abs. 1
    // DORA). Über diesen Weg gehen sie nur als Neueinstufung eines bereits
    // gemeldeten Vorfalls (Art. 2 Buchst. i des RTS); ohne vorherige Meldung
    // bleibt die freiwillige Meldung einer erheblichen Cyberbedrohung
    // (Art. 19 Abs. 2 DORA).
    if (
      parsed.data.classification === "non_major" &&
      !parsed.data.reclassifiedAsNonMajor
    ) {
      return NextResponse.json(
        {
          error:
            "Der Vorfall ist nicht schwerwiegend und damit nicht meldepflichtig. Er ist nur als Neueinstufung eines bereits gemeldeten Vorfalls zu übermitteln; im Übrigen bleibt die freiwillige Meldung einer erheblichen Cyberbedrohung.",
        },
        { status: 409 },
      );
    }

    // Widersprüchliche Angaben nimmt auch die Aufsicht nicht entgegen; die
    // Hinweise (severity "warning") bleiben dem Formular überlassen.
    const errors = blockingChecks(checkReport(parsed.data));
    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "Die Angaben der Meldung sind nicht widerspruchsfrei.",
          checks: errors,
        },
        { status: 422 },
      );
    }
  }

  const receipt = await getReportingService().submit(parsed.data);
  return NextResponse.json(receipt);
}
