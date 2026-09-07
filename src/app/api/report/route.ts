import { NextResponse } from "next/server";
import { getReportingService } from "@/lib/bafin";
import { blockingChecks, checkReport } from "@/lib/dora/report-checks";
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
  // oder als Rückstufung eines bereits gemeldeten Vorfalls annehmen
  // (Art. 19 Abs. 1 und 2 DORA, Art. 5 der Durchführungsverordnung (EU)
  // 2025/302).
  if (
    parsed.data.classification === "non_major" &&
    !parsed.data.voluntary &&
    parsed.data.reportType !== "reclassification"
  ) {
    return NextResponse.json(
      {
        error:
          "Der Vorfall ist nicht schwerwiegend und damit nicht meldepflichtig. Eine Übermittlung ist nur als Rückstufung oder als freiwillige Meldung möglich.",
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

  const receipt = await getReportingService().submit(parsed.data);
  return NextResponse.json(receipt);
}
