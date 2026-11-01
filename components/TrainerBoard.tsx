"use client";

import { useState } from "react";
import { setTrainerAttendance } from "@/lib/training-actions";

export type Who = { id: string; name: string; kind: "head" | "regular" | "guest"; status: "attending" | "excused" };
export type BoardTraining = {
  id: string;
  dayKey: string;
  time: string;
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
    const others = t.who.filter((w) => w.id !== myId && w.status === "attending");
    const me = isOn(t) ? [{ id: myId, name: myName, kind: t.myKind, status: "attending" as const }] : [];
    const all = [...others, ...me];
    return { head: all.filter((w) => w.kind === "head"), rest: all.filter((w) => w.kind !== "head") };
  };

  const Switch = ({ t }: { t: BoardTraining }) => (
    <button
      type="button"
      role="switch"
      aria-checked={isOn(t)}
      aria-label={`Jsem na tréninku ${t.baseName} ${t.dayKey} ${t.time}`}
      onClick={() => toggle(t)}
      className={`relative inline-block h-6 w-11 shrink-0 rounded-full border ${isOn(t) ? "border-fg bg-fg" : "border-line bg-bg"}`}
    >
      <span className={`absolute top-0.5 h-4.5 w-4.5 rounded-full ${isOn(t) ? "right-0.5 bg-bg" : "left-0.5 bg-muted"}`} style={{ width: 18, height: 18 }} />
    </button>
  );

  const Detail = ({ t }: { t: BoardTraining }) => {
    const { head, rest } = lists(t);
    return (
      <div className="space-y-1 text-sm">
        <p>
          <span className="text-muted">Hlavní: </span>
          {head.length ? head.map((h) => h.name).join(", ") : "—"}
        </p>
        <p>
          <span className="text-muted">Další: </span>
          {rest.length ? rest.map((h) => h.name).join(", ") : "—"}
        </p>
        {!t.cancelled && (
          <div className="flex items-center gap-2 pt-1">
            <Switch t={t} />
            <span className="text-muted">{isOn(t) ? "Jsem na tréninku" : "Nejsem na tréninku"}</span>
          </div>
        )}
      </div>
    );
  };

  const mineList = trainings.filter((t) => isOn(t) && !t.cancelled);
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
          <ul className="space-y-2">
            {mineList.map((t) => (
              <li key={t.id} className="p-3" style={tint(t.color)}>
                <p>
                  <span className="font-mono text-sm">
                    {days.find((d) => d.key === t.dayKey)?.weekdayLabel} {days.find((d) => d.key === t.dayKey)?.label} {t.time}
                  </span>{" "}
                  <strong className="font-medium">{t.baseName}</strong>
                  {t.label && <span className="text-muted"> · {t.label}</span>}
                </p>
                <div className="mt-2">
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
