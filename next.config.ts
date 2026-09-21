import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Bündelt die Anwendung samt der tatsächlich benötigten Abhängigkeiten in
   * .next/standalone. Das Container-Abbild kommt damit ohne node_modules und
   * ohne die Next.js-CLI aus – es startet nur noch server.js.
   */
  output: "standalone",

  /**
   * Die Anwendung verwendet next/image nicht. Ohne diese Einstellung wäre der
   * Bildoptimierer unter /_next/image trotzdem erreichbar – ein Endpunkt, der
   * Bilddateien entgegennimmt und verarbeitet und wiederholt Gegenstand von
   * Sicherheitshinweisen war. So beantwortet der Server ihn mit 404.
   */
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
