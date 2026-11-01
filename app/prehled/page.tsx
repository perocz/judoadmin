import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getActiveRole } from "@/lib/active-role";
import { ROLE_LABEL } from "@/lib/roles";
import { requireSession } from "@/lib/session";
import { fmtDay, fmtTime, getMyMembers, getMyRegs, getTrainings } from "@/lib/trainings";
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
  const trainings = await getTrainings(0, 7, [...new Set(people.map((p) => p.baseId))]);
  const regs = await getMyRegs(people.map((p) => p.id), trainings.map((t) => t.id));
  const mine = trainings.filter((t) => regs.some((r) => r.eventId === t.id && r.status === "attending"));
  return (
    <section>
      <h2 className="label mb-3">Přihlášené tréninky na 7 dní</h2>
      {mine.length === 0 ? (
        <p className="text-muted">Zatím nikdo není přihlášený.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {mine.map((t) => (
            <li key={t.id} className="py-3">
              <span className="font-mono text-sm">
                {fmtDay(t.startsAt)} {fmtTime(t.startsAt)}
              </span>{" "}
              {t.baseName}:{" "}
              {regs
                .filter((r) => r.eventId === t.id && r.status === "attending")
                .map((r) => people.find((p) => p.id === r.memberId)?.name)
                .join(", ")}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-sm">
        <Link href="/moje-treninky">Přihlásit nebo omluvit →</Link>
      </p>
    </section>
  );
}

async function Trainer({ role }: { role: "trainer" | "admin" }) {
  const session = await requireSession();
  const baseIds = role === "admin" ? undefined : session.trainerBaseIds;
  const trainings = (await getTrainings(0, 3, baseIds)).slice(0, 20);
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
