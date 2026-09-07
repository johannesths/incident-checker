import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Bündelt die Anwendung samt der tatsächlich benötigten Abhängigkeiten in
   * .next/standalone. Das Container-Abbild kommt damit ohne node_modules und
   * ohne die Next.js-CLI aus – es startet nur noch server.js.
   */
  output: "standalone",
};

export default nextConfig;
