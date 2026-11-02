"use server";

import { getSession } from "./session";
import { serverClient } from "./supabase-server";
import { makeUsername } from "./username";
import type { Role } from "./session";

export type CreateResult = { ok: boolean; error?: string; username?: string; id?: string };
export type Result = { ok: boolean; error?: string };

/** Založí účet. Uživatelské jméno je jmeno.prijmeni, při shodě se přidá číslo. Počáteční heslo nastavuje databáze. */
export async function createAccount(input: {
  firstName: string;
  lastName: string;
  role: Role;
  baseId?: string;
  level?: "head" | "regular";
  memberId?: string;
  childIds?: string[];
}): Promise<CreateResult> {
  const session = await getSession();
  if (!session || !(session.roles.includes("admin") || session.trainerBaseIds.length > 0)) {
    return { ok: false, error: "Nemáte oprávnění." };
  }
  const first = input.firstName.trim();
  const last = input.lastName.trim();
  if (!first || !last) return { ok: false, error: "Vyplň jméno i příjmení." };
  const base = makeUsername(first, last);
  if (base.startsWith(".") || base.endsWith(".")) return { ok: false, error: "Jméno obsahuje jen nepodporované znaky." };
  const sb = await serverClient();
  for (let i = 0; i < 20; i++) {
    const username = i === 0 ? base : `${base}${i + 1}`;
    const { data, error } = await sb.rpc("create_account", {
      p_username: username,
      p_full_name: `${first} ${last}`,
      p_role: input.role,
      p_base: input.baseId ?? null,
      p_member: input.memberId ?? null,
      p_children: input.childIds ?? [],
      p_level: input.level ?? "head",
    });
    if (!error) return { ok: true, username, id: data as string };
    if (!/už existuje/.test(error.message)) {
      return { ok: false, error: /smí|musí|Nejste/.test(error.message) ? error.message : "Založení účtu se nepodařilo." };
    }
  }
  return { ok: false, error: "Nepodařilo se najít volné uživatelské jméno." };
}

export type ResetResult = { ok: boolean; error?: string; password?: string };

/**
 * Obnoví heslo účtu: databáze nastaví náhodné dočasné heslo, odhlásí účet a vynutí změnu při příštím přihlášení.
 * Smí správce (kdokoli) a trenér (rodiče a členové jeho základny). Heslo se vrací jen tomu, kdo obnovu provedl.
 */
export async function resetPassword(profileId: string): Promise<ResetResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Nejste přihlášen." };
  if (profileId === session.userId) return { ok: false, error: "Vlastní heslo změň v nabídce uživatele." };
  const sb = await serverClient();
  const { data, error } = await sb.rpc("reset_password", { p_profile: profileId });
  if (error) {
    return { ok: false, error: /smí|Smíte|Nemáte|neexistuje|Nejste/.test(error.message) ? error.message : "Obnovení hesla se nepodařilo." };
  }
  return { ok: true, password: data as string };
}

export async function linkChild(profileId: string, memberId: string): Promise<Result> {
  const sb = await serverClient();
  const { error } = await sb.from("guardians").insert({ profile_id: profileId, member_id: memberId });
  if (error) return { ok: false, error: error.code === "23505" ? "Dítě už je přiřazeno." : "Nemáte oprávnění nebo se přiřazení nepodařilo." };
  return { ok: true };
}

export async function unlinkChild(profileId: string, memberId: string): Promise<Result> {
  const sb = await serverClient();
  const { data, error } = await sb.from("guardians").delete().eq("profile_id", profileId).eq("member_id", memberId).select("member_id");
  if (error || !data?.length) return { ok: false, error: "Nemáte oprávnění nebo se odebrání nepodařilo." };
  return { ok: true };
}
