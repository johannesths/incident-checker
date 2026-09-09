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

### Portainer hinter Traefik

Die `docker-compose.yml` ist die Stack-Datei für Portainer. Der Container
veröffentlicht keinen Host-Port, sondern hängt im Netzwerk von Traefik, das ihn
über Port 3000 erreicht.

Unter **Stacks → Add stack** entweder

- **Repository** wählen und dieses Repository angeben – Portainer baut das
  Abbild dann selbst –, oder
- **Web editor** wählen und den Inhalt der `docker-compose.yml` einfügen.

Im Abschnitt *Environment variables* ist `APP_HOST` zu setzen: der Hostname, unter
dem die Anwendung erreichbar sein soll. Weicht die eigene Traefik-Installation
von den Vorgaben ab, kommen `TRAEFIK_NETWORK` (Vorgabe: `traefik`),
`TRAEFIK_ENTRYPOINT` (`websecure`) und `TRAEFIK_CERTRESOLVER` (`letsencrypt`)
hinzu; `TZ` steht ebenfalls zur Verfügung. Das Netzwerk muss bereits bestehen –
es ist dasselbe, in dem Traefik läuft.

Auf der Kommandozeile entspricht das:

```bash
APP_HOST=incident.example.org docker compose up -d --build
```

Router und Service heißen `ind-incident`. Compose ersetzt Variablen nur in den
Werten der Labels, nicht in ihren Schlüsseln – ein anderer Name ist deshalb in
der `docker-compose.yml` selbst zu ändern.

Der Container bringt eine Zustandsprüfung mit: Portainer zeigt ihn nach dem
Start als *healthy*, sobald die Startseite ausgeliefert wird.

Die Anwendung braucht keine weitere Anpassung für den Betrieb hinter einem
Proxy: Sie spricht ihre eigene Schnittstelle über relative Pfade an und wertet
weder Host- noch Weiterleitungs-Header aus.

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
gegen den Container:

```bash
BASE_URL=http://127.0.0.1:3000 npm run test:severity
BASE_URL=http://127.0.0.1:3000 npm run test:report
```