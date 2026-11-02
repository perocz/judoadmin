import type { Metadata } from "next";
import Link from "next/link";
import AuthForm from "@/components/AuthForm";
import { requestReset } from "@/lib/auth-actions";

export const metadata: Metadata = { title: "Zapomenuté heslo" };

export default function ForgottenPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Zapomenuté heslo</h1>
      <p className="mt-1 mb-6 max-w-prose text-muted">
        Zadej e-mail, který sis nastavil při prvním přihlášení. Pošleme na něj odkaz pro nastavení nového hesla.
      </p>
      <AuthForm action={requestReset} submit="Poslat odkaz" fields={[{ name: "email", label: "E-mail", type: "email", autoComplete: "email" }]} />
      <p className="mt-6 max-w-prose text-sm text-muted">
        E-mail nemáš nastavený nebo k němu nemáš přístup? Požádej trenéra své základny nebo správce, aby ti heslo obnovil. <Link href="/prihlaseni">Zpět na přihlášení</Link>
      </p>
    </div>
  );
}
