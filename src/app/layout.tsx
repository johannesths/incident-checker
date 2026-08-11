import type { Metadata } from "next";
import "./globals.css";

import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "IndIncident",
  description:
    "Triage und DORA-Schweregradbestimmung für mögliche IKT-bezogene Vorfälle.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="relative min-h-full flex flex-col bg-background text-foreground">
        {/* Dekorativer Hintergrund */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute inset-0 bg-primary/5 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] [background-size:32px_32px] opacity-40" />
        </div>

        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
          {children}
        </main>
        <footer className="border-t border-border/60 py-6">
          <div className="mx-auto max-w-6xl px-6 text-xs text-muted-foreground">
            Klassifizierung IKT-bezogener Vorfälle nach DORA (VO (EU)
            2022/2554) und Delegierter VO (EU) 2024/1772.
          </div>
        </footer>
        <Toaster />
      </body>
    </html>
  );
}
