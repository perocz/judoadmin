import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEvent, getRegistrationSummary } from "@/lib/data";
import { formatRange } from "@/lib/format";
import { EVENT_TYPE_LABEL } from "@/lib/types";

export const metadata: Metadata = { title: "Detail akce" };

export default function EventPage(props: PageProps<"/akce/[id]">) {
  return (
    <div>
      <p className="mb-6 text-sm">
        <Link href="/akce">← Všechny akce</Link>
      </p>
      <Suspense fallback={<p className="text-muted">Načítám…</p>}>
        <EventDetail params={props.params} />
      </Suspense>
    </div>
  );
}

async function EventDetail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();
  const summary = await getRegistrationSummary(event.id);
  const free = Math.max(0, event.capacity - summary.total);

  return (
    <article>
      <p className="label">{EVENT_TYPE_LABEL[event.type]}</p>
      <h1 className="mt-1 text-2xl font-semibold">{event.title}</h1>

      <dl className="mt-6 grid grid-cols-[7rem_1fr] gap-y-2 border-y border-line py-4 text-[0.9375rem]">
        <dt className="text-muted">Datum</dt>
        <dd className="font-mono text-sm">{formatRange(event.startsOn, event.endsOn)}</dd>
        {(event.venue || event.city) && (
          <>
            <dt className="text-muted">Místo</dt>
            <dd>{[event.venue, event.city].filter(Boolean).join(", ")}</dd>
          </>
        )}
        <dt className="text-muted">Přihlášeno</dt>
        <dd className="font-mono text-sm">
          {summary.total} / {event.capacity} <span className="font-sans text-muted">(volných {free})</span>
        </dd>
      </dl>

      {event.description && <p className="mt-6 max-w-prose">{event.description}</p>}

      <div className="mt-6 flex flex-wrap gap-3">
        {event.documentUrl && (
          <a href={event.documentUrl} className="border border-fg px-4 py-2 text-sm no-underline hover:border-accent hover:text-accent">
            Pozvánka a rozpis
          </a>
        )}
        <span className="border border-line px-4 py-2 text-sm text-muted" aria-disabled="true">
          Přihlášení bude doplněno
        </span>
      </div>

      {summary.byBase.length > 0 && (
        <section className="mt-10" aria-labelledby="h-zakl">
          <h2 id="h-zakl" className="label mb-2">
            Přihlášení podle základen
          </h2>
          <table className="tbl max-w-sm">
            <tbody>
              {summary.byBase.map((b) => (
                <tr key={b.baseId}>
                  <td>{b.name}</td>
                  <td className="num">{b.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted">Jména přihlášených se veřejně nezobrazují.</p>
        </section>
      )}
    </article>
  );
}
