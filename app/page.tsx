import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getEvents, getPosts } from "@/lib/data";
import { formatDate, formatRange } from "@/lib/format";
import { EVENT_TYPE_LABEL } from "@/lib/types";

export default function Home() {
  return (
    <div className="space-y-12">
      <section aria-labelledby="h-akce">
        <h1 id="h-akce" className="label mb-3">
          Nadcházející akce
        </h1>
        <Suspense fallback={<p className="text-muted">Načítám…</p>}>
          <Upcoming />
        </Suspense>
        <p className="mt-3 text-sm">
          <Link href="/akce">Celý kalendář akcí →</Link>
        </p>
      </section>

      <section aria-labelledby="h-aktuality">
        <h2 id="h-aktuality" className="label mb-3">
          Aktuality
        </h2>
        <Suspense fallback={<p className="text-muted">Načítám…</p>}>
          <News />
        </Suspense>
      </section>
    </div>
  );
}

async function Upcoming() {
  await connection();
  const today = new Date().toISOString().slice(0, 10);
  const events = (await getEvents()).filter((e) => e.endsOn >= today).slice(0, 6);
  if (events.length === 0) return <p className="text-muted">Žádné naplánované akce.</p>;
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Datum</th>
          <th>Akce</th>
          <th className="hidden sm:table-cell">Typ</th>
        </tr>
      </thead>
      <tbody>
        {events.map((e) => (
          <tr key={e.id}>
            <td className="whitespace-nowrap font-mono text-sm">{formatRange(e.startsOn, e.endsOn)}</td>
            <td>
              <Link href={`/akce/${e.id}`}>{e.title}</Link>
            </td>
            <td className="hidden text-muted sm:table-cell">{EVENT_TYPE_LABEL[e.type]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

async function News() {
  const posts = (await getPosts()).slice(0, 5);
  return (
    <ul className="divide-y divide-line border-y border-line">
      {posts.map((p) => (
        <li key={p.id} className="py-4">
          <p className="font-mono text-xs text-muted">{formatDate(p.publishedAt)}</p>
          <h3 className="mt-0.5 font-medium">{p.title}</h3>
          <p className="mt-1 text-[0.9375rem] text-muted">{p.excerpt}</p>
        </li>
      ))}
    </ul>
  );
}
