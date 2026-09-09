# Abbild der Anwendung in drei Stufen: Abhängigkeiten, Build, Laufzeit.
# Nur die letzte Stufe landet im ausgelieferten Abbild.

# --- Abhängigkeiten ----------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app

# Erst die Manifeste kopieren: Solange sie sich nicht ändern, greift der
# Layer-Cache und die Installation entfällt beim erneuten Bauen.
COPY package.json package-lock.json ./
RUN npm ci

# --- Build -------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# --- Laufzeit ----------------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Die Anwendung läuft unter einem eigenen Konto ohne besondere Rechte.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs

# Die Standalone-Ausgabe enthält server.js und die benötigten Module; die
# statischen Dateien liegen daneben und werden an ihre erwartete Stelle kopiert.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# Portainer zeigt den Zustand des Containers an, sobald eine Prüfung hinterlegt
# ist. Geprüft wird die Startseite – sie rendert ohne weitere Dienste.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node", "server.js"]
