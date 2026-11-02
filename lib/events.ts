import "server-only";
import { serverClient } from "./supabase-server";
import type { Session } from "./session";

/** Dnešní kalendářní den v pražském čase (YYYY-MM-DD). */
export const todayPrague = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Prague" });

/** Správce, moderátor a trenér mají u přihlášek výjimku z uzávěrky (hlídá to i databáze). */
export const isStaff = (session: Session) => session.roles.includes("admin") || session.roles.includes("moderator") || session.isTrainer;

/** Na akci se lze přihlásit a odhlásit nejpozději 1 den předem; personál smí vždy. */
export function signupClosed(session: Session, startsOn: string): boolean {
  return !isStaff(session) && todayPrague() >= startsOn;
}

export type EventReg = { eventId: string; memberId: string; weightKg: number | null; staysOvernight: boolean; note: string };

/** Přihlášky mých členů (já a děti) na akce, ne na tréninky. Databáze vrací jen moje. */
export async function getMyEventRegs(memberIds: string[], eventId?: string): Promise<EventReg[]> {
  if (memberIds.length === 0) return [];
  const sb = await serverClient();
  let q = sb
    .from("registrations")
    .select("event_id,member_id,weight_kg,stays_overnight,note,events!inner(type)")
    .in("member_id", memberIds)
    .neq("events.type", "trenink");
  if (eventId) q = q.eq("event_id", eventId);
  const { data } = await q;
  return (data ?? []).map((r) => ({
    eventId: r.event_id,
    memberId: r.member_id,
    weightKg: r.weight_kg === null ? null : Number(r.weight_kg),
    staysOvernight: r.stays_overnight,
    note: r.note ?? "",
  }));
}

export type EventCount = { total: number; byBase: Map<string, number> };

/** Počty přihlášených po akcích a základnách (bez jmen). Vidí je přihlášený uživatel. */
export async function getEventCounts(): Promise<Map<string, EventCount>> {
  const sb = await serverClient();
  const { data } = await sb.rpc("event_counts");
  const map = new Map<string, EventCount>();
  for (const r of (data ?? []) as { event_id: string; base_id: string; cnt: number }[]) {
    const cur = map.get(r.event_id) ?? { total: 0, byBase: new Map<string, number>() };
    cur.total += r.cnt;
    cur.byBase.set(r.base_id, (cur.byBase.get(r.base_id) ?? 0) + r.cnt);
    map.set(r.event_id, cur);
  }
  return map;
}

export type MyEvent = { eventId: string; title: string; startsOn: string; endsOn: string; names: string[] };

/** Nadcházející akce, na které jsou přihlášení moji členové (já a děti). */
export async function getMyUpcomingEvents(people: { id: string; name: string }[]): Promise<MyEvent[]> {
  if (people.length === 0) return [];
  const sb = await serverClient();
  const { data } = await sb
    .from("registrations")
    .select("event_id,member_id,events!inner(title,type,starts_on,ends_on)")
    .in("member_id", people.map((p) => p.id))
    .neq("events.type", "trenink")
    .gte("events.ends_on", todayPrague());
  const name = new Map(people.map((p) => [p.id, p.name]));
  const byEvent = new Map<string, MyEvent>();
  for (const r of data ?? []) {
    const ev = r.events as unknown as { title: string; starts_on: string; ends_on: string };
    const cur: MyEvent = byEvent.get(r.event_id) ?? { eventId: r.event_id, title: ev.title, startsOn: ev.starts_on, endsOn: ev.ends_on, names: [] };
    cur.names.push(name.get(r.member_id) ?? "");
    byEvent.set(r.event_id, cur);
  }
  return [...byEvent.values()].sort((a, b) => a.startsOn.localeCompare(b.startsOn));
}
