This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Betrieb im Container

Die Anwendung hält serverseitig keine Daten: Unternehmensprofil und
Vorfallentwürfe liegen im Browser des Anwenders. Der Container ist damit
zustandslos – er braucht kein Volume und keine Datenbank.

### Portainer

Die `docker-compose.yml` ist die Stack-Datei. Sie enthält zwei Dienste:
Traefik, das den Host-Port belegt, und die Anwendung, die Traefik über Port
3000 im gemeinsamen Netzwerk erreicht.

Unter **Stacks → Add stack** entweder

- **Repository** wählen und dieses Repository angeben – Portainer baut das
  Abbild dann selbst –, oder
- **Web editor** wählen und den Inhalt der `docker-compose.yml` einfügen.

Danach ist die Anwendung unter `http://<host>/` erreichbar – ohne Hostnamen und
ohne Zertifikat. Im Abschnitt *Environment variables* lassen sich `HTTP_PORT`
(Vorgabe: 80) und `TZ` (Vorgabe: Europe/Berlin) setzen.

Auf der Kommandozeile entspricht das:

```bash
docker compose up -d --build
```

Der Container der Anwendung bringt eine Zustandsprüfung mit: Portainer zeigt
ihn nach dem Start als *healthy*, sobald die Startseite ausgeliefert wird.

Traefik routet alles unter `/` an die Anwendung; eine Aufteilung nach Pfaden
erübrigt sich, weil Next.js die Seiten und `/api` aus demselben Prozess
ausliefert. Weitere Anpassungen braucht die Anwendung hinter einem Proxy
nicht: Sie spricht ihre eigene Schnittstelle über relative Pfade an und wertet
weder Host- noch Weiterleitungs-Header aus.

### Mehrere Stacks auf einem Host

Läuft dort bereits ein Stack nach demselben Muster, belegt dessen Traefik den
Port 80 und den Containernamen `traefik`. Dann entweder `HTTP_PORT` setzen und
den Containernamen in der `docker-compose.yml` ändern – oder die Anwendung an
den vorhandenen Traefik hängen: Dazu entfällt der Dienst `traefik`, das
Netzwerk wird auf `external: true` gestellt, und der Anwendung kommt ein Label
mit der Regel hinzu, unter der sie erreichbar sein soll, etwa

```yaml
- traefik.http.routers.ind-incident.rule=Host(`incident.example.org`)
```

### Abbild lokal ausprobieren

Ohne Traefik – etwa um das Produktionsabbild vor dem Ausrollen anzusehen –
genügen zwei Befehle; eine Compose-Datei braucht es dafür nicht:

```bash
docker build -t ind-incident .
docker run --rm -p 3000:3000 ind-incident
```

### Fertiges Abbild ausliefern

Statt in Portainer zu bauen, lässt sich das Abbild auch vorab erzeugen und in
eine Registry schieben; in der `docker-compose.yml` tritt dann `image` an die
Stelle von `build`.

```bash
docker build -t <registry>/ind-incident:<tag> .
docker push <registry>/ind-incident:<tag>
```

### Prüfungen gegen den Container

Beide Prüfskripte sprechen eine laufende Instanz an und funktionieren auch
gegen den Container – auch durch Traefik hindurch:

```bash
BASE_URL=http://127.0.0.1 npm run test:severity
BASE_URL=http://127.0.0.1 npm run test:report
```
