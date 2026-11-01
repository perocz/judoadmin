import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import Link from "next/link";
import "./globals.css";
import { isDemo } from "@/lib/data";
import UserMenu from "@/components/UserMenu";
import RoleBar from "@/components/RoleBar";

export const metadata: Metadata = {
  title: { default: "Judo Beskydy – správa klubu", template: "%s · Judo Beskydy" },
  description: "Správa klubu Judo Beskydy z.s.: členové, akce, přihlášky, výsledky a bodování.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f0e" },
  ],
};

const nav = [
  { href: "/", label: "Přehled" },
  { href: "/akce", label: "Akce" },
  { href: "/treninky", label: "Tréninky" },
  { href: "/zebricek", label: "Žebříček" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="cs">
      <body className="flex min-h-dvh flex-col">
        {isDemo && (
          <div className="border-b border-line bg-bg px-4 py-1.5 text-center text-xs text-muted">
            Demo data. Jména jsou smyšlená, nejde o skutečné členy klubu.
          </div>
        )}
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-baseline sm:justify-between">
            <Link href="/" className="no-underline">
              <span className="text-lg font-semibold tracking-[0.18em] uppercase">Judo Beskydy</span>
              <span className="ml-3 text-sm text-muted">správa klubu</span>
            </Link>
            <nav aria-label="Hlavní navigace">
              <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[0.9375rem]">
                {nav.map((n) => (
                  <li key={n.href}>
                    <Link href={n.href} className="no-underline hover:underline">
                      {n.label}
                    </Link>
                  </li>
                ))}
                {isDemo ? (
                  <li>
                    <Link href="/clenove" className="no-underline hover:underline">
                      Členové
                    </Link>
                  </li>
                ) : (
                  <Suspense fallback={null}>
                    <UserMenu />
                  </Suspense>
                )}
              </ul>
            </nav>
          </div>
        </header>
        {!isDemo && (
          <Suspense fallback={null}>
            <RoleBar />
          </Suspense>
        )}
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto max-w-4xl px-4 py-5 text-xs text-muted">
            JUDO BESKYDY z.s. · Frýdek-Místek, Dobrá, Raškovice, Frýdlant nad Ostravicí a další základny
          </div>
        </footer>
      </body>
    </html>
  );
}
