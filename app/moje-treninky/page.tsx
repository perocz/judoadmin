import { Suspense } from "react";
import type { Metadata } from "next";
import BaseLinks from "@/components/BaseLinks";
import TrainingSignup, { type TrainingView } from "@/components/TrainingSignup";
import { getBases } from "@/lib/data";
import { requireSession } from "@/lib/session";
import { fmtDay, fmtTime, getMyMembers, getMyRegs, getTrainings } from "@/lib/trainings";

export const metadata: Metadata = { title: "Přihlášky na tréninky" };

export default function Page({ searchParams }: PageProps<"/moje-treninky">) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Přihlášky na tréninky</h1>
      <p className="mt-1 text-muted">
        Na tréninky své základny jsou členové přihlášeni automaticky, stačí je případně omluvit (i zpětně). Na jinou základnu se lze přihlásit jako host do hodiny před tréninkem.
      </p>
      <div className="mt-5">
        <Suspense fallback={<p className="text-muted">Načítám…</p>}>
          <Content searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/moje-treninky">["searchParams"] }) {
  const session = await requireSession();
  const [people, bases, sp] = await Promise.all([getMyMembers(session), getBases(), searchParams]);
  if (people.length === 0) {
    return <p className="text-muted">K tvému účtu zatím není přiřazen žádný člen ani dítě. Ozvi se správci.</p>;
  }
  const requested = typeof sp.zakladna === "string" ? sp.zakladna : undefined;
  const baseId = bases.some((b) => b.id === requested) ? requested! : people[0].baseId;
  const trainings = await getTrainings(0, 14, [baseId]);
  const regs = await getMyRegs(people.map((p) => p.id), trainings.map((t) => t.id));
  const nameOf = new Map(bases.map((b) => [b.id, b.name]));
  const views: TrainingView[] = trainings.map((t) => ({
    id: t.id,
    baseId: t.baseId,
    when: fmtDay(t.startsAt),
    time: `${fmtTime(t.startsAt)}–${fmtTime(t.endsAt)}`,
    baseName: t.baseName,
    label: t.label,
    status: t.status,
    replacement: t.replacementBaseIds.map((id) => nameOf.get(id) ?? "").filter(Boolean).join(", "),
    attending: t.attending,
  }));
  const initial = Object.fromEntries(regs.map((r) => [`${r.eventId}:${r.memberId}`, { status: r.status, late: r.lateExcuse }]));
  return (
    <div className="space-y-3">
      <BaseLinks bases={bases} current={baseId} path="/moje-treninky" homeId={people[0].baseId} />
      {views.length === 0 ? (
        <p className="text-muted">Na této základně není v nejbližších 14 dnech žádný trénink.</p>
      ) : (
        <TrainingSignup trainings={views} people={people.map((p) => ({ id: p.id, name: p.name, baseId: p.baseId }))} initial={initial} />
      )}
    </div>
  );
}
