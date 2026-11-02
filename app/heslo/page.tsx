import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { activate, changePassword } from "@/lib/auth-actions";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Změna hesla" };

export default function PasswordPage() {
  return (
    <Suspense fallback={<p className="text-muted">Načítám…</p>}>
      <PasswordForm />
    </Suspense>
  );
}

async function PasswordForm() {
  const session = await getSession();
  if (!session) redirect("/prihlaseni");

  // Bez ověřeného e-mailu: e-mail a nové heslo, heslo se aktivuje po kliknutí na odkaz v e-mailu.
  if (!session.hasContactEmail) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">{session.mustChangePassword ? "První přihlášení" : "E-mail a nové heslo"}</h1>
        <p className="mt-1 mb-6 max-w-prose text-muted">
          Zadej svůj e-mail a nové heslo. Pošleme ti odkaz; po kliknutí na něj se heslo aktivuje a e-mail pak slouží k obnovení zapomenutého hesla. Heslo má mít aspoň 8 znaků, ne jen číslice.
        </p>
        <AuthForm
          action={activate}
          submit="Poslat odkaz"
          fields={[
            { name: "email", label: "E-mail", type: "email", autoComplete: "email" },
            { name: "password", label: "Nové heslo", type: "password", autoComplete: "new-password" },
            { name: "again", label: "Nové heslo znovu", type: "password", autoComplete: "new-password" },
          ]}
        />
      </div>
    );
  }
  return (
    <div>
      <h1 className="text-2xl font-semibold">Změna hesla</h1>
      <p className="mt-1 mb-6 text-muted">
        {session.mustChangePassword ? "Dočasné heslo je potřeba před dalším použitím změnit." : "Zadej nové heslo."} Aspoň 8 znaků, ne jen číslice.
      </p>
      <AuthForm
        action={changePassword}
        submit="Uložit nové heslo"
        fields={[
          { name: "password", label: "Nové heslo", type: "password", autoComplete: "new-password" },
          { name: "again", label: "Nové heslo znovu", type: "password", autoComplete: "new-password" },
        ]}
      />
    </div>
  );
}
