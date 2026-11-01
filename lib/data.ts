/**
 * Datová vrstva. Všechny stránky čtou jen odsud.
 * Je-li nastavený Supabase (viz .env.example), čte z databáze, jinak z demo dat.
 * Členové, přihlášky a výsledky jsou v databázi chráněné; bez přihlášení je anonym nevidí.
 */
import { cacheLife } from "next/cache";
import * as demo from "./demo-data";
import { hasSupabase, publicClient } from "./supabase";
import { ACTIVITY_TYPES, type Base, type ClubEvent, type Member, type Post, type RankingRow } from "./types";

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

export async function getMembers(): Promise<Member[]> {
  "use cache";
  cacheLife("minutes");
  if (!isDemo) {
    // Členy vidí jen přihlášený admin, trenér nebo rodič; anonymovi vrátí databáze prázdný seznam.
    const { data, error } = await publicClient()
      .from("members")
      .select("id,last_name,first_name,birth_year,category,kyu,base_id")
      .eq("status", "active")
      .order("last_name");
    if (error) fail("members", error);
    return data.map((m) => ({
      id: m.id, lastName: m.last_name, firstName: m.first_name, birthYear: m.birth_year ?? null,
      category: m.category, kyu: m.kyu ?? 6, baseId: m.base_id,
    }));
  }
  return demo.members;
}

export async function getEvents(): Promise<ClubEvent[]> {
  "use cache";
  cacheLife("minutes");
  if (!isDemo) {
    const { data, error } = await publicClient()
      .from("events")
      .select("id,title,type,starts_on,ends_on,venue,city,capacity,description,document_url")
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
