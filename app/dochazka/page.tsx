import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import BaseLinks from "@/components/BaseLinks";
import { getBases } from "@/lib/data";
import { requireSession } from "@/lib/session";
import { fmtDay, fmtTime, getTrainersByEvent, getTrainings, presentTrainers } from "@/lib/trainings";

export const metadata: Metadata = { title: "Docházka" };

export default function Page({ searchParams }: PageProps<"/dochazka">) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Docházka</h1>
      <p className="mt-1 text-muted">Tréninky za poslední týden a na týden dopředu.</p>
      <div className="mt-5">
        <Suspense fallback={<p className="text-muted">Načítám…</p>}>
          <Content searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/dochazka">["searchParams"] }) {
  const session = await requireSession();
  const isAdmin = session.roles.includes("admin");
  if (!isAdmin && session.trainerBaseIds.length === 0) return <p className="text-muted">Tato stránka je pro trenéry a správce.</p>;
  const [bases, sp] = await Promise.all([getBases(), searchParams]);
  const allowed = isAdmin ? bases : bases.filter((b) => session.trainerBaseIds.includes(b.id));
  const requested = typeof sp.zakladna === "string" ? sp.zakladna : undefined;
  const baseId = allowed.some((b) => b.id === requested) ? requested! : allowed[0].id;
  const [trainings, trainers] = await Promise.all([getTrainings(-7, 8, [baseId]), getTrainersByEvent(-7, 8)]);
  return (
    <div className="space-y-3">
      {allowed.length > 1 && <BaseLinks bases={allowed} current={baseId} path="/dochazka" />}
      {trainings.length === 0 ? (
        <p className="text-muted">Na této základně nejsou v tomto období žádné tréninky.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {trainings.map((t) => (
            <li key={t.id} className="py-3">
              <Link href={`/dochazka/${t.id}`} className="no-underline hover:underline">
                <span className="font-mono text-sm">
                  {fmtDay(t.startsAt)} {fmtTime(t.startsAt)}–{fmtTime(t.endsAt)}
                </span>{" "}
                {t.label ?? ""}
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
    </div>
  );
}
