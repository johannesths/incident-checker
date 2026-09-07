"use client";

import { useState } from "react";
import {
  Building2,
  ClipboardList,
  Gauge,
  Info,
  Landmark,
  Network,
  RotateCcw,
  Save,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DEMO_COMPANY_PROFILE,
  ENTITY_TYPES,
  companyProfileSchema,
  profileNumber,
  type CompanyProfile,
} from "@/lib/company/profile";
import {
  resetCompanyProfile,
  saveCompanyProfile,
  useCompanyProfile,
} from "@/lib/company/store";

/** Die Kategorien des Art. 2 Abs. 1 DORA als Auswahlliste. */
const ENTITY_TYPE_ITEMS = ENTITY_TYPES.map((t) => ({
  value: t.id,
  label: t.label,
}));

const LEI_PATTERN = /^[A-Z0-9]{20}$/;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

/** Felder, die eine Zahl ab 0 aufnehmen (leer = keine Angabe). */
const NUMERIC_FIELDS = [
  "totalClients",
  "dailyTransactionsCount",
  "dailyTransactionsValueEur",
  "memberStatesOfOperation",
] as const satisfies readonly (keyof CompanyProfile)[];

type FieldErrors = Partial<Record<keyof CompanyProfile, string>>;

/**
 * Geprüft wird nur, was nachweislich falsch ist: Ein unvollständiges Profil ist
 * zulässig – die fehlenden Angaben verlangt dann das Meldeformular.
 */
function validate(form: CompanyProfile): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.name.trim()) {
    errors.name = "Bitte geben Sie den Namen des Unternehmens an.";
  }
  if (form.lei && !LEI_PATTERN.test(form.lei)) {
    errors.lei = "Der LEI besteht aus 20 alphanumerischen Zeichen.";
  }
  if (form.contactEmail && !EMAIL_PATTERN.test(form.contactEmail)) {
    errors.contactEmail = "Bitte geben Sie eine gültige E-Mail-Adresse an.";
  }
  if (form.secondContactEmail && !EMAIL_PATTERN.test(form.secondContactEmail)) {
    errors.secondContactEmail =
      "Bitte geben Sie eine gültige E-Mail-Adresse an.";
  }
  if (form.groupParentLei && !LEI_PATTERN.test(form.groupParentLei)) {
    errors.groupParentLei =
      "Der LEI besteht aus 20 alphanumerischen Zeichen.";
  }
  if (form.reportingCurrency && !CURRENCY_PATTERN.test(form.reportingCurrency)) {
    errors.reportingCurrency =
      "Bitte geben Sie einen ISO-4217-Code aus drei Buchstaben an, z. B. EUR.";
  }
  for (const key of NUMERIC_FIELDS) {
    const value = form[key];
    if (value.trim() === "") continue;
    const parsed = profileNumber(value);
    if (parsed === null || parsed < 0) {
      errors[key] = "Bitte geben Sie eine Zahl ab 0 an.";
    }
  }
  return errors;
}

function sameProfile(a: CompanyProfile, b: CompanyProfile): boolean {
  return (Object.keys(companyProfileSchema.shape) as (keyof CompanyProfile)[]).every(
    (key) => a[key] === b[key],
  );
}

export default function SettingsPage() {
  const profile = useCompanyProfile();

  // undefined: Der Speicher wurde noch nicht gelesen (Hydration).
  if (profile === undefined) return null;

  return <ProfileForm profile={profile} />;
}

function ProfileForm({ profile }: { profile: CompanyProfile }) {
  const [form, setForm] = useState<CompanyProfile>(profile);
  const [errors, setErrors] = useState<FieldErrors>({});

  const dirty = !sameProfile(form, profile);

  function update<K extends keyof CompanyProfile>(
    key: K,
    value: CompanyProfile[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function onSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error("Bitte prüfen Sie die markierten Angaben.");
      return;
    }
    saveCompanyProfile(form);
    toast.success("Unternehmensprofil gespeichert.");
  }

  function loadDemo() {
    resetCompanyProfile();
    setForm(DEMO_COMPANY_PROFILE);
    setErrors({});
    toast.success("Beispielunternehmen geladen.");
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        step="Einstellungen"
        title="Unternehmensprofil"
        desc="Stammdaten des Finanzunternehmens, das diese Anwendung einsetzt. Sie werden einmal gepflegt und anschließend in die Meldung und in die Schweregradbestimmung übernommen."
      />

      <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-4">
        <Info className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="space-y-1 text-sm">
          <p className="font-medium">Angaben bleiben in diesem Browser</p>
          <p className="text-muted-foreground">
            Das Unternehmensprofil wird ausschließlich lokal in diesem Browser
            gespeichert und nicht übertragen.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <Section
          icon={Building2}
          title="Identifikation"
          desc="Angaben, mit denen sich das Unternehmen gegenüber der Aufsicht ausweist."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Name des Unternehmens"
              htmlFor="name"
              error={errors.name}
            >
              <Input
                id="name"
                value={form.name}
                aria-invalid={Boolean(errors.name)}
                onChange={(e) => update("name", e.target.value)}
              />
            </Field>
            <Field label="Rechtsform" htmlFor="legalForm">
              <Input
                id="legalForm"
                placeholder="z. B. Aktiengesellschaft"
                value={form.legalForm}
                onChange={(e) => update("legalForm", e.target.value)}
              />
            </Field>
          </div>

          <div className="space-y-2">
            <Label htmlFor="entityType">Art des Finanzunternehmens</Label>
            <Select
              items={ENTITY_TYPE_ITEMS}
              value={form.entityType}
              onValueChange={(value) =>
                update("entityType", value as CompanyProfile["entityType"])
              }
            >
              <SelectTrigger id="entityType" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="LEI (20 Zeichen)" htmlFor="lei" error={errors.lei}>
              <Input
                id="lei"
                maxLength={20}
                placeholder="z. B. 529900MUSTERBANK0001"
                value={form.lei}
                aria-invalid={Boolean(errors.lei)}
                onChange={(e) =>
                  update("lei", e.target.value.toUpperCase().trim())
                }
              />
            </Field>
            <Field label="BaFin-ID (Unternehmensnummer)" htmlFor="bafinId">
              <Input
                id="bafinId"
                placeholder="z. B. 10123456"
                value={form.bafinId}
                onChange={(e) => update("bafinId", e.target.value)}
              />
            </Field>
          </div>
        </Section>

        <Section
          icon={Landmark}
          title="Sitz und Aufsicht"
          desc="Anschrift des Unternehmens sowie die für die Meldung zuständige Behörde."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Straße und Hausnummer" htmlFor="street">
              <Input
                id="street"
                value={form.street}
                onChange={(e) => update("street", e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
              <Field label="PLZ" htmlFor="postalCode">
                <Input
                  id="postalCode"
                  value={form.postalCode}
                  onChange={(e) => update("postalCode", e.target.value)}
                />
              </Field>
              <Field label="Ort" htmlFor="city">
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Land" htmlFor="country">
              <Input
                id="country"
                value={form.country}
                onChange={(e) => update("country", e.target.value)}
              />
            </Field>
            <Field label="Herkunftsmitgliedstaat" htmlFor="homeMemberState">
              <Input
                id="homeMemberState"
                value={form.homeMemberState}
                onChange={(e) => update("homeMemberState", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Zuständige Behörde" htmlFor="competentAuthority">
            <Input
              id="competentAuthority"
              value={form.competentAuthority}
              onChange={(e) => update("competentAuthority", e.target.value)}
            />
          </Field>
        </Section>

        <Section
          icon={UserRound}
          title="Ansprechpartner für die Aufsicht"
          desc="Kontakte für Rückfragen zu gemeldeten Vorfällen; werden in jede Meldung übernommen."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="contactName">
              <Input
                id="contactName"
                value={form.contactName}
                onChange={(e) => update("contactName", e.target.value)}
              />
            </Field>
            <Field label="Funktion" htmlFor="contactRole">
              <Input
                id="contactRole"
                placeholder="z. B. Leitung IKT-Risikomanagement"
                value={form.contactRole}
                onChange={(e) => update("contactRole", e.target.value)}
              />
            </Field>
            <Field
              label="E-Mail"
              htmlFor="contactEmail"
              error={errors.contactEmail}
            >
              <Input
                id="contactEmail"
                type="email"
                value={form.contactEmail}
                aria-invalid={Boolean(errors.contactEmail)}
                onChange={(e) => update("contactEmail", e.target.value)}
              />
            </Field>
            <Field
              label="Telefon"
              htmlFor="contactPhone"
              hint="Mit internationaler Vorwahl, z. B. +49 69 12345678."
            >
              <Input
                id="contactPhone"
                type="tel"
                value={form.contactPhone}
                onChange={(e) => update("contactPhone", e.target.value)}
              />
            </Field>
          </div>

          <div className="space-y-4 border-t border-border/60 pt-5">
            <p className="text-xs font-medium">
              Zweite Kontaktperson – zulässig ist auch ein verantwortliches
              Team mit funktionaler Adresse.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Name" htmlFor="secondContactName">
                <Input
                  id="secondContactName"
                  value={form.secondContactName}
                  onChange={(e) => update("secondContactName", e.target.value)}
                />
              </Field>
              <Field
                label="E-Mail"
                htmlFor="secondContactEmail"
                error={errors.secondContactEmail}
              >
                <Input
                  id="secondContactEmail"
                  type="email"
                  value={form.secondContactEmail}
                  aria-invalid={Boolean(errors.secondContactEmail)}
                  onChange={(e) => update("secondContactEmail", e.target.value)}
                />
              </Field>
              <Field label="Telefon" htmlFor="secondContactPhone">
                <Input
                  id="secondContactPhone"
                  type="tel"
                  value={form.secondContactPhone}
                  onChange={(e) => update("secondContactPhone", e.target.value)}
                />
              </Field>
            </div>
          </div>
        </Section>

        <Section
          icon={Network}
          title="Gruppe, Berichtswährung und Fristen"
          desc="Konzernzugehörigkeit, Währung der Meldung und die Einstufung, die über die Fristenregelung entscheidet."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Mutterunternehmen der Gruppe"
              htmlFor="groupParentName"
              hint="Nur auszufüllen, wenn das Unternehmen einer Gruppe angehört."
            >
              <Input
                id="groupParentName"
                value={form.groupParentName}
                onChange={(e) => update("groupParentName", e.target.value)}
              />
            </Field>
            <Field
              label="LEI des Mutterunternehmens"
              htmlFor="groupParentLei"
              error={errors.groupParentLei}
            >
              <Input
                id="groupParentLei"
                maxLength={20}
                value={form.groupParentLei}
                aria-invalid={Boolean(errors.groupParentLei)}
                onChange={(e) =>
                  update("groupParentLei", e.target.value.toUpperCase().trim())
                }
              />
            </Field>
            <Field
              label="Berichtswährung"
              htmlFor="reportingCurrency"
              error={errors.reportingCurrency}
              hint="ISO-4217-Code; Währung, in der monetäre Beträge gemeldet werden."
            >
              <Input
                id="reportingCurrency"
                maxLength={3}
                value={form.reportingCurrency}
                aria-invalid={Boolean(errors.reportingCurrency)}
                onChange={(e) =>
                  update("reportingCurrency", e.target.value.toUpperCase().trim())
                }
              />
            </Field>
          </div>

          <div className="space-y-2">
            <Label>Einstufung nach der Richtlinie (EU) 2022/2555</Label>
            <div className="flex flex-wrap gap-2">
              <ChoicePill
                active={form.nis2EssentialEntity}
                onClick={() => update("nis2EssentialEntity", true)}
              >
                Wesentliche oder wichtige Einrichtung
              </ChoicePill>
              <ChoicePill
                active={!form.nis2EssentialEntity}
                onClick={() => update("nis2EssentialEntity", false)}
              >
                Nicht als wesentlich oder wichtig eingestuft
              </ChoicePill>
            </div>
            <p className="text-xs text-muted-foreground">
              Für Kreditinstitute, zentrale Gegenparteien, Betreiber von
              Handelsplätzen und als wesentlich oder wichtig eingestufte
              Unternehmen verlängert ein Wochenende die Frist für Erst- und
              Zwischenmeldungen nicht.
            </p>
          </div>
        </Section>

        <Section
          icon={Gauge}
          title="Referenzwerte des Geschäftsbetriebs"
          desc="Bezugsgrößen der Materialitätsschwellen: Sie erscheinen bei der Schweregradbestimmung als Anhaltspunkt für die Einordnung der erfassten Zahlen."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Kunden insgesamt"
              htmlFor="totalClients"
              error={errors.totalClients}
              hint="Bezugsgröße für die absolute Kundenschwelle."
            >
              <Input
                id="totalClients"
                type="number"
                min={0}
                value={form.totalClients}
                aria-invalid={Boolean(errors.totalClients)}
                onChange={(e) => update("totalClients", e.target.value)}
              />
            </Field>
            <Field
              label="Mitgliedstaaten mit Geschäftstätigkeit"
              htmlFor="memberStatesOfOperation"
              error={errors.memberStatesOfOperation}
              hint="Anhaltspunkt für die geografische Ausbreitung."
            >
              <Input
                id="memberStatesOfOperation"
                type="number"
                min={0}
                value={form.memberStatesOfOperation}
                aria-invalid={Boolean(errors.memberStatesOfOperation)}
                onChange={(e) =>
                  update("memberStatesOfOperation", e.target.value)
                }
              />
            </Field>
            <Field
              label="Ø Transaktionen pro Tag (Anzahl)"
              htmlFor="dailyTransactionsCount"
              error={errors.dailyTransactionsCount}
              hint="Bezugsgröße für den Anteil der betroffenen Transaktionen."
            >
              <Input
                id="dailyTransactionsCount"
                type="number"
                min={0}
                value={form.dailyTransactionsCount}
                aria-invalid={Boolean(errors.dailyTransactionsCount)}
                onChange={(e) =>
                  update("dailyTransactionsCount", e.target.value)
                }
              />
            </Field>
            <Field
              label="Ø Transaktionswert pro Tag (EUR)"
              htmlFor="dailyTransactionsValueEur"
              error={errors.dailyTransactionsValueEur}
              hint="Bezugsgröße für den Anteil des betroffenen Transaktionswerts."
            >
              <Input
                id="dailyTransactionsValueEur"
                type="number"
                min={0}
                value={form.dailyTransactionsValueEur}
                aria-invalid={Boolean(errors.dailyTransactionsValueEur)}
                onChange={(e) =>
                  update("dailyTransactionsValueEur", e.target.value)
                }
              />
            </Field>
          </div>
          <p className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            Maßgeblich für die Klassifizierung sind die Werte des jeweils
            betroffenen Dienstes. Die hier hinterlegten Unternehmenswerte ersetzen
            diese Angaben nicht, sondern helfen bei ihrer Einordnung.
          </p>
        </Section>

        <Section
          icon={ClipboardList}
          title="Meldewesen"
          desc="Vorgaben, mit denen die Meldung vorbelegt wird."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Präfix interner Vorfallreferenzen"
              htmlFor="incidentReferencePrefix"
              hint="Vorbelegung des Referenzfelds in der Meldung, z. B. „INC-“."
            >
              <Input
                id="incidentReferencePrefix"
                value={form.incidentReferencePrefix}
                onChange={(e) =>
                  update("incidentReferencePrefix", e.target.value)
                }
              />
            </Field>
          </div>
        </Section>

        <div className="flex flex-wrap items-center justify-end gap-3 rounded-xl border border-border/60 bg-card/70 p-5 backdrop-blur">
          <p className="mr-auto text-xs text-muted-foreground">
            {dirty
              ? "Nicht gespeicherte Änderungen."
              : "Das Profil ist gespeichert."}
          </p>
          <Button type="button" variant="ghost" onClick={loadDemo}>
            <RotateCcw className="size-4" />
            Beispielunternehmen laden
          </Button>
          {dirty && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setForm(profile);
                setErrors({});
              }}
            >
              Verwerfen
            </Button>
          )}
          <Button type="submit" size="lg" disabled={!dirty}>
            <Save className="size-4" />
            Profil speichern
          </Button>
        </div>
      </form>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Bausteine
 * ------------------------------------------------------------------------- */

function Section({
  icon: Icon,
  title,
  desc,
  children,
}: {
  icon: typeof Building2;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/60 bg-card/70 backdrop-blur">
      <CardContent className="space-y-5 p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
          <div className="space-y-1">
            <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function ChoicePill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-left text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border/60 bg-background hover:border-primary/40 hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
