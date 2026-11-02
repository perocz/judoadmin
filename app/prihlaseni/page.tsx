import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import AuthForm from "@/components/AuthForm";
import { login } from "@/lib/auth-actions";

export const metadata: Metadata = { title: "Přihlášení" };

const STAV: Record<string, { text: string; error?: boolean }> = {
  aktivovano: { text: "Hotovo, e-mail je ověřený a nové heslo platí. Přihlas se." },
  obnoveno: { text: "Nové heslo je nastavené. Přihlas se." },
  odkaz: { text: "Odkaz z e-mailu už neplatí nebo byl použit. Požádej o nový.", error: true },
};

export default function LoginPage({ searchParams }: PageProps<"/prihlaseni">) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Přihlášení</h1>
      <p className="mt-1 mb-6 text-muted">Uživatelské jméno má tvar jmeno.prijmeni, bez diakritiky.</p>
      <Suspense fallback={null}>
        <Notice searchParams={searchParams} />
      </Suspense>
      <AuthForm
        action={login}
        submit="Přihlásit"
        fields={[
          { name: "username", label: "Uživatelské jméno", type: "text", autoComplete: "username" },
          { name: "password", label: "Heslo", type: "password", autoComplete: "current-password" },
        ]}
      />
      <p className="mt-6 max-w-prose text-sm">
        <Link href="/zapomenute-heslo">Zapomenuté heslo</Link>
      </p>
    </div>
  );
}

async function Notice({ searchParams }: { searchParams: PageProps<"/prihlaseni">["searchParams"] }) {
  const s = STAV[String((await searchParams).stav ?? "")];
  if (!s) return null;
  return (
    <p role={s.error ? "alert" : "status"} className={`mb-4 max-w-sm text-sm ${s.error ? "text-accent" : ""}`}>
      {s.text}
    </p>
  );
}
