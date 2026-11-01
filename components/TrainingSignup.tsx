"use client";

import { useState } from "react";
import { setRegistration } from "@/lib/training-actions";

export type TrainingView = {
  id: string;
  baseId: string;
  when: string;
  time: string;
  baseName: string;
  label: string | null;
  status: "planned" | "cancelled" | "cancelled_replacement";
  replacement: string;
  attending: number;
};
export type PersonView = { id: string; name: string; baseId: string };
type St = "attending" | "excused" | null;

export default function TrainingSignup({
  trainings,
  people,
  initial,
}: {
  trainings: TrainingView[];
  people: PersonView[];
  /** Klíč "eventId:memberId" -> stav a příznak omluvy zpětně. */
  initial: Record<string, { status: "attending" | "excused"; late: boolean }>;
}) {
  const [state, setState] = useState<Record<string, St>>(
    Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, v.status])),
  );
  const [late, setLate] = useState<Record<string, boolean>>(Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, v.late])));
  const [error, setError] = useState("");

  const set = async (eventId: string, memberId: string, next: St) => {
    const key = `${eventId}:${memberId}`;
    const before = state[key] ?? null;
    setState((s) => ({ ...s, [key]: next }));
    setError("");
    const r = await setRegistration(eventId, memberId, next);
    if (!r.ok) {
      setState((s) => ({ ...s, [key]: before }));
      setError(r.error ?? "Uložení se nepodařilo.");
    } else if (next === "excused") {
      setLate((l) => ({ ...l, [key]: false }));
    }
  };

  const btn = (active: boolean) =>
    `border px-3 py-1 text-sm ${active ? "border-fg bg-fg text-bg" : "border-line text-muted hover:text-fg"}`;

  return (
    <div>
      {error && (
        <p className="mb-3 text-sm text-accent" role="alert">
          {error}
        </p>
      )}
      <ul className="divide-y divide-line border-y border-line">
        {trainings.map((t) => {
          const cancelled = t.status !== "planned";
          return (
            <li key={t.id} className="py-3">
              <p>
                <span className="font-mono text-sm">
                  {t.when} {t.time}
                </span>{" "}
                {t.baseName}
                {t.label && <span className="text-muted"> · {t.label}</span>}
                {!cancelled && <span className="text-sm text-muted"> · přihlášeno {t.attending}</span>}
              </p>
              {cancelled ? (
                <p className="text-sm text-accent">
                  Zrušeno{t.status === "cancelled_replacement" ? (t.replacement ? `, náhrada: ${t.replacement}` : ", možná náhrada na jiné základně") : ""}
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  {people.map((p) => {
                    const st = state[`${t.id}:${p.id}`] ?? null;
                    const home = p.baseId === t.baseId;
                    return (
                      <div key={p.id} className="flex flex-wrap items-center gap-2">
                        <span className="w-40 text-sm">{p.name}</span>
                        {home ? (
                          <>
                            <span className="text-sm text-muted">{st === "excused" ? "omluven" : "přihlášen"}</span>
                            <button type="button" className={btn(st === "excused")} onClick={() => set(t.id, p.id, st === "excused" ? null : "excused")}>
                              {st === "excused" ? "Zrušit omluvu" : "Omluvit"}
                            </button>
                            {st === "excused" && late[`${t.id}:${p.id}`] && <span className="text-xs text-muted">omluveno zpětně</span>}
                          </>
                        ) : (
                          <button type="button" className={btn(st === "attending")} onClick={() => set(t.id, p.id, st === "attending" ? null : "attending")}>
                            {st === "attending" ? "Přijde jako host" : "Přijít jako host"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
