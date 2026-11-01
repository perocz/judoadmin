import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AttendanceList, { type Row } from "@/components/AttendanceList";
import { getBases } from "@/lib/data";
import { requireSession } from "@/lib/session";
import { serverClient } from "@/lib/supabase-server";
import { fmtDay, fmtTime, getTrainersByEvent } from "@/lib/trainings";

export const metadata: Metadata = { title: "Docházka tréninku" };

export default function Page({ params }: PageProps<"/dochazka/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Načítám…</p>}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/dochazka/[id]">["params"] }) {
  const session = await requireSession();
  const { id } = await params;
  const sb = await serverClient();
  const { data: ev } = await sb
    .from("events")
    .select("id,base_id,starts_at,ends_at,description,training_status,replacement_base_ids,type,bases(name)")
    .eq("id", id)
    .eq("type", "trenink")
    .maybeSingle();
  if (!ev) notFound();
  const canManage = session.roles.includes("admin") || session.trainerBaseIds.includes(ev.base_id!);
  if (!canManage) return <p className="text-muted">Tento trénink může spravovat jen trenér základny nebo správce.</p>;

  const [bases, members, regs, att] = await Promise.all([
    getBases(),
    sb.from("members").select("id,first_name,last_name").eq("base_id", ev.base_id!).eq("status", "active").neq("membership", "neaktivni"),
    sb.from("registrations").select("member_id,status,late_excuse,members(first_name,last_name,base_id)").eq("event_id", id),
    sb.from("absences").select("member_id").eq("event_id", id),
  ]);
  const rows = new Map<string, Row>();
  const absent = new Set((att.data ?? []).map((a) => a.member_id));
  for (const m of members.data ?? []) {
    rows.set(m.id, { id: m.id, name: `${m.last_name} ${m.first_name}`, guest: false, reg: null, late: false, absent: absent.has(m.id) });
  }
  for (const r of regs.data ?? []) {
    const m = r.members as unknown as { first_name: string; last_name: string; base_id: string } | null;
    const row = rows.get(r.member_id) ?? {
      id: r.member_id,
      name: m ? `${m.last_name} ${m.first_name}` : "Neznámý člen",
      guest: m ? m.base_id !== ev.base_id : true,
      reg: null,
      late: false,
      absent: absent.has(r.member_id),
    };
    row.reg = r.status;
    row.late = r.late_excuse;
    rows.set(r.member_id, row);
  }
  const base = (ev.bases as unknown as { name: string }).name;
  const trainerList = (await getTrainersByEvent(-30, 60)).get(ev.id) ?? [];
  const KIND = { head: "hlavní", regular: "stálý", guest: "host" } as const;
  return (
    <div>
      <p className="text-sm">
        <Link href="/dochazka">← Docházka</Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">
        {base}, {fmtDay(ev.starts_at!)} {fmtTime(ev.starts_at!)}–{fmtTime(ev.ends_at!)}
      </h1>
      {ev.description && <p className="mt-1 text-muted">{ev.description}</p>}
      <section className="mt-6">
        <h2 className="label mb-2">Trenéři</h2>
        {trainerList.length === 0 ? (
          <p className="text-muted">Žádní.</p>
        ) : (
          <ul className="space-y-0.5">
            {[...trainerList].sort((a, b) => Number(b.status === "excused") - Number(a.status === "excused")).map((t) => (
              <li key={t.id} className={t.status === "excused" ? "text-muted line-through" : ""}>
                {t.name} <span className="text-sm text-muted">· {KIND[t.kind]}{t.status === "excused" ? ", odhlášen" : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="mt-8">
        <AttendanceList
          eventId={ev.id}
          rows={[...rows.values()]}
          status={ev.training_status}
          otherBases={bases.filter((b) => b.id !== ev.base_id)}
          replacementIds={ev.replacement_base_ids}
        />
      </div>
    </div>
  );
}
