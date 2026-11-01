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
    });
    if (!error) return { ok: true, username, id: data as string };
    if (!/už existuje/.test(error.message)) {
      return { ok: false, error: /smí|musí|Nejste/.test(error.message) ? error.message : "Založení účtu se nepodařilo." };
    }
  }
  return { ok: false, error: "Nepodařilo se najít volné uživatelské jméno." };
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
