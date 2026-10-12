import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkillPulse – Market Signal Intelligence",
  description:
    "SkillPulse converts live job-market signals into actionable career intelligence: skill demand scores, market momentum, co-occurrence, role analytics, skill-gap analysis and AI learning roadmaps.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-ink-950 text-mist-50 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
