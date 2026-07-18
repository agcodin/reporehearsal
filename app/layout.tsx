import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import AuthNavigation from "./components/AuthNavigation";
import MobileNavigation from "./components/MobileNavigation";
import PlanProvider from "./components/PlanProvider";
import "./globals.css";
import "./spec.css";

const mono = IBM_Plex_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "RepoRehearsal", template: "%s · RepoRehearsal" },
  description: "Break it safely. Debug it seriously. Practice production incident response in an isolated repository sandbox.",
  icons: { icon: "/favicon.svg" },
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={mono.variable}>
        <PlanProvider>
        <header className="site-header">
          <Link className="brand" href="/" aria-label="RepoRehearsal home"><span className="brand-mark">RR</span><span>RepoRehearsal</span></Link>
          <nav className="desktop-navigation" aria-label="Primary navigation">
            <Link href="/daily">Challenge</Link><Link href="/dashboard">Dashboard</Link><Link href="/repositories">Repositories</Link><Link href="/pricing">Pricing</Link><Link href="/about">About</Link>
          </nav>
          <MobileNavigation />
          <div className="header-actions"><Suspense fallback={<span className="auth-loading" aria-hidden />}><AuthNavigation /></Suspense><Link className="button button-dark nav-start" href="/rehearsals/new">Start free</Link></div>
        </header>
        {children}
        <footer><div className="footer-top"><div className="footer-brand"><div className="brand"><span className="brand-mark">RR</span><span>RepoRehearsal</span></div><p>Practice production incidents without risking production.</p></div><nav className="footer-nav" aria-label="Footer navigation"><div><b>PRODUCT</b><Link href="/daily">Daily challenge</Link><Link href="/rehearsals/new">Practice</Link><Link href="/repositories">Repositories</Link><Link href="/pricing">Pricing</Link></div><div><b>COMPANY</b><Link href="/about">About</Link><Link href="/privacy">Privacy</Link><Link href="/privacy">Security</Link><Link href="/">Status</Link></div><div><b>GET STARTED</b><Link href="/signin">Sign in</Link><Link href="/rehearsals/new">Start free</Link><Link href="/team">Book a demo</Link></div></nav></div><div className="footer-bottom"><p>Original repositories are never modified.</p><p>© 2026 RepoRehearsal</p></div></footer>
        </PlanProvider>
      </body>
    </html>
  );
}
