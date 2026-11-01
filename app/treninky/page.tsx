import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getCancelledTrainings, getSchedule, type TrainingSlot } from "@/lib/data";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Tréninky" };

const DAYS = ["", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota", "Neděle"];

export default function TrainingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Tréninky</h1>
      <p className="mt-1 text-muted">Rozvrh tréninkových základen. Změny a zrušené tréninky jsou uvedeny níže.</p>
      <div className="mt-8 space-y-10">
        <Suspense fallback={<p className="text-muted">Načítám…</p>}>
          <Cancelled />
        </Suspense>
        <Suspense fallback={<p className="text-muted">Načítám…</p>}>
          <Schedule />
        </Suspense>
      </div>
    </div>
  );
}

async function Cancelled() {
  await connection();
  const list = await getCancelledTrainings();
  if (list.length === 0) return null;
  return (
    <section aria-labelledby="h-zruseno">
      <h2 id="h-zruseno" className="label mb-3">
        Zrušené tréninky
      </h2>
      <ul className="divide-y divide-line border-y border-line">
        {list.map((t) => (
          <li key={t.id} className="py-3">
            <span className="font-mono text-sm">
              {formatDate(t.day)} {t.startsAt}
            </span>{" "}
            {t.baseName}: zrušeno
          </li>
        ))}
      </ul>
    </section>
  );
}

async function Schedule() {
  await connection();
  const slots = await getSchedule();
  if (slots.length === 0) return <p className="text-muted">Rozvrh zatím není zadaný.</p>;
  const byBase = new Map<string, TrainingSlot[]>();
  for (const s of slots) byBase.set(s.baseName, [...(byBase.get(s.baseName) ?? []), s]);
  const bases = [...byBase.entries()].sort((a, b) => a[0].localeCompare(b[0], "cs"));
  return (
    <section aria-labelledby="h-rozvrh">
      <h2 id="h-rozvrh" className="label mb-3">
        Rozvrh podle základen
      </h2>
      <div className="divide-y divide-line border-y border-line">
        {bases.map(([name, list]) => (
          <div key={name} className="py-4">
            <h3 className="font-medium">{name}</h3>
            {list[0].venue && (
              <p className="text-sm text-muted">
                {list[0].venue}
                {list[0].address ? `, ${list[0].address}` : ""}
              </p>
            )}
            <ul className="mt-2 space-y-0.5">
              {list.map((s) => (
                <li key={s.id}>
                  <span className="inline-block w-24">{DAYS[s.weekday]}</span>
                  <span className="font-mono text-sm">
                    {s.startsAt}–{s.endsAt}
                  </span>
                  {s.label && <span className="text-muted"> · {s.label}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
