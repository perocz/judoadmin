"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "./session";
import { serverClient } from "./supabase-server";

export type MembershipResult = { ok: boolean; error?: string };

/** Změna typu příspěvku a příznaku „smí na jakýkoli trénink“. Smí admin a trenér dané základny (vynucuje i databáze). */
export async function setMembership(
  memberId: string,
  membership: "unlimited" | "standard",
  anyTraining: boolean,
): Promise<MembershipResult> {
  const session = await getSession();
  if (!session || !(session.roles.includes("admin") || session.roles.includes("trainer"))) {
    return { ok: false, error: "Nemáte oprávnění." };
  }
  const sb = await serverClient();
  const { data, error } = await sb
    .from("members")
    .update({ membership, any_training: anyTraining })
    .eq("id", memberId)
    .select("id");
  if (error) return { ok: false, error: "Uložení se nepodařilo." };
  if (!data?.length) return { ok: false, error: "Tohoto člena nemůžete měnit." };
  revalidatePath("/clenove");
  return { ok: true };
}
