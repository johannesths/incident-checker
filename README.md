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
zustandslos – er braucht kein Volume, keine Datenbank und keine
Umgebungsvariablen.

```bash
docker compose up -d --build
```

Danach läuft die Anwendung auf http://localhost:3000. Ein anderer Host-Port
lässt sich über `HOST_PORT` setzen:

```bash
HOST_PORT=8080 docker compose up -d --build
```

### Portainer

Unter **Stacks → Add stack** entweder

- **Repository** wählen und dieses Repository samt `docker-compose.yml`
  angeben – Portainer baut das Abbild dann selbst –, oder
- **Web editor** wählen und den Inhalt der `docker-compose.yml` einfügen.

Im Abschnitt *Environment variables* sind `HOST_PORT` und `TZ` einstellbar.
Läuft die Anwendung hinter einem Reverse Proxy, kann die
Portfreigabe in der `docker-compose.yml` entfallen; der Proxy erreicht den
Container dann über Port 3000 im gemeinsamen Netzwerk.

Der Container bringt eine Zustandsprüfung mit: Portainer zeigt ihn nach dem
Start als *healthy*, sobald die Startseite ausgeliefert wird.

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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
