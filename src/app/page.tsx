import Link from "next/link";
import {
  ArrowRight,
  ListChecks,
  ShieldQuestion,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const STEPS = [
  {
    href: "/triage",
    step: "01",
    icon: ShieldQuestion,
    title: "Triage",
    desc: "Liegt überhaupt ein IKT-bezogener Vorfall vor, oder handelt es sich um ein reguläres Support-Anliegen? Sie beschreiben das Ereignis und erhalten eine Einschätzung samt Empfehlung zum weiteren Vorgehen – etwa, dass der ServiceDesk zuständig ist.",
    accent: "from-primary to-violet-500",
  },
  {
    href: "/severity",
    step: "02",
    icon: ListChecks,
    title: "Schweregrad (DORA)",
    desc: "Einstufung eines bestätigten Vorfalls als schwerwiegend anhand der DORA-Klassifizierungskriterien – je Einzelkriterium transparent aufgeschlüsselt, ob die Materialitätsschwelle erreicht ist.",
    accent: "from-violet-500 to-fuchsia-500",
  },
];

export default function Home() {
  return (
    <div className="space-y-14">
      {/* Hero */}
      <section className="space-y-6 pt-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
          <Sparkles className="size-3.5 text-primary" />
          KI-gestützte Auswertung folgt
        </span>
        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Klassifizierung von{" "}
          <span className="bg-linear-to-r from-primary to-violet-500 bg-clip-text text-transparent">
            IKT-bezogenen Vorfällen
          </span>
        </h1>
        <p className="mx-auto max-w-2xl text-pretty text-muted-foreground sm:text-lg">
          Diese Anwendung unterstützt Finanzunternehmen dabei, mögliche
          IKT-bezogene Vorfälle nach den Vorgaben der EU-Verordnung DORA
          einzuordnen: Erfassen Sie ein Ereignis, prüfen Sie die Zuständigkeit
          und bestimmen Sie den Schweregrad – nachvollziehbar und in zwei klaren
          Schritten.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/triage"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-[1.02]"
          >
            Vorfall prüfen
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/severity"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-5 py-2.5 text-sm font-medium backdrop-blur transition-colors hover:bg-muted"
          >
            Schweregrad bestimmen
          </Link>
        </div>
      </section>

      {/* Schritte */}
      <section className="grid gap-5 sm:grid-cols-2">
        {STEPS.map(({ href, step, icon: Icon, title, desc, accent }) => (
          <Link key={href} href={href} className="group">
            <Card className="relative h-full overflow-hidden border-border/60 bg-card/70 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5">
              <CardContent className="flex h-full flex-col gap-4 p-6">
                <div className="flex items-center justify-between">
                  <span
                    className={`flex size-11 items-center justify-center rounded-2xl bg-linear-to-br ${accent} text-white shadow-md`}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="font-mono text-3xl font-semibold text-muted-foreground/30">
                    {step}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
                <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  Öffnen
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <p className="mx-auto max-w-2xl text-center text-xs text-muted-foreground">
        Hinweis: Die Anwendung dient der Entscheidungsunterstützung und ersetzt
        keine abschließende fachliche Bewertung oder die formale Meldung an die
        Aufsicht. Die Bewertung erfolgt derzeit über eine Platzhalter-Logik; die
        Schwellenwerte sind gegen den aktuellen DORA-RTS zu verifizieren.
      </p>
    </div>
  );
}
