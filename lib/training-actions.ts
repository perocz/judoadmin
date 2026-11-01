"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "./session";
import { serverClient } from "./supabase-server";

export type ActionResult = { ok: boolean; error?: string };
const DENIED = { ok: false, error: "Nemáte oprávnění." } satisfies ActionResult;
const FAILED = { ok: false, error: "Uložení se nepodařilo." } satisfies ActionResult;

function message(e: { message: string }): ActionResult {
  // Pravidla uzávěrky hlásí databáze česky.
  return /hodinu|1 den|zrušen/.test(e.message) ? { ok: false, error: e.message } : FAILED;
}

/** Rodič/člen: přihlásí na trénink ("attending"), omluví ("excused") nebo zruší přihlášku (null). */
export async function setRegistration(
  eventId: string,
  memberId: string,
  status: "attending" | "excused" | null,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return DENIED;
  const sb = await serverClient();
  if (status === null) {
    const { error } = await sb.from("registrations").delete().eq("event_id", eventId).eq("member_id", memberId);
    return error ? message(error) : { ok: true };
  }
  const { error } = await sb
    .from("registrations")
    .upsert(
      { event_id: eventId, member_id: memberId, status, created_by: session.userId, stays_overnight: false },
      { onConflict: "event_id,member_id" },
    );
  return error ? message(error) : { ok: true };
}

/** Trenér/admin: zapíše nebo zruší přítomnost. */
export async function setAttendance(eventId: string, memberId: string, present: boolean): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return DENIED;
  const sb = await serverClient();
  const { error } = present
    ? await sb.from("attendance").upsert({ event_id: eventId, member_id: memberId, marked_by: session.userId })
    : await sb.from("attendance").delete().eq("event_id", eventId).eq("member_id", memberId);
  return error ? FAILED : { ok: true };
}

/** Trenér/admin: změní stav tréninku. */
export async function setTrainingStatus(
  eventId: string,
  status: "planned" | "cancelled" | "cancelled_replacement",
  replacementBaseIds: string[] = [],
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return DENIED;
  const sb = await serverClient();
  const { data, error } = await sb
    .from("events")
    .update({ training_status: status, replacement_base_ids: status === "cancelled_replacement" ? replacementBaseIds : [] })
    .eq("id", eventId)
    .select("id");
  if (error) return FAILED;
  if (!data?.length) return DENIED;
  revalidatePath("/treninky");
  return { ok: true };
}

/** Trenér: odhlásí se z tréninku své základny ("excused"), přihlásí se na cizí ("attending"), nebo vrátí výchozí stav (null). */
export async function setTrainerAttendance(eventId: string, status: "attending" | "excused" | null): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !session.isTrainer) return DENIED;
  const sb = await serverClient();
  const { error } =
    status === null
      ? await sb.from("trainer_attendance").delete().eq("event_id", eventId).eq("profile_id", session.userId)
      : await sb.from("trainer_attendance").upsert({ event_id: eventId, profile_id: session.userId, status });
  return error ? FAILED : { ok: true };
}
