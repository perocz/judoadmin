"use client";

import { useState } from "react";
import { setTrainerAttendance } from "@/lib/training-actions";

export type TrainerTrainingView = {
  id: string;
  when: string;
  time: string;
  baseName: string;
  label: string | null;
  home: boolean;
  cancelled: boolean;
  /** Moje účast: "attending" | "excused" | null (výchozí). */
  mine: "attending" | "excused" | null;
  others: string;
};

export default function TrainerSignup({ trainings }: { trainings: TrainerTrainingView[] }) {
  const [mine, setMine] = useState<Record<string, "attending" | "excused" | null>>(Object.fromEntries(trainings.map((t) => [t.id, t.mine])));
  const [error, setError] = useState("");

  const set = async (id: string, next: "attending" | "excused" | null) => {
    const before = mine[id];
    setMine((m) => ({ ...m, [id]: next }));
    setError("");
    const r = await setTrainerAttendance(id, next);
    if (!r.ok) {
      setMine((m) => ({ ...m, [id]: before }));
      setError(r.error ?? "Uložení se nepodařilo.");
    }
  };
  const btn = "border border-line px-3 py-1 text-sm text-muted hover:text-fg";

  return (
    <div>
      {error && (
        <p className="mb-3 text-sm text-accent" role="alert">
          {error}
        </p>
      )}
      <ul className="divide-y divide-line border-y border-line">
        {trainings.map((t) => {
          const m = mine[t.id];
          const on = t.home ? m !== "excused" : m === "attending";
          return (
            <li key={t.id} className="py-3">
              <p>
                <span className="font-mono text-sm">
                  {t.when} {t.time}
                </span>{" "}
                {t.baseName}
                {t.label && <span className="text-muted"> · {t.label}</span>}
                {t.cancelled && <span className="text-sm text-accent"> · zrušeno</span>}
              </p>
              {!t.cancelled && (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="text-sm">{on ? "Jsi na tréninku" : t.home ? "Odhlášen" : "Nejsi přihlášen"}</span>
                  {t.home ? (
                    <button type="button" className={btn} onClick={() => set(t.id, on ? "excused" : null)}>
                      {on ? "Odhlásit se" : "Zrušit odhlášení"}
                    </button>
                  ) : (
                    <button type="button" className={btn} onClick={() => set(t.id, on ? null : "attending")}>
                      {on ? "Odhlásit se" : "Přijít jako trenér"}
                    </button>
                  )}
                  {t.others && <span className="text-sm text-muted">Trenéři: {t.others}</span>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
