import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import AuthNavigation from "./components/AuthNavigation";
import PlanNavigation from "./components/PlanNavigation";
import PlanProvider from "./components/PlanProvider";
import "./globals.css";

const geist = Geist({ variable: "--font-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "RepoRehearsal", template: "%s · RepoRehearsal" },
  description: "Break it safely. Debug it seriously. Practice production incident response in an isolated repository sandbox.",
  icons: { icon: "/favicon.svg" },
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${mono.variable}`}>
        <PlanProvider>
        <header className="site-header">
          <Link className="brand" href="/" aria-label="RepoRehearsal home"><span className="brand-mark">RR</span><span>RepoRehearsal</span></Link>
          <nav aria-label="Primary navigation">
            <Link href="/dashboard">Dashboard</Link><Link href="/repositories">Repositories</Link><Link href="/pricing">Pricing</Link><Link href="/about">About</Link>
          </nav>
          <div className="header-actions"><PlanNavigation /><Suspense fallback={<span className="auth-loading" aria-hidden />}><AuthNavigation /></Suspense></div>
        </header>
        {children}
        <footer><div className="footer-brand"><div className="brand"><span className="brand-mark">RR</span><span>RepoRehearsal</span></div><p>Practice production incidents without risking production.</p></div><nav className="footer-nav" aria-label="Footer navigation"><Link href="/rehearsals/new">Practice</Link><Link href="/repositories">Repositories</Link><Link href="/pricing">Pricing</Link><Link href="/privacy">Privacy</Link><Link href="/about">About</Link></nav><p className="footer-note">Original repositories are never modified.</p></footer>
        </PlanProvider>
      </body>
    </html>
  );
}
