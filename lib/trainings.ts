import "server-only";
import { serverClient } from "./supabase-server";
import type { Session } from "./session";

export type Training = {
  id: string;
  baseId: string;
  baseName: string;
  startsAt: string; // ISO
  endsAt: string;
  label: string | null;
  status: "planned" | "cancelled";
  attending: number;
  excused: number;
};
export type MyMember = { id: string; name: string; baseId: string };
export type Reg = { eventId: string; memberId: string; status: "attending" | "excused"; lateExcuse: boolean };

/** Členové, za které smí uživatel jednat: on sám a jeho děti. */
export async function getMyMembers(session: Session): Promise<MyMember[]> {
  const sb = await serverClient();
  const [own, kids] = await Promise.all([
    sb.from("profiles").select("member_id").eq("id", session.userId).maybeSingle(),
    sb.from("guardians").select("member_id").eq("profile_id", session.userId),
  ]);
  const ids = [own.data?.member_id, ...(kids.data ?? []).map((k) => k.member_id)].filter(Boolean) as string[];
  if (ids.length === 0) return [];
  const { data } = await sb.from("members").select("id,first_name,last_name,base_id").in("id", ids).order("first_name");
  return (data ?? []).map((m) => ({ id: m.id, name: `${m.first_name} ${m.last_name}`, baseId: m.base_id }));
}

/** Tréninky v rozmezí dnů od dneška (záporné = minulost), volitelně jedné základny nebo více. */
export async function getTrainings(fromDays: number, toDays: number, baseIds?: string[]): Promise<Training[]> {
  const sb = await serverClient();
  const day = 24 * 3600 * 1000;
  const from = new Date(Date.now() + fromDays * day);
  const to = new Date(Date.now() + toDays * day);
  let q = sb
    .from("events")
    .select("id,base_id,starts_at,ends_at,description,training_status,bases(name)")
    .eq("type", "trenink")
    .gte("starts_at", from.toISOString())
    .lt("starts_at", to.toISOString())
    .order("starts_at");
  if (baseIds) q = q.in("base_id", baseIds);
  const [t, c] = await Promise.all([q, sb.rpc("training_counts", { from_ts: from.toISOString(), to_ts: to.toISOString() })]);
  if (t.error) throw new Error(`trainings: ${t.error.message}`);
  type Count = { event_id: string; attending: number; excused: number };
  const counts = new Map<string, Count>(((c.data ?? []) as Count[]).map((r) => [r.event_id, r]));
  return t.data.map((r) => ({
    id: r.id,
    baseId: r.base_id!,
    baseName: (r.bases as unknown as { name: string }).name,
    startsAt: r.starts_at!,
    endsAt: r.ends_at!,
    label: r.description,
    status: r.training_status as "planned" | "cancelled",
    attending: counts.get(r.id)?.attending ?? 0,
    excused: counts.get(r.id)?.excused ?? 0,
  }));
}

export async function getMyRegs(memberIds: string[], eventIds: string[]): Promise<Reg[]> {
  if (memberIds.length === 0 || eventIds.length === 0) return [];
  const sb = await serverClient();
  const { data } = await sb
    .from("registrations")
    .select("event_id,member_id,status,late_excuse")
    .in("member_id", memberIds)
    .in("event_id", eventIds);
  return (data ?? []).map((r) => ({ eventId: r.event_id, memberId: r.member_id, status: r.status, lateExcuse: r.late_excuse }));
}

const TZ = "Europe/Prague";
export const fmtDay = (iso: string) =>
  new Intl.DateTimeFormat("cs-CZ", { weekday: "short", day: "numeric", month: "numeric", timeZone: TZ }).format(new Date(iso));
export const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat("cs-CZ", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(iso));

export type TrainerOnTraining = { id: string; name: string; kind: "head" | "regular" | "guest"; status: "attending" | "excused" };

/** Trenéři jednotlivých tréninků v rozmezí dnů (jména vrací databáze jen správci a trenérům). */
export async function getTrainersByEvent(fromDays: number, toDays: number): Promise<Map<string, TrainerOnTraining[]>> {
  const sb = await serverClient();
  const day = 24 * 3600 * 1000;
  const { data } = await sb.rpc("training_trainers", {
    from_ts: new Date(Date.now() + fromDays * day).toISOString(),
    to_ts: new Date(Date.now() + toDays * day).toISOString(),
  });
  const map = new Map<string, TrainerOnTraining[]>();
  for (const r of (data ?? []) as { event_id: string; profile_id: string; full_name: string; kind: TrainerOnTraining["kind"]; status: TrainerOnTraining["status"] }[]) {
    map.set(r.event_id, [...(map.get(r.event_id) ?? []), { id: r.profile_id, name: r.full_name, kind: r.kind, status: r.status }]);
  }
  return map;
}

/** Jména trenérů, kteří na trénink přijdou. */
export function presentTrainers(list: TrainerOnTraining[] | undefined): string {
  return (list ?? []).filter((t) => t.status === "attending").map((t) => t.name).join(", ");
}
