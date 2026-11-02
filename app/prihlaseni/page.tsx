import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import { login } from "@/lib/auth-actions";

export const metadata: Metadata = { title: "Přihlášení" };

export default function LoginPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Přihlášení</h1>
      <p className="mt-1 mb-6 text-muted">Uživatelské jméno má tvar jmeno.prijmeni, bez diakritiky.</p>
      <AuthForm
        action={login}
        submit="Přihlásit"
        fields={[
          { name: "username", label: "Uživatelské jméno", type: "text", autoComplete: "username" },
          { name: "password", label: "Heslo", type: "password", autoComplete: "current-password" },
        ]}
      />
      <p className="mt-6 max-w-prose text-sm text-muted">
        Zapomenuté heslo: požádej trenéra své základny nebo správce, aby ti heslo obnovil. Dostaneš dočasné heslo a při přihlášení si nastavíš nové.
      </p>
    </div>
  );
}
