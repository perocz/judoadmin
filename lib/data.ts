/**
 * Datová vrstva. Všechny stránky čtou jen odsud.
 * Zatím běží nad demo daty. Adaptér pro Supabase se přidá sem, aniž by se měnily stránky.
 */
import { cacheLife } from "next/cache";
import * as demo from "./demo-data";
import { ACTIVITY_TYPES, type Base, type ClubEvent, type Member, type Post, type RankingRow } from "./types";

export const isDemo = true;

export async function getBases(): Promise<Base[]> {
  "use cache";
  cacheLife("hours");
  return demo.bases;
}

export async function getMembers(): Promise<Member[]> {
  "use cache";
  cacheLife("minutes");
  return demo.members;
}

export async function getEvents(): Promise<ClubEvent[]> {
  "use cache";
  cacheLife("minutes");
  return [...demo.events].sort((a, b) => a.startsOn.localeCompare(b.startsOn));
}

export async function getEvent(id: string): Promise<ClubEvent | null> {
  "use cache";
  cacheLife("minutes");
  return demo.events.find((e) => e.id === id) ?? null;
}

export async function getPosts(): Promise<Post[]> {
  "use cache";
  cacheLife("minutes");
  return [...demo.posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

/** Počty přihlášených na akci: celkem a po základnách. Jména dětí veřejně neukazujeme. */
export async function getRegistrationSummary(
  eventId: string,
): Promise<{ total: number; byBase: { baseId: string; name: string; count: number }[] }> {
  "use cache";
  cacheLife("minutes");
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
