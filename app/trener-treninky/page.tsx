import { Suspense } from "react";
import type { Metadata } from "next";
import TrainerSignup, { type TrainerTrainingView } from "@/components/TrainerSignup";
import { getBases } from "@/lib/data";
import { requireSession } from "@/lib/session";
import { serverClient } from "@/lib/supabase-server";
import { fmtDay, fmtTime, getTrainersByEvent, getTrainings, presentTrainers } from "@/lib/trainings";

export const metadata: Metadata = { title: "Moje tréninky" };

export default function Page({ searchParams }: PageProps<"/trener-treninky">) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Moje tréninky</h1>
      <p className="mt-1 text-muted">
        Jsi automaticky na všech trénincích své základny a můžeš se odhlásit. Na trénink jiné základny se můžeš přihlásit jako trenér.
      </p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-muted">Načítám…</p>}>
          <Content searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/trener-treninky">["searchParams"] }) {
  const session = await requireSession();
  if (session.trainerBaseIds.length === 0) return <p className="text-muted">Tato stránka je pro trenéry.</p>;
  const [bases, sp] = await Promise.all([getBases(), searchParams]);
  const requested = typeof sp.zakladna === "string" ? sp.zakladna : undefined;
  const baseId = bases.some((b) => b.id === requested) ? requested! : session.trainerBaseIds[0];
  const [trainings, trainers, mine] = await Promise.all([getTrainings(0, 14, [baseId]), getTrainersByEvent(0, 14), (async () => {
    const sb = await serverClient();
    const { data } = await sb.from("trainer_attendance").select("event_id,status").eq("profile_id", session.userId);
    return new Map((data ?? []).map((r) => [r.event_id, r.status as "attending" | "excused"]));
  })()]);
  const views: TrainerTrainingView[] = trainings.map((t) => ({
    id: t.id,
    when: fmtDay(t.startsAt),
    time: `${fmtTime(t.startsAt)}–${fmtTime(t.endsAt)}`,
    baseName: t.baseName,
    label: t.label,
    home: session.trainerBaseIds.includes(t.baseId),
    cancelled: t.status !== "planned",
    mine: mine.get(t.id) ?? null,
    others: presentTrainers(trainers.get(t.id)?.filter((x) => x.id !== session.userId)),
  }));
  return (
    <div className="space-y-6">
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1">
          <span className="label">Základna</span>
          <select className="field" name="zakladna" defaultValue={baseId}>
            {bases.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="border border-fg px-4 py-2 text-sm hover:border-accent hover:text-accent">
          Zobrazit
        </button>
      </form>
      {views.length === 0 ? <p className="text-muted">Na této základně není v nejbližších 14 dnech žádný trénink.</p> : <TrainerSignup trainings={views} />}
    </div>
  );
}
