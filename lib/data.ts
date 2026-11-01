/**
 * Datová vrstva. Všechny stránky čtou jen odsud.
 * Je-li nastavený Supabase (viz .env.example), čte z databáze, jinak z demo dat.
 * Členové, přihlášky a výsledky jsou v databázi chráněné; bez přihlášení je anonym nevidí.
 */
import { cacheLife } from "next/cache";
import * as demo from "./demo-data";
import { hasSupabase, publicClient } from "./supabase";
import { serverClient } from "./supabase-server";
import { ACTIVITY_TYPES, type Base, type ClubEvent, type Member, type Membership, type Post, type RankingRow } from "./types";

export const isDemo = !hasSupabase;

type EventRow = {
  id: string; title: string; type: ClubEvent["type"]; starts_on: string; ends_on: string;
  venue: string | null; city: string | null; capacity: number; description: string | null; document_url: string | null;
};

function toEvent(r: EventRow): ClubEvent {
  return {
    id: r.id, title: r.title, type: r.type, startsOn: r.starts_on, endsOn: r.ends_on,
    venue: r.venue ?? undefined, city: r.city ?? undefined, capacity: r.capacity,
    description: r.description ?? undefined, documentUrl: r.document_url ?? undefined,
  };
}

/** Okamžik z databáze převede na kalendářní den (YYYY-MM-DD) v pražském čase. */
function pragueDay(ts: string): string {
  return new Date(ts).toLocaleDateString("sv-SE", { timeZone: "Europe/Prague" });
}

function fail(what: string, error: { message: string }): never {
  throw new Error(`Supabase (${what}): ${error.message}`);
}

export async function getBases(): Promise<Base[]> {
  "use cache";
  cacheLife("hours");
  if (!isDemo) {
    const { data, error } = await publicClient().from("bases").select("id,name").order("name");
    if (error) fail("bases", error);
    return data;
  }
  return demo.bases;
}

/**
 * Členové viditelní přihlášenému uživateli. Bez cache: výsledek závisí na uživateli
 * a o rozsahu (základna trenéra, děti rodiče) rozhodují pravidla RLS v databázi.
 */
export async function getMembers(): Promise<Member[]> {
  if (isDemo) return demo.members;
  const sb = await serverClient();
  const { data, error } = await sb
    .from("members")
    .select("id,last_name,first_name,birth_year,category,kyu,base_id,membership")
    .eq("status", "active")
    .order("last_name")
    .order("first_name");
  if (error) fail("members", error);
  return data.map((m) => ({
    id: m.id, lastName: m.last_name, firstName: m.first_name, birthYear: m.birth_year ?? null,
    category: m.category, kyu: Number(m.kyu ?? 6), baseId: m.base_id,
    membership: m.membership as Membership,
  }));
}

export async function getEvents(): Promise<ClubEvent[]> {
  "use cache";
  cacheLife("minutes");
  if (!isDemo) {
    const { data, error } = await publicClient()
      .from("events")
      .select("id,title,type,starts_on,ends_on,venue,city,capacity,description,document_url")
      .neq("type", "trenink") // tréninky mají vlastní přehled
      .order("starts_on");
    if (error) fail("events", error);
    return (data as EventRow[]).map(toEvent);
  }
  return [...demo.events].sort((a, b) => a.startsOn.localeCompare(b.startsOn));
}

export async function getEvent(id: string): Promise<ClubEvent | null> {
  "use cache";
  cacheLife("minutes");
  if (!isDemo) {
    const { data, error } = await publicClient()
      .from("events")
      .select("id,title,type,starts_on,ends_on,venue,city,capacity,description,document_url")
      .eq("id", id)
      .maybeSingle();
    if (error) fail("event", error);
    return data ? toEvent(data as EventRow) : null;
  }
  return demo.events.find((e) => e.id === id) ?? null;
}

export async function getPosts(): Promise<Post[]> {
  "use cache";
  cacheLife("minutes");
  if (!isDemo) {
    const { data, error } = await publicClient()
      .from("posts")
      .select("id,title,excerpt,attachment_url,published_at")
      .order("published_at", { ascending: false });
    if (error) fail("posts", error);
    return data.map((p) => ({
      id: p.id, title: p.title, excerpt: p.excerpt, publishedAt: pragueDay(p.published_at as string),
      attachmentUrl: p.attachment_url ?? undefined,
    }));
  }
  return [...demo.posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

/** Počty přihlášených na akci: celkem a po základnách. Jména dětí veřejně neukazujeme. */
export async function getRegistrationSummary(
  eventId: string,
): Promise<{ total: number; byBase: { baseId: string; name: string; count: number }[] }> {
  "use cache";
  cacheLife("minutes");
  // Přihlášky jsou v databázi chráněné; veřejné počty se doplní spolu s přihlášením.
  if (!isDemo) return { total: 0, byBase: [] };
  const memberBase = new Map(demo.members.map((m) => [m.id, m.baseId]));
  const counts = new Map<string, number>();
  let total = 0;
  for (const r of demo.registrations) {
    if (r.eventId !== eventId) continue;
    total += 1;
    const baseId = memberBase.get(r.memberId);
    if (baseId) counts.set(baseId, (counts.get(baseId) ?? 0) + 1);
  }
  const byBase = demo.bases
    .filter((b) => counts.has(b.id))
    .map((b) => ({ baseId: b.id, name: b.name, count: counts.get(b.id)! }))
    .sort((a, b) => b.count - a.count);
  return { total, byBase };
}

/** Agregace výsledků po členech a rocích. Body se berou tak, jak jsou uložené u výsledků. */
export async function getRankingRows(): Promise<RankingRow[]> {
  "use cache";
  cacheLife("minutes");
  // Výsledky se zveřejní po rozhodnutí klubu o jménech; zatím jen demo.
  if (!isDemo) return [];
  const eventById = new Map(demo.events.map((e) => [e.id, e]));
  const memberById = new Map(demo.members.map((m) => [m.id, m]));
  const acc = new Map<string, RankingRow>();

  for (const r of demo.results) {
    const ev = eventById.get(r.eventId);
    const m = memberById.get(r.memberId);
    if (!ev || !m) continue;
    const year = Number(ev.startsOn.slice(0, 4));
    const key = `${year}:${m.id}`;
    const row =
      acc.get(key) ??
      ({
        year,
        memberId: m.id,
        name: `${m.lastName} ${m.firstName}`,
        category: m.category,
        baseId: m.baseId,
        points: 0,
        wins: 0,
        matches: 0,
        activityPoints: 0,
      } satisfies RankingRow);
    if (ACTIVITY_TYPES.includes(ev.type)) {
      row.activityPoints += r.points;
    } else {
      row.points += r.points;
      row.wins += r.wins;
      row.matches += r.matches;
    }
    acc.set(key, row);
  }
  return [...acc.values()];
}

export type TrainingSlot = {
  id: string; baseId: string; baseName: string; venue: string | null; address: string | null;
  weekday: number; startsAt: string; endsAt: string; label: string | null;
};
export type CancelledTraining = {
  id: string; baseName: string; day: string; startsAt: string;
  status: "cancelled";
};

/** Týdenní rozvrh všech základen (veřejný). */
export async function getSchedule(): Promise<TrainingSlot[]> {
  "use cache";
  cacheLife("minutes");
  if (isDemo) return [];
  const { data, error } = await publicClient()
    .from("training_slots")
    .select("id,base_id,weekday,starts_at,ends_at,label,bases(name,venue,address)")
    .eq("active", true)
    .order("weekday")
    .order("starts_at");
  if (error) fail("training_slots", error);
  return data.map((r) => {
    const b = r.bases as unknown as { name: string; venue: string | null; address: string | null };
    return {
      id: r.id, baseId: r.base_id, baseName: b.name, venue: b.venue, address: b.address,
      weekday: r.weekday, startsAt: r.starts_at.slice(0, 5), endsAt: r.ends_at.slice(0, 5), label: r.label,
    };
  });
}

/** Nadcházející zrušené tréninky (veřejné, bez jmen). */
export async function getCancelledTrainings(): Promise<CancelledTraining[]> {
  "use cache";
  cacheLife("minutes");
  if (isDemo) return [];
  const sb = publicClient();
  const [t, bases] = await Promise.all([
    sb.from("events")
      .select("id,starts_at,base_id,training_status,bases(name)")
      .eq("type", "trenink")
      .neq("training_status", "planned")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at"),
    sb.from("bases").select("id,name"),
  ]);
  if (t.error) fail("cancelled trainings", t.error);
  const names = new Map((bases.data ?? []).map((b) => [b.id, b.name]));
  return t.data.map((r) => ({
    id: r.id,
    baseName: (r.bases as unknown as { name: string }).name,
    day: pragueDay(r.starts_at!),
    startsAt: new Date(r.starts_at!).toLocaleTimeString("cs-CZ", { timeZone: "Europe/Prague", hour: "2-digit", minute: "2-digit" }),
    status: "cancelled",
  }));
}
