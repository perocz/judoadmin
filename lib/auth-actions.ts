"use server";

import { redirect } from "next/navigation";
import { serverClient } from "./supabase-server";
import { getSession } from "./session";
import { usernameToEmail } from "./username";

export type FormState = { error?: string };

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const username = String(form.get("username") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!username || !password) return { error: "Vyplň uživatelské jméno i heslo." };

  const sb = await serverClient();
  const { error } = await sb.auth.signInWithPassword({ email: usernameToEmail(username), password });
  // Stejná odpověď pro neexistující jméno i špatné heslo, ať se nedá zjišťovat, kdo je v systému.
  if (error) return { error: "Neplatné uživatelské jméno nebo heslo." };

  const session = await getSession();
  redirect(session?.mustChangePassword ? "/heslo" : "/");
}

export async function changePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/prihlaseni");

  const password = String(form.get("password") ?? "");
  const again = String(form.get("again") ?? "");
  if (password.length < 8) return { error: "Heslo musí mít aspoň 8 znaků." };
  if (password !== again) return { error: "Hesla se neshodují." };
  if (/^\d+$/.test(password)) return { error: "Heslo nesmí být jen z číslic." };
  const lower = password.toLowerCase();
  if (session.username && lower.includes(session.username.split(".")[0])) {
    return { error: "Heslo nesmí obsahovat tvoje jméno." };
  }

  const sb = await serverClient();
  const { error } = await sb.auth.updateUser({ password });
  if (error) return { error: "Heslo se nepodařilo změnit. Zkus jiné, delší heslo." };
  const { error: flagError } = await sb.from("profiles").update({ must_change_password: false }).eq("id", session.userId);
  if (flagError) return { error: "Heslo je změněné, ale přihlášení se nepodařilo dokončit. Přihlas se znovu." };
  redirect("/");
}

export async function logout() {
  const sb = await serverClient();
  await sb.auth.signOut();
  redirect("/");
}
