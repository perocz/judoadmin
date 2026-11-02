"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "./session";
import { serverClient } from "./supabase-server";

export type EventResult = { ok: boolean; error?: string };
const DENIED = { ok: false, error: "Nemáte oprávnění." } satisfies EventResult;
const FAILED = { ok: false, error: "Uložení se nepodařilo." } satisfies EventResult;

function message(e: { message: string; code?: string }): EventResult {
  // Pravidla (uzávěrka, kapacita, uzavřené přihlašování) hlásí databáze česky.
  if (/1 den|uzavřeno|plná|jen přihlásit/.test(e.message)) return { ok: false, error: e.message };
  if (e.code === "42501") return DENIED;
  return FAILED;
}

/** Přihlásí člena (sebe nebo dítě) na akci, nebo uloží změnu váhy, přespání a poznámky u existující přihlášky. */
export async function registerForEvent(input: {
  eventId: string;
  memberId: string;
  weightKg: number | null;
  staysOvernight: boolean;
  note: string;
}): Promise<EventResult> {
  const session = await getSession();
  if (!session) return DENIED;
  const { eventId, memberId, weightKg, staysOvernight } = input;
  const note = input.note.trim();
  if (weightKg !== null && !(weightKg >= 10 && weightKg <= 200)) return { ok: false, error: "Váha musí být mezi 10 a 200 kg." };
  if (note.length > 200) return { ok: false, error: "Poznámka může mít nejvýš 200 znaků." };

  const sb = await serverClient();
  const { data: existing, error: readError } = await sb
    .from("registrations")
    .select("id")
    .eq("event_id", eventId)
    .eq("member_id", memberId)
    .maybeSingle();
  if (readError) return FAILED;

  const fields = { weight_kg: weightKg, stays_overnight: staysOvernight, note: note || null };
  // Existující přihlášku upravujeme zvlášť: upsert by spouštěl kontrolu kapacity i při pouhé změně poznámky.
  const { error } = existing
    ? await sb.from("registrations").update(fields).eq("event_id", eventId).eq("member_id", memberId)
    : await sb.from("registrations").insert({ event_id: eventId, member_id: memberId, created_by: session.userId, ...fields });
  if (error) return message(error);
  revalidatePath(`/akce/${eventId}`);
  return { ok: true };
}

/** Odhlásí člena z akce. */
export async function unregisterFromEvent(eventId: string, memberId: string): Promise<EventResult> {
  const session = await getSession();
  if (!session) return DENIED;
  const sb = await serverClient();
  const { data, error } = await sb.from("registrations").delete().eq("event_id", eventId).eq("member_id", memberId).select("id");
  if (error) return message(error);
  if (!data?.length) return { ok: false, error: "Přihláška nenalezena." };
  revalidatePath(`/akce/${eventId}`);
  return { ok: true };
}
