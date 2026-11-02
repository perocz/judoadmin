import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { getEvents, isDemo } from "@/lib/data";
import { getEventCounts, getMyEventRegs, todayPrague, type EventCount } from "@/lib/events";
import { formatRange, monthLabel, weekday } from "@/lib/format";
import { getSession } from "@/lib/session";
import { getMyMembers } from "@/lib/trainings";
import { EVENT_TYPE_LABEL, type ClubEvent } from "@/lib/types";

export const metadata: Metadata = { title: "Akce" };

export default function EventsPage({ searchParams }: PageProps<"/akce">) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Akce</h1>
      <p className="mt-1 text-muted">Turnaje, přespávačky, kempy a klubové soutěže.</p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-muted">Načítám…</p>}>
          <EventList searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function EventList({ searchParams }: { searchParams: PageProps<"/akce">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const archive = sp.archiv === "1";
  const today = todayPrague();
  const all = await getEvents();
  const events = archive ? all.filter((e) => e.endsOn < today).reverse() : all.filter((e) => e.endsOn >= today);

  // Přihlášený uživatel vidí u akcí své přihlášky a počty přihlášených.
  const session = isDemo ? null : await getSession();
  let mine = new Map<string, string[]>();
  let counts = new Map<string, EventCount>();
  if (session && !session.mustChangePassword) {
    const people = await getMyMembers(session);
    const [regs, c] = await Promise.all([getMyEventRegs(people.map((p) => p.id)), getEventCounts()]);
    const name = new Map(people.map((p) => [p.id, p.name]));
    for (const r of regs) mine.set(r.eventId, [...(mine.get(r.eventId) ?? []), name.get(r.memberId) ?? ""]);
    counts = c;
  } else {
    mine = new Map();
  }
  const personal = !!session && !session.mustChangePassword;

  const byMonth = new Map<string, ClubEvent[]>();
  for (const e of events) {
    const key = e.startsOn.slice(0, 7);
    byMonth.set(key, [...(byMonth.get(key) ?? []), e]);
  }
  return (
    <div className="space-y-10">
      <p className="text-sm">
        {archive ? <Link href="/akce">← Nadcházející akce</Link> : <Link href="/akce?archiv=1">Proběhlé akce →</Link>}
      </p>
      {events.length === 0 && <p className="text-muted">{archive ? "Žádné proběhlé akce." : "Žádné naplánované akce."}</p>}
      {[...byMonth.entries()].map(([key, list]) => (
        <section key={key} aria-labelledby={`m-${key}`}>
          <h2 id={`m-${key}`} className="label mb-2">
            {monthLabel(`${key}-01`)}
          </h2>
          <table className="tbl">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Akce</th>
                <th className="hidden sm:table-cell">Typ</th>
                <th className="hidden sm:table-cell">Místo</th>
                {personal && !archive && <th className="num">Přihlášeno</th>}
                {personal && <th>Moje</th>}
              </tr>
            </thead>
            <tbody>
              {list.map((e) => {
                const names = mine.get(e.id);
                return (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap font-mono text-sm">
                      <span className="mr-2 inline-block w-6 text-muted">{weekday(e.startsOn)}</span>
                      {formatRange(e.startsOn, e.endsOn)}
                    </td>
                    <td>
                      <Link href={`/akce/${e.id}`}>{e.title}</Link>
                    </td>
                    <td className="hidden text-muted sm:table-cell">{EVENT_TYPE_LABEL[e.type]}</td>
                    <td className="hidden text-muted sm:table-cell">{e.city ?? "–"}</td>
                    {personal && !archive && <td className="num">{counts.get(e.id)?.total ?? 0}</td>}
                    {personal && <td className="text-sm">{names ? names.join(", ") : <span className="text-muted">–</span>}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
