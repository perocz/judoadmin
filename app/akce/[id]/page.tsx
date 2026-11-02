import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EventSignup, { type SignupReg } from "@/components/EventSignup";
import { getBases, getEvent, getRegistrationSummary, isDemo } from "@/lib/data";
import { getEventCounts, getMyEventRegs, signupClosed, todayPrague } from "@/lib/events";
import { formatRange } from "@/lib/format";
import { getSession } from "@/lib/session";
import { getMyMembers } from "@/lib/trainings";
import { EVENT_TYPE_LABEL, type ClubEvent } from "@/lib/types";

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
  // Demo má počty přihlášených veřejně, ostrá data jen přihlášenému (viz Participation).
  const summary = isDemo ? await getRegistrationSummary(event.id) : null;

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
        {summary && (
          <>
            <dt className="text-muted">Přihlášeno</dt>
            <dd className="font-mono text-sm">
              {summary.total} / {event.capacity} <span className="font-sans text-muted">(volných {Math.max(0, event.capacity - summary.total)})</span>
            </dd>
          </>
        )}
      </dl>

      {event.description && <p className="mt-6 max-w-prose">{event.description}</p>}

      {event.documentUrl && (
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={event.documentUrl} className="border border-fg px-4 py-2 text-sm no-underline hover:border-accent hover:text-accent">
            Pozvánka a rozpis
          </a>
        </div>
      )}

      {summary && summary.byBase.length > 0 && (
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

      {!isDemo && (
        <Suspense fallback={<p className="mt-10 text-muted">Načítám přihlášení…</p>}>
          <Participation event={event} />
        </Suspense>
      )}
    </article>
  );
}

/** Počty přihlášených a přihlášení vlastních členů. Jen pro přihlášeného uživatele. */
async function Participation({ event }: { event: ClubEvent }) {
  const session = await getSession();
  if (!session) {
    return (
      <p className="mt-10 text-sm text-muted">
        <Link href="/prihlaseni">Přihlas se</Link>, pokud chceš přihlásit sebe nebo své dítě na tuto akci.
      </p>
    );
  }
  if (session.mustChangePassword) return null;

  const [people, counts, bases] = await Promise.all([getMyMembers(session), getEventCounts(), getBases()]);
  const regs = await getMyEventRegs(people.map((p) => p.id), event.id);
  const count = counts.get(event.id) ?? { total: 0, byBase: new Map<string, number>() };
  const byBase = bases.filter((b) => count.byBase.has(b.id)).map((b) => ({ name: b.name, n: count.byBase.get(b.id)! })).sort((a, b) => b.n - a.n);

  const past = event.endsOn < todayPrague();
  let closedReason = "";
  if (past) closedReason = "Akce už proběhla.";
  else if (event.registrationOpen === false && !session.roles.includes("admin") && !session.roles.includes("moderator") && !session.isTrainer) closedReason = "Přihlašování na tuto akci je uzavřeno.";
  else if (signupClosed(session, event.startsOn)) closedReason = "Přihlášení a odhlášení je možné nejpozději 1 den před akcí.";

  const initial: Record<string, SignupReg> = Object.fromEntries(
    regs.map((r) => [r.memberId, { weightKg: r.weightKg, staysOvernight: r.staysOvernight, note: r.note }]),
  );
  const free = Math.max(0, event.capacity - count.total);

  return (
    <>
      <dl className="mt-6 grid grid-cols-[7rem_1fr] gap-y-2 text-[0.9375rem]">
        <dt className="text-muted">Přihlášeno</dt>
        <dd className="font-mono text-sm">
          {count.total} / {event.capacity} <span className="font-sans text-muted">(volných {free})</span>
        </dd>
      </dl>

      <section className="mt-10" aria-labelledby="h-prihlaska">
        <h2 id="h-prihlaska" className="label mb-3">
          Moje přihlášení
        </h2>
        {people.length === 0 ? (
          <p className="text-muted">K tvému účtu zatím není přiřazen žádný člen ani dítě. Ozvi se trenérovi nebo správci.</p>
        ) : (
          <EventSignup
            eventId={event.id}
            people={people.map((p) => ({ id: p.id, name: p.name }))}
            initial={initial}
            showWeight={event.type === "turnaj" || event.type === "mistrovstvi-klubu"}
            showOvernight={event.endsOn > event.startsOn}
            closedReason={closedReason}
          />
        )}
      </section>

      {byBase.length > 0 && (
        <section className="mt-10" aria-labelledby="h-zakl">
          <h2 id="h-zakl" className="label mb-2">
            Přihlášení podle základen
          </h2>
          <table className="tbl max-w-sm">
            <tbody>
              {byBase.map((b) => (
                <tr key={b.name}>
                  <td>{b.name}</td>
                  <td className="num">{b.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted">Jména přihlášených vidí jen trenéři a správci.</p>
        </section>
      )}
    </>
  );
}
