"use client";

import { useState } from "react";
import Link from "next/link";
import { setTrainerAttendance } from "@/lib/training-actions";

export type Who = { id: string; name: string; kind: "head" | "regular" | "guest"; status: "attending" | "excused" };
export type BoardTraining = {
  id: string;
  dayKey: string;
  /** Např. „po 2. 11.“ */
  dayLabel: string;
  time: string;
  attending: number;
  excused: number;
  baseName: string;
  color: number; // odstín základny (hue)
  label: string | null;
  cancelled: boolean;
  /** Je to trénink základny, kde jsem hlavní nebo stálý trenér (jsem na něm automaticky). */
  home: boolean;
  /** Jak se na tréninku zapisuji: hlavní/stálý/host. */
  myKind: "head" | "regular" | "guest";
  mine: "attending" | "excused" | null;
  who: Who[];
};
export type BoardDay = { key: string; label: string; weekdayLabel: string; today: boolean };

const tint = (h: number) => ({ borderLeft: `4px solid hsl(${h} 55% 50%)`, background: `hsl(${h} 60% 50% / 0.10)` });

export default function TrainerBoard({
  trainings,
  days,
  myId,
  myName,
}: {
  trainings: BoardTraining[];
  days: BoardDay[];
  myId: string;
  myName: string;
}) {
  const [mine, setMine] = useState<Record<string, "attending" | "excused" | null>>(Object.fromEntries(trainings.map((t) => [t.id, t.mine])));
  const [error, setError] = useState("");

  const isOn = (t: BoardTraining) => (t.home ? mine[t.id] !== "excused" : mine[t.id] === "attending");

  const toggle = async (t: BoardTraining) => {
    const before = mine[t.id];
    const next = isOn(t) ? (t.home ? "excused" : null) : t.home ? null : "attending";
    setMine((m) => ({ ...m, [t.id]: next }));
    setError("");
    const r = await setTrainerAttendance(t.id, next);
    if (!r.ok) {
      setMine((m) => ({ ...m, [t.id]: before }));
      setError(r.error ?? "Uložení se nepodařilo.");
    }
  };

  /** Hlavní trenéři a ostatní přihlášení; já se počítám podle aktuálního přepínače. */
  const lists = (t: BoardTraining) => {
    const seen = new Set<string>();
    const others = t.who.filter((w) => {
      if (w.id === myId || w.status !== "attending" || seen.has(w.id)) return false;
      seen.add(w.id);
      return true;
    });
    const me = isOn(t) ? [{ id: myId, name: myName, kind: t.myKind, status: "attending" as const }] : [];
    const all = [...others, ...me];
    return { head: all.filter((w) => w.kind === "head"), rest: all.filter((w) => w.kind !== "head") };
  };

  const Toggle = ({ t }: { t: BoardTraining }) => (
    <button
      type="button"
      aria-pressed={isOn(t)}
      onClick={() => toggle(t)}
      className={`shrink-0 border px-2 py-0.5 text-xs ${isOn(t) ? "border-fg bg-fg text-bg" : "border-line text-muted hover:border-fg hover:text-fg"}`}
    >
      {isOn(t) ? "✓ Jsem tam" : "Nejsem tam"}
    </button>
  );

  const Detail = ({ t }: { t: BoardTraining }) => {
    const { head, rest } = lists(t);
    return (
      <div className="space-y-0.5 text-sm">
        <p className="text-muted">
          Hlavní: <span className="text-fg">{head.length ? head.map((h) => h.name).join(", ") : "—"}</span>
          {" · "}Další: <span className="text-fg">{rest.length ? rest.map((h) => h.name).join(", ") : "—"}</span>
        </p>
        <div className="flex items-center justify-between gap-2">
          <p className="text-muted">
            {t.attending} cvičenců{t.excused > 0 ? `, ${t.excused} omluveno` : ""}
            {t.home && (
              <>
                {" · "}
                <Link href={`/dochazka/${t.id}`}>Docházka →</Link>
              </>
            )}
          </p>
          {t.cancelled ? <span className="text-xs text-accent">zrušeno</span> : <Toggle t={t} />}
        </div>
      </div>
    );
  };

  // Tréninky mé základny zůstávají nahoře i po odhlášení (informace o tréninku se neztrácí).
  const mineList = trainings.filter((t) => t.home || (isOn(t) && !t.cancelled));
  const byDay = new Map<string, BoardTraining[]>();
  for (const t of trainings) byDay.set(t.dayKey, [...(byDay.get(t.dayKey) ?? []), t]);
  const weeks: BoardDay[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div className="space-y-10">
      {error && (
        <p className="text-sm text-accent" role="alert">
          {error}
        </p>
      )}

      <section aria-labelledby="h-moje">
        <h2 id="h-moje" className="label mb-3">
          Tréninky, kde jsem zapsán
        </h2>
        {mineList.length === 0 ? (
          <p className="text-muted">Zatím nejsi zapsán na žádný trénink.</p>
        ) : (
          <ul className="space-y-1.5">
            {mineList.map((t) => (
              <li key={t.id} className={`px-3 py-2 ${isOn(t) || t.cancelled ? "" : "opacity-60"}`} style={tint(t.color)}>
                <p className="text-sm">
                  <span className="font-mono">
                    {t.dayLabel} {t.time.slice(0, 5)}
                  </span>{" "}
                  <strong className="font-medium">{t.baseName}</strong>
                  {t.label && <span className="hidden text-muted sm:inline"> · {t.label}</span>}
                </p>
                <div className="mt-1">
                  <Detail t={t} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <hr className="border-line" />

      <section aria-labelledby="h-vsechny">
        <h2 id="h-vsechny" className="label mb-3">
          Všechny tréninky
        </h2>
        <div className="space-y-6">
          {weeks.map((week) => (
            <div key={week[0].key} className="grid gap-px border border-line bg-line sm:grid-cols-7">
              {week.map((d) => (
                <div key={d.key} className={`min-h-16 bg-bg p-1.5 ${d.today ? "outline outline-1 -outline-offset-1 outline-fg" : ""}`}>
                  <p className="mb-1 text-xs text-muted">
                    {d.weekdayLabel} {d.label}
                  </p>
                  <ul className="space-y-1">
                    {(byDay.get(d.key) ?? []).map((t) => (
                      <li key={t.id} style={tint(t.color)} className="text-xs">
                        <details className="group">
                          <summary className="cursor-pointer list-none px-1.5 py-1">
                            <span className="font-mono">{t.time.slice(0, 5)}</span> {t.baseName}
                            {t.cancelled && <span className="text-accent"> · zrušeno</span>}
                            {isOn(t) && !t.cancelled && <span aria-label="jsem zapsán"> ●</span>}
                          </summary>
                          <div className="px-1.5 pb-2">
                            {t.label && <p className="mb-1 text-muted">{t.label}</p>}
                            <Detail t={t} />
                          </div>
                        </details>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
