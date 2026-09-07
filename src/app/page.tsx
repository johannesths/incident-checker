import Link from "next/link";
import {
  ArrowRight,
  ListChecks,
  SendHorizonal,
  ShieldQuestion,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const STEPS = [
  {
    href: "/triage",
    step: "01",
    icon: ShieldQuestion,
    title: "Triage",
    desc: "Einschätzung eines Vorfalls als IKT-bezogen oder reguläres Support-Anliegen.",
    tone: "bg-[var(--tone-orange-300)]",
    openText: "Einschätzung erhalten"
  },
  {
    href: "/severity",
    step: "02",
    icon: ListChecks,
    title: "Schweregrad (DORA)",
    desc: "Einstufung eines bestätigten Vorfalls als schwerwiegend anhand der DORA-Klassifizierungskriterien.",
    tone: "bg-[var(--tone-orange-400)]",
    openText: "Schweregrad bestimmen"
  },
  {
    href: "/meldung",
    step: "03",
    icon: SendHorizonal,
    title: "Meldung (BaFin)",
    desc: "Ist der Vorfall schwerwiegend, ist er der Aufsicht zu melden (Art. 19 DORA).",
    tone: "bg-[var(--tone-orange-500)]",
    openText: "Meldung vorbereiten"
  },
];

export default function Home() {
  return (
    <div className="space-y-14">
      {/* Hero */}
      <section className="space-y-6 pt-6 text-center">
        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Identifizierung, Klassifizierung und Meldung von{" "}
          <span className="text-(--tone-orange-500)">
            IKT-bezogenen Vorfällen
          </span>
        </h1>
        <p className="mx-auto max-w-2xl text-pretty text-muted-foreground sm:text-lg">
          Erhalten Sie Unterstüzung dabei, mögliche
          IKT-bezogene Vorfälle nach den Vorgaben der EU-Verordnung DORA
          einzuordnen: Erfassen Sie ein Ereignis, prüfen Sie die Zuständigkeit,
          bestimmen Sie den Schweregrad und melden Sie den Vorfall.
        </p>
      </section>

      {/* Schritte */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map(({ href, step, icon: Icon, title, desc, tone, openText }) => (
          <Link key={href} href={href} className="group">
            <Card className="relative h-full overflow-hidden border-border/60 bg-card/70 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5">
              <CardContent className="flex h-full flex-col gap-4 p-6">
                <div className="flex items-center justify-between">
                  <span
                    className={`flex size-11 items-center justify-center rounded-2xl ${tone} text-primary-foreground shadow-md`}
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
                  {openText}
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
        Aufsicht. Die hinterlegten Schwellenwerte sind gegen den aktuellen
        DORA-RTS zu verifizieren.
      </p>
    </div>
  );
}
