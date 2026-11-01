import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { changePassword } from "@/lib/auth-actions";
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
  return (
    <div>
      <h1 className="text-2xl font-semibold">Změna hesla</h1>
      <p className="mt-1 mb-6 text-muted">
        {session.mustChangePassword
          ? "Počáteční heslo je potřeba před dalším použitím změnit."
          : "Zadej nové heslo."}{" "}
        Aspoň 8 znaků, ne jen číslice.
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
