import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getActiveRole } from "@/lib/active-role";
import { ROLE_LABEL } from "@/lib/roles";
import { getMyUpcomingEvents } from "@/lib/events";
import { formatRange } from "@/lib/format";
import { requireSession } from "@/lib/session";
import { fmtDay, fmtTime, getMyMembers, getMyRegs, getTrainersByEvent, getTrainings, presentTrainers } from "@/lib/trainings";
import { serverClient } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Přehled" };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Načítám…</p>}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const session = await requireSession();
  const role = await getActiveRole(session);
  return (
    <div>
      <h1 className="text-2xl font-semibold">Přehled</h1>
      <p className="mt-1 text-muted">
        {session.fullName} · role {ROLE_LABEL[role].toLowerCase()}
      </p>
      <div className="mt-8">
        {role === "trainer" || role === "admin" ? <Trainer role={role} /> : role === "moderator" ? <Moderator /> : <Family />}
      </div>
    </div>
  );
}

async function Family() {
  const session = await requireSession();
  const people = await getMyMembers(session);
  if (people.length === 0) return <p className="text-muted">K tvému účtu zatím není přiřazen žádný člen ani dítě.</p>;
  const trainings = await getTrainings(0, 7, undefined);
  const regs = await getMyRegs(people.map((p) => p.id), trainings.map((t) => t.id));
  const rows = trainings
    .map((t) => ({
      t,
      names: people
        .filter((p) => {
          const r = regs.find((x) => x.eventId === t.id && x.memberId === p.id);
          return p.baseId === t.baseId ? r?.status !== "excused" : r?.status === "attending";
        })
        .map((p) => p.name),
    }))
    .filter((x) => x.names.length > 0 && x.t.status === "planned");
  return (
    <section>
      <h2 className="label mb-3">Tréninky na 7 dní</h2>
      {rows.length === 0 ? (
        <p className="text-muted">Žádné nadcházející tréninky.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {rows.map(({ t, names }) => (
            <li key={t.id} className="py-3">
              <span className="font-mono text-sm">
                {fmtDay(t.startsAt)} {fmtTime(t.startsAt)}
              </span>{" "}
              {t.baseName}: {names.join(", ")}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-sm">
        <Link href="/moje-treninky">Omluvit nebo přihlásit hosta →</Link>
      </p>
      <Events people={people} />
    </section>
  );
}

/** Nadcházející akce, na které jsou přihlášení já nebo moje děti. */
async function Events({ people }: { people: { id: string; name: string }[] }) {
  const events = await getMyUpcomingEvents(people);
  return (
    <div className="mt-10">
      <h2 className="label mb-3">Moje akce</h2>
      {events.length === 0 ? (
        <p className="text-muted">Zatím nejsi přihlášen na žádnou akci.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {events.map((e) => (
            <li key={e.eventId} className="py-3">
              <span className="font-mono text-sm">{formatRange(e.startsOn, e.endsOn)}</span>{" "}
              <Link href={`/akce/${e.eventId}`}>{e.title}</Link>
              {people.length > 1 && <span className="text-sm text-muted"> · {e.names.join(", ")}</span>}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-sm">
        <Link href="/akce">Všechny akce a přihlášení →</Link>
      </p>
    </div>
  );
}

async function Trainer({ role }: { role: "trainer" | "admin" }) {
  const session = await requireSession();
  const baseIds = role === "admin" ? undefined : session.trainerBaseIds;
  const [all, trainers] = await Promise.all([getTrainings(0, 3, baseIds), getTrainersByEvent(0, 3)]);
  const trainings = all.slice(0, 20);
  return (
    <section>
      <h2 className="label mb-3">Tréninky v příštích třech dnech</h2>
      {trainings.length === 0 ? (
        <p className="text-muted">Žádné tréninky.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {trainings.map((t) => (
            <li key={t.id} className="py-3">
              <Link href={`/dochazka/${t.id}`} className="no-underline hover:underline">
                <span className="font-mono text-sm">
                  {fmtDay(t.startsAt)} {fmtTime(t.startsAt)}
                </span>{" "}
                {t.baseName}
              </Link>
              <span className="text-sm text-muted">
                {" "}
                · přihlášeno {t.attending}, omluveno {t.excused}
              </span>
              {t.status !== "planned" && <span className="text-sm text-accent"> · zrušeno</span>}
              <p className="text-sm text-muted">Trenéři: {presentTrainers(trainers.get(t.id)) || "nikdo"}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

async function Moderator() {
  const sb = await serverClient();
  const { count } = await sb.from("posts").select("id", { count: "exact", head: true });
  return <p className="text-muted">Aktualit v systému: {count ?? 0}. Správa aktualit a akcí přibude.</p>;
}
