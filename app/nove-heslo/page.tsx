import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { setNewPassword } from "@/lib/auth-actions";
import { serverClient } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Nové heslo" };

export default function NewPasswordPage() {
  return (
    <Suspense fallback={<p className="text-muted">Načítám…</p>}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  await connection();
  const sb = await serverClient();
  const { data } = await sb.auth.getClaims();
  if (!data?.claims?.sub) redirect("/prihlaseni?stav=odkaz");
  const { data: names } = await sb.rpc("my_accounts");
  const accounts = (names ?? []) as string[];

  if (accounts.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Nové heslo</h1>
        <p className="mt-2 max-w-prose text-muted">K tomuto e-mailu zatím není ověřený žádný účet. Požádej trenéra nebo správce o obnovení hesla.</p>
        <p className="mt-4 text-sm">
          <Link href="/prihlaseni">Zpět na přihlášení</Link>
        </p>
      </div>
    );
  }
  return (
    <div>
      <h1 className="text-2xl font-semibold">Nové heslo</h1>
      <p className="mt-1 mb-6 max-w-prose text-muted">
        E-mail je ověřený. {accounts.length > 1 ? `Vyber účet, kterému nastavíš heslo: ${accounts.join(", ")}.` : ""} Heslo má mít aspoň 8 znaků, ne jen číslice.
      </p>
      <AuthForm
        action={setNewPassword}
        submit="Nastavit heslo"
        fields={[
          { name: "username", label: "Uživatelské jméno", type: "text", autoComplete: "username", defaultValue: accounts[0] },
          { name: "password", label: "Nové heslo", type: "password", autoComplete: "new-password" },
          { name: "again", label: "Nové heslo znovu", type: "password", autoComplete: "new-password" },
        ]}
      />
    </div>
  );
}
