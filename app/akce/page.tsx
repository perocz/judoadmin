import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { getEvents } from "@/lib/data";
import { formatRange, monthLabel, weekday } from "@/lib/format";
import { EVENT_TYPE_LABEL, type ClubEvent } from "@/lib/types";

export const metadata: Metadata = { title: "Akce" };

export default function EventsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Akce</h1>
      <p className="mt-1 text-muted">Turnaje, přespávačky, kempy a klubové soutěže.</p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-muted">Načítám…</p>}>
          <EventList />
        </Suspense>
      </div>
    </div>
  );
}

async function EventList() {
  await connection();
  const events = await getEvents();
  const byMonth = new Map<string, ClubEvent[]>();
  for (const e of events) {
    const key = e.startsOn.slice(0, 7);
    byMonth.set(key, [...(byMonth.get(key) ?? []), e]);
  }
  return (
    <div className="space-y-10">
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
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
