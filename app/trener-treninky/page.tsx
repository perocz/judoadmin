import { Suspense } from "react";
import type { Metadata } from "next";
import TrainerBoard, { type BoardDay, type BoardTraining } from "@/components/TrainerBoard";
import { requireSession } from "@/lib/session";
import { serverClient } from "@/lib/supabase-server";
import { fmtTime, getTrainersByEvent, getTrainings } from "@/lib/trainings";

export const metadata: Metadata = { title: "Tréninky" };

const TZ = "Europe/Prague";

function hueOf(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export default function Page() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Tréninky</h1>
      <p className="mt-1 text-muted">
        Hlavní a stálí trenéři jsou automaticky na všech trénincích svých základen a mohou se odhlásit. Na ostatní tréninky se zapíšeš přepínačem.
      </p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-muted">Načítám…</p>}>
          <Content />
        </Suspense>
      </div>
    </div>
  );
}

async function Content() {
  const session = await requireSession();
  if (!session.isTrainer) return <p className="text-muted">Tato stránka je pro trenéry.</p>;

  const [trainings, trainers, mine] = await Promise.all([
    getTrainings(0, 21),
    getTrainersByEvent(0, 21),
    (async () => {
      const sb = await serverClient();
      const { data } = await sb.from("trainer_attendance").select("event_id,status").eq("profile_id", session.userId);
      return new Map((data ?? []).map((r) => [r.event_id, r.status as "attending" | "excused"]));
    })(),
  ]);
  const dayKey = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: TZ });

  const items: BoardTraining[] = trainings.map((t) => {
    const who = trainers.get(t.id) ?? [];
    const me = who.find((w) => w.id === session.userId && w.kind !== "guest");
    return {
      id: t.id,
      dayKey: dayKey(t.startsAt),
      time: `${fmtTime(t.startsAt)}–${fmtTime(t.endsAt)}`,
      baseName: t.baseName,
      color: hueOf(t.baseName),
      label: t.label,
      cancelled: t.status !== "planned",
      home: session.trainerBaseIds.includes(t.baseId),
      myKind: me ? (me.kind as "head" | "regular") : "guest",
      mine: mine.get(t.id) ?? null,
      who,
    };
  });

  // Kalendář: tři týdny od pondělí aktuálního týdne
  const today = new Date();
  const todayKey = dayKey(today.toISOString());
  const dow = (new Date(`${todayKey}T12:00:00Z`).getUTCDay() + 6) % 7; // 0 = pondělí
  const days: BoardDay[] = [];
  for (let i = 0; i < 21; i++) {
    const d = new Date(`${todayKey}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - dow + i);
    const key = d.toISOString().slice(0, 10);
    days.push({
      key,
      label: `${d.getUTCDate()}. ${d.getUTCMonth() + 1}.`,
      weekdayLabel: new Intl.DateTimeFormat("cs-CZ", { weekday: "short", timeZone: "UTC" }).format(d),
      today: key === todayKey,
    });
  }
  return <TrainerBoard trainings={items} days={days} myId={session.userId} myName={session.fullName} />;
}
