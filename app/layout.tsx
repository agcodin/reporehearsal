import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geist = Geist({ variable: "--font-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "RepoRehearsal", template: "%s · RepoRehearsal" },
  description: "Break it safely. Debug it seriously. Practice production incident response in an isolated repository sandbox.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${mono.variable}`}>
        <header className="site-header">
          <Link className="brand" href="/" aria-label="RepoRehearsal home"><span className="brand-mark">RR</span><span>RepoRehearsal</span></Link>
          <nav aria-label="Primary navigation">
            <Link href="/dashboard">Dashboard</Link><Link href="/repositories">Repositories</Link><Link href="/about">About</Link>
          </nav>
          <Link className="button button-dark button-small" href="/rehearsals/new">Start rehearsal <span aria-hidden>↗</span></Link>
        </header>
        {children}
        <footer><div className="brand"><span className="brand-mark">RR</span><span>RepoRehearsal</span></div><p>Original repositories are never modified.</p><div><Link href="/privacy">Privacy</Link> · <Link href="/about">How it works</Link></div></footer>
      </body>
    </html>
  );
}
