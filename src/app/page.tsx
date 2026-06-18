import Link from "next/link";
import { ArrowRight, ListChecks, ShieldQuestion } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Klassifizierung von IKT-Vorfällen
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Erfassen Sie ein mögliches Ereignis und erhalten Sie eine Einschätzung,
          ob ein IKT-Vorfall vorliegt und wie zu verfahren ist. Bestimmen Sie
          anschließend den Schweregrad anhand der DORA-Kriterien.
        </p>
        <p className="text-xs text-muted-foreground">
          Hinweis: Die Bewertung erfolgt derzeit über eine Platzhalter-Logik. Die
          KI-gestützte Auswertung wird zu einem späteren Zeitpunkt ergänzt.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/triage" className="group">
          <Card className="h-full transition-colors group-hover:border-primary">
            <CardHeader>
              <ShieldQuestion className="size-6 text-primary" />
              <CardTitle className="flex items-center gap-2">
                1. Triage
                <ArrowRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
              </CardTitle>
              <CardDescription>
                Liegt überhaupt ein IKT-Vorfall vor? Empfehlung zum weiteren
                Vorgehen (z. B. Zuständigkeit ServiceDesk).
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/severity" className="group">
          <Card className="h-full transition-colors group-hover:border-primary">
            <CardHeader>
              <ListChecks className="size-6 text-primary" />
              <CardTitle className="flex items-center gap-2">
                2. Schweregrad (DORA)
                <ArrowRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
              </CardTitle>
              <CardDescription>
                Einstufung als schwerwiegender Vorfall anhand der
                DORA-Klassifizierungskriterien.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Diese Anwendung ist als Vorab-Gerüst konzipiert: UI und Datenflüsse
          stehen, die fachliche/KI-gestützte Bewertung wird über austauschbare
          Service-Schnittstellen ergänzt.
        </CardContent>
      </Card>
    </div>
  );
}
