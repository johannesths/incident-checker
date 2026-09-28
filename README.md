# Threatly

Entscheidungsunterstützung für Finanzunternehmen bei IKT-bezogenen Vorfällen
nach DORA: vom ersten Verdacht über die Einstufung als schwerwiegend bis zur
Meldung an die zuständige Behörde.

Die Anwendung führt in drei Schritten durch die Verordnung. Jeder Schritt
übernimmt das Ergebnis des vorherigen, sodass am Ende eine Meldung entsteht,
deren Inhalt der Delegierten Verordnung (EU) 2025/301 entspricht – ohne dass
Angaben doppelt erfasst werden müssen.

> Die Anwendung unterstützt die Entscheidung, sie ersetzt sie nicht. Die
> hinterlegten Schwellenwerte sind vor dem Produktiveinsatz gegen den
> aktuellen Verordnungstext zu verifizieren, und eine Meldeschnittstelle der
> BaFin ist nicht angebunden – die Übermittlung wird lokal quittiert.

## Funktionen

### Schritt 01 – Triage

Handelt es sich überhaupt um einen IKT-bezogenen Vorfall, oder um ein
gewöhnliches Support-Anliegen? Erfasst werden Beschreibung, betroffenes
System, Melder und Symptome. Das Ergebnis ist eine Einschätzung mit
Empfehlung, Begründung und Konfidenz: Vorfall, kein Vorfall (ServiceDesk)
oder unklar.

- **Bewertung durch Claude**, sobald ein API-Schlüssel hinterlegt ist
  (Einstellungen; Modell wählbar, Standard Sonnet). Das Modell bekommt den
  Maßstab des Art. 3 Nr. 8 DORA als Anweisung und die Meldung als Daten und
  antwortet in einem festen Schema – ein Urteil aus drei Werten, eine
  dreistufige Sicherheit, Begründung, Empfehlung. Bei unklarer Einordnung
  nennt es Rückfragen an den Melder.
- **Ohne Schlüssel** bleibt das regelbasierte Verfahren nach Stichworten.
  Die Ergebnisseite nennt in beiden Fällen die Herkunft der Einschätzung.
- **Gegen eingeschleuste Anweisungen:** Der Aufruf hat weder Werkzeuge noch
  Verlauf; seine gesamte Ausgabe ist das Schema. Anweisungen im
  Meldungstext – etwa in einer zitierten Phishing-Mail – befolgt das Modell
  nicht, sondern meldet sie; die Ergebnisseite zeigt den Hinweis. Die
  Entscheidung bleibt beim Menschen; nichts wird automatisch weitergeleitet.

### Schritt 02 – Schweregrad

Einstufung eines bestätigten Vorfalls als schwerwiegend nach den
Klassifizierungskriterien der Delegierten Verordnung (EU) 2024/1772.

- **Vorfragen zur Kritikalität der betroffenen Dienste** (Art. 6): Sind
  kritische oder wichtige Funktionen betroffen, regulierte
  Finanzdienstleistungen, oder liegt ein erfolgreicher böswilliger Zugriff
  vor? Ohne erfüllten Tatbestand kann kein schwerwiegender Vorfall vorliegen
  (Art. 8 Abs. 1) – das Formular sagt das sofort, statt erst am Ende.
- **Böswilliger Zugriff mit möglichem Datenverlust** führt unmittelbar zur
  Einstufung als schwerwiegend (Art. 8 Abs. 1 Buchst. a); die übrigen
  Kriterien entfallen dann.
- **Die übrigen sechs Kriterien als einzelne Schritte**, jeder ausfüllbar
  oder als nicht zutreffend abzuhaken: betroffene Kunden, Gegenparteien und
  Transaktionen · Dauer und Ausfallzeit · geografische Ausbreitung ·
  Datenverluste · Reputationsauswirkung · wirtschaftliche Auswirkung. Die
  Materialitätsschwellen (Art. 9) sind als auditierbare Regelbasis in
  `src/lib/dora/criteria.ts` hinterlegt, nicht in der Bewertungslogik
  versteckt.
- **Referenzwerte aus dem Unternehmensprofil** – Kundenzahl, tägliche
  Transaktionen, Mitgliedstaaten – erscheinen als Einordnungshilfe neben den
  Eingaben.
- **Plausibilitätshinweise** während der Eingabe, etwa wenn die Ausfallzeit
  die Gesamtdauer übersteigt.
- **Ergebnisseite** mit Gesamteinstufung, Befund je Kriterium, Begründung und
  der daraus folgenden Meldepflicht samt Frist für die Erstmeldung.
- **Zusammenfassung als PDF:** Einstufung, Meldepflicht, Befund je Kriterium
  und die erfassten Angaben, zum Ablegen oder Weitergeben.

### Schritt 03 – Meldung

Die Meldung nach Art. 19 DORA, inhaltlich nach der Delegierten Verordnung
(EU) 2025/301.

- **Zwei Meldungen** stehen zur Wahl: die Meldung eines schwerwiegenden
  Vorfalls (Art. 19 Abs. 1) als Erst-, Zwischen- oder Abschlussmeldung, und
  die freiwillige Meldung einer erheblichen Cyberbedrohung (Art. 19 Abs. 2)
  mit ihrem eigenen, kürzeren Inhalt (Art. 6 der Verordnung).
- **Nur die Angaben, die die jeweilige Meldung verlangt.** Art. 1 gilt für
  alle drei Meldungen; Art. 2, 3 und 4 nennen die spezifischen Angaben genau
  einer von ihnen. Eine Erstmeldung hat daher acht Abschnitte, eine
  Zwischenmeldung zehn, eine Abschlussmeldung acht – keine wiederholt den
  Inhalt der vorherigen.
- **Vorbelegung aus Schritt 02:** die Einstufungskriterien, die zur Meldung
  geführt haben, sowie betroffene Kunden, Dauer, Ausfallzeit, Datenverluste,
  Reputationsbedingungen und Kosten finden sich an ihrer Stelle in der
  Meldung wieder.
- **Vorbelegung aus dem Unternehmensprofil:** Name, LEI, Art des
  Finanzunternehmens, Ansprechpartner, Mutterunternehmen, Berichtswährung.
  Die Felder bleiben änderbar; unveränderte folgen dem Profil, wenn es sich
  später ändert.
- **Fristen nach Art. 5:** Die Fälligkeit der Erstmeldung wird aus Erkennung
  und Einstufung berechnet – vier Stunden nach der Einstufung, spätestens 24
  Stunden nach der Kenntnisnahme, oder vier Stunden nach der Einstufung, wenn
  diese erst später erfolgte (Abs. 2). Ist die Frist verstrichen, verlangt
  das Formular die Gründe (Abs. 3). Fällt eine Folgefrist auf ein Wochenende,
  verschiebt sie sich auf 12.00 Uhr des nächsten Arbeitstags – außer für
  Kreditinstitute, zentrale Gegenparteien, Handelsplätze und nach NIS-2 als
  wesentlich oder wichtig eingestufte Unternehmen (Abs. 4 und 5).
- **Strukturierte Angaben** statt Freitext, wo die Verordnung eine Auswahl
  nahelegt: Art der Erkennung, Ursprung des Vorfalls, betroffene
  EWR-Mitgliedstaaten, Art des Vorfalls, Techniken des Angreifers,
  Funktionsbereiche, benachrichtigte Behörden und die dreistufige Einstufung
  der Ursachen (übergeordnet, detailliert, weitergehend). Die Wertelisten
  stammen aus dem Datenglossar der Durchführungsverordnung (EU) 2025/302.
- **Widerspruchsprüfung** vor dem Absenden: Zeitpunkte in unmöglicher
  Reihenfolge, Einstufungskriterien ohne die Angaben, die sie belegen, eine
  Auswahl „Sonstiges“ ohne Angabe welche, Detailursachen ohne ihre Kategorie.
  Widersprüche verhindern die Übermittlung, Hinweise nicht. Dieselbe Prüfung
  läuft in der API, nicht nur im Browser.
- **LEI-Prüfung** nach ISO 17442 einschließlich der Prüfziffern (MOD 97-10),
  mit der Angabe, was genau nicht stimmt.
- **Quittung** mit Referenzcode, Zeitpunkt und den danach laufenden Fristen
  für die nächste Meldung.
- **Meldung als PDF:** Quittung, Fristen und der übermittelte Inhalt in der
  Reihenfolge der Artikel, die die jeweilige Meldung verlangt.

### Unternehmensprofil

Die Stammdaten des Finanzunternehmens werden einmal unter *Einstellungen*
gepflegt: Identifikation (Name, Rechtsform, Art nach Art. 2 Abs. 1 DORA, LEI,
BaFin-ID), Sitz und zuständige Behörde, Ansprechpartner, Mutterunternehmen,
Berichtswährung, die NIS-2-Einstufung, die über die Fristenregelung
entscheidet, sowie die Referenzwerte für die Materialitätsschwellen. Ein
Beispielunternehmen ist vorbelegt.

### Zugangsschlüssel

Ebenfalls unter *Einstellungen*: der Schlüssel für die Claude-API, mit dem
die KI-gestützte Bewertung laufen wird, samt dem Datum, bis zu dem er gilt –
danach verwendet die Anwendung ihn nicht mehr und weist darauf hin –, sowie
der Schlüssel des Unternehmens für den angebundenen Managed Service. Beide
sind Geheimnisse, keine Stammdaten: Sie bleiben vom Profil getrennt, das
Beispielunternehmen lässt sie unberührt, und sie gelangen in keine Meldung
und keine PDF-Zusammenfassung.

> Vorläufig: Die Schlüssel werden je Browser eingegeben und liegen dort im
> Klartext im `localStorage` – jeder Nutzer trägt sie auf jedem Gerät selbst
> ein. Für einen gemeinsamen Unternehmensschlüssel ist das nicht der
> Zielzustand; der wandert später auf den Server (Umgebungsvariablen des
> Containers), und die Einstellungen zeigen dann nur noch den Status.

### Beispielszenarien

Triage und Schweregrad bieten Szenarien zum Vorführen, die unterschiedliche
Ergebnisse liefern – vom Ransomware-Verdacht bis zum vergessenen Passwort,
vom schweren Ausfall bis zur kleineren Störung.

### Datenhaltung

Die Anwendung hält serverseitig keine Daten. Das Unternehmensprofil liegt im
`localStorage` des Browsers, Entwürfe und Ergebnisse eines Vorgangs im
`sessionStorage` – sie enden mit dem Tab. Der Server ist zustandslos; es gibt
keine Datenbank und kein Volume. Auch die PDF-Zusammenfassungen entstehen im
Browser; ihre Daten verlassen ihn nicht. Die Zugangsschlüssel liegen ebenfalls
im `localStorage`; der Server erhält den API-Schlüssel nur für die Dauer einer
Anfrage und speichert ihn nicht.

## Rechtsgrundlagen

| Instrument | Rolle in der Anwendung |
| --- | --- |
| VO (EU) 2022/2554 (DORA), Art. 18–19 | Klassifizierungs- und Meldepflicht |
| Delegierte VO (EU) 2024/1772 | Klassifizierungskriterien und Materialitätsschwellen (Schritt 02) |
| Delegierte VO (EU) 2025/301 | Inhalt der Erst-, Zwischen- und Abschlussmeldung, Fristen, Inhalt der freiwilligen Meldung (Schritt 03) |
| Durchführungsverordnung (EU) 2025/302 | Wertelisten der Auswahlfelder aus dem Datenglossar der Meldevorlage |

Die Verordnungen sind im Code Feld für Feld zitiert; die Oberfläche selbst
zeigt keine Fundstellen.

## Technik

| | |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router, Turbopack), React 19, TypeScript 5 |
| Oberfläche | Tailwind CSS 4, [shadcn/ui](https://ui.shadcn.com) auf [Base UI](https://base-ui.com), Lucide-Icons, Sonner für Hinweise |
| Validierung | [Zod 4](https://zod.dev) – ein Schema je Meldung, von Formular und API gemeinsam genutzt |
| Bewertung | Austauschbare Dienste hinter `src/lib/ai` (Triage, Schweregrad) und `src/lib/bafin` (Meldung): Triage durch Claude ([`@anthropic-ai/sdk`](https://github.com/anthropics/anthropic-sdk-typescript), strukturierte Ausgabe, adaptives Denken, Aufwand „medium“), sonst deterministische Regelwerke bzw. eine Simulation der Übermittlung |
| Zustand | `useSyncExternalStore` über `localStorage` und `sessionStorage`; kein globaler Store |
| PDF | [`@react-pdf/renderer`](https://react-pdf.org), im Browser und erst beim Klick geladen |
| Auslieferung | Docker, Next.js-Standalone-Ausgabe, Portainer-Stack hinter Traefik |

Die Triage bewertet Claude, sobald ein Schlüssel vorliegt – aus dem Browser
des Nutzers (Kopfzeile je Anfrage, siehe *Zugangsschlüssel*) oder aus
`ANTHROPIC_API_KEY` in der Umgebung des Servers; `ANTHROPIC_MODEL` setzt das
Standardmodell. Der Server baut den Client je Anfrage und behält den
Schlüssel nicht. Die Schweregradbewertung läuft noch als regelbasierter
Mock-Dienst; die Schnittstelle in `src/lib/ai/types.ts` ist so geschnitten,
dass die KI-gestützte Bewertung eingehängt wird, ohne Oberfläche oder API zu
ändern – sie bewertet dann anhand der hinterlegten Kriterien, nicht mit
eigenen Schwellenwerten. Für die Meldung gilt dasselbe:
`src/lib/bafin/index.ts` ist die Stelle, an der ein echter Konnektor die
Simulation ersetzt.

## Projektstruktur

```
src/
  app/
    triage/               Schritt 01 mit Ergebnisseite
    severity/             Schritt 02 mit Ergebnisseite
    meldung/              Schritt 03 mit Quittung
    einstellungen/        Unternehmensprofil
    api/                  triage, severity, report
  lib/
    dora/
      criteria.ts         Klassifizierungskriterien und Schwellen (2024/1772)
      reporting.ts        Meldearten, Fristen, Meldepflicht (2025/301 Art. 5)
      report-fields.ts    Wertelisten der Meldung (2025/302, Anhang II)
      report-checks.ts    Widerspruchsprüfung der Meldung
    schemas.ts            Zod-Schemata aller drei Schritte
    lei.ts                LEI-Prüfung nach ISO 17442
    company/              Unternehmensprofil und dessen Speicher
    credentials/          Zugangsschlüssel (Claude-API, Managed Service) und deren Speicher
    pdf/                  PDF-Zusammenfassungen von Einstufung und Meldung
    ai/
      claude/             Triage durch Claude: Client, Systemanweisung, Fehler
      models.ts           Wählbare Modelle und Kopfzeilen
      request.ts          Schlüssel und Modell einer Anfrage
      mock.ts             Regelbasierte Triage und Schweregradbestimmung
    bafin/                Meldedienst (Simulation)
scripts/
  test-triage.mjs         Prüft die Triage gegen Fälle mit bekannter Einordnung
  test-severity.mjs       Prüft die Klassifizierung gegen die Schwellen
  test-report.mjs         Prüft die Meldung gegen 2025/301
```

## Entwicklung

```bash
npm install
npm run dev          # http://localhost:3000
```

Drei Prüfskripte sprechen die laufende Anwendung über ihre API an und decken
damit Schema, Route und Bewertungslogik gemeinsam ab:

```bash
npm run test:triage     # 14 Fälle zur Einordnung, darunter eingeschleuste Anweisungen
npm run test:severity   # 21 Fälle zu Schwellen und Gesamteinstufung
npm run test:report     # 43 Fälle zu Inhalt, Fristen und Widersprüchen
```

`test:triage` prüft ohne Schlüssel das regelbasierte Verfahren; mit
`ANTHROPIC_API_KEY=sk-ant-…` (und wahlweise `ANTHROPIC_MODEL`) geht der Lauf
durch Claude und kostet je Fall einen Bruchteil eines Cents bis wenige Cent.

Beide nehmen `BASE_URL`, um eine andere Instanz zu prüfen – etwa den
Container.

```bash
npm run lint
npm run build
```

Der Build erzeugt neben dem regulären Produktionsstand, den `npm start`
lokal ausliefert, auch die Standalone-Ausgabe unter `.next/standalone`, aus
der das Container-Abbild entsteht. Wer das Abbild selbst ausprobieren will,
findet die Befehle unter *Betrieb im Container*.

## Betrieb im Container

Die `docker-compose.yml` ist der Stack für Portainer. Der Container hängt im
bestehenden Traefik-Netzwerk `traefik` und veröffentlicht selbst keinen Port;
Traefik erreicht ihn über Port 3000.

Unter **Stacks → Add stack** entweder das Repository angeben – Portainer baut
das Abbild dann selbst – oder den Inhalt der `docker-compose.yml` in den
Web-Editor einfügen. Einstellbar sind:

| Variable | Bedeutung |
| --- | --- |
| `APP_DOMAIN` | Hostname, unter dem die Anwendung erreichbar ist (Vorgabe in der Datei) |
| `TZ` | Zeitzone im Container (Vorgabe: `Europe/Berlin`) |

Traefik leitet HTTP dauerhaft auf HTTPS um; der HTTPS-Router nutzt TLS und
die Middleware `tinyauth@docker`, die der Anwendung eine Anmeldung
vorschaltet. Beide – das Netzwerk und die Middleware – müssen in der
Traefik-Installation bereits vorhanden sein.

Das Abbild entsteht in drei Stufen und enthält am Ende nur die
Standalone-Ausgabe von Next.js; es läuft unter einem Konto ohne besondere
Rechte und bringt eine Zustandsprüfung mit, sodass Portainer den Container
als *healthy* ausweist, sobald die Startseite ausgeliefert wird. Statische
Dateien unter `public/` sind derzeit nicht Teil des Abbilds.

Die Anwendung braucht hinter dem Proxy keine weitere Anpassung: Sie spricht
ihre eigene Schnittstelle über relative Pfade an und wertet weder Host- noch
Weiterleitungs-Header aus.

Ohne Traefik – etwa um das Produktionsabbild vor dem Ausrollen anzusehen –
genügen zwei Befehle:

```bash
docker build -t ind-incident .
docker run --rm -p 3000:3000 ind-incident
```
