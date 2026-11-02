"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { serverClient } from "./supabase-server";
import { getSession } from "./session";
import { usernameToEmail } from "./username";

export type FormState = { error?: string; info?: string };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Pravidla hesla; vrací text chyby nebo null. */
function passwordProblem(password: string, again: string, username: string | null): string | null {
  if (password.length < 8) return "Heslo musí mít aspoň 8 znaků.";
  if (password !== again) return "Hesla se neshodují.";
  if (/^\d+$/.test(password)) return "Heslo nesmí být jen z číslic.";
  if (username && password.toLowerCase().includes(username.split(".")[0])) return "Heslo nesmí obsahovat tvoje jméno.";
  return null;
}

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Pošle e-mail s odkazem; kliknutím se ověří vlastnictví schránky (viz /potvrdit). */
async function sendLink(email: string): Promise<string | null> {
  const sb = await serverClient();
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: `${await siteOrigin()}/potvrdit` } });
  if (!error) return null;
  return error.status === 429 || /rate|seconds/i.test(error.message)
    ? "Odkaz byl odeslán před chvílí. Počkej minutu a zkus to znovu."
    : "E-mail se nepodařilo odeslat. Zkontroluj adresu a zkus to znovu.";
}

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const username = String(form.get("username") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!username || !password) return { error: "Vyplň uživatelské jméno i heslo." };

  const sb = await serverClient();
  const { error } = await sb.auth.signInWithPassword({ email: usernameToEmail(username), password });
  // Stejná odpověď pro neexistující jméno i špatné heslo, ať se nedá zjišťovat, kdo je v systému.
  if (error) return { error: "Neplatné uživatelské jméno nebo heslo." };

  const session = await getSession();
  redirect(session?.mustChangePassword ? "/heslo" : "/prehled");
}

/** První přihlášení: e-mail a nové heslo. Heslo začne platit až po kliknutí na odkaz v e-mailu. */
export async function activate(_prev: FormState, form: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/prihlaseni");

  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const again = String(form.get("again") ?? "");
  if (!EMAIL.test(email) || email.length > 254) return { error: "Zadej platný e-mail." };
  const problem = passwordProblem(password, again, session.username);
  if (problem) return { error: problem };

  const sb = await serverClient();
  const begin = await sb.rpc("activation_begin", { p_email: email, p_password: password });
  if (begin.error) return { error: "Uložení se nepodařilo. Zkus to znovu." };
  const sent = await sendLink(email);
  if (sent) return { error: sent };
  return { info: `Poslali jsme odkaz na ${email}. Klikni na něj, tím se nové heslo aktivuje. Potom se přihlas novým heslem.` };
}

/** Změna hesla bez e-mailu: účet, který už má ověřený e-mail (obnovený trenérem nebo běžná změna). */
export async function changePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/prihlaseni");
  if (session.mustChangePassword && !session.hasContactEmail) redirect("/heslo");

  const password = String(form.get("password") ?? "");
  const problem = passwordProblem(password, String(form.get("again") ?? ""), session.username);
  if (problem) return { error: problem };

  const sb = await serverClient();
  const { error } = await sb.auth.updateUser({ password });
  if (error) return { error: "Heslo se nepodařilo změnit. Zkus jiné, delší heslo." };
  if (session.mustChangePassword) {
    const { error: flagError } = await sb.rpc("password_changed");
    if (flagError) return { error: "Heslo je změněné, ale přihlášení se nepodařilo dokončit. Přihlas se znovu." };
  }
  redirect("/prehled");
}

/** Zapomenuté heslo: pošle odkaz na zadaný e-mail. Odpověď je vždy stejná. */
export async function requestReset(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 254) return { error: "Zadej platný e-mail." };
  const sent = await sendLink(email);
  if (sent) return { error: sent };
  return { info: "Pokud je tento e-mail ověřený u některého účtu, poslali jsme na něj odkaz pro nastavení nového hesla." };
}

/** Po kliknutí na odkaz: nastaví nové heslo účtu s ověřeným e-mailem. */
export async function setNewPassword(_prev: FormState, form: FormData): Promise<FormState> {
  const username = String(form.get("username") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const problem = passwordProblem(password, String(form.get("again") ?? ""), username);
  if (problem) return { error: problem };

  const sb = await serverClient();
  const { error } = await sb.rpc("reset_set_password", { p_username: username, p_password: password });
  if (error) return { error: /neexistuje/.test(error.message) ? "K tomuto e-mailu není takový účet." : "Heslo se nepodařilo nastavit. Zkus to znovu." };
  await sb.auth.signOut();
  redirect("/prihlaseni?stav=obnoveno");
}

export async function logout() {
  const sb = await serverClient();
  await sb.auth.signOut();
  redirect("/");
}
