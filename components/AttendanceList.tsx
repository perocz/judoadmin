"use client";

import { useState } from "react";
import { setAbsence, setTrainingStatus } from "@/lib/training-actions";

export type Row = { id: string; name: string; guest: boolean; reg: "attending" | "excused" | null; late: boolean; absent: boolean };
type Status = "planned" | "cancelled" | "cancelled_replacement";

export default function AttendanceList({
  eventId,
  rows,
  status: initialStatus,
  otherBases,
  replacementIds,
}: {
  eventId: string;
  rows: Row[];
  status: Status;
  otherBases: { id: string; name: string }[];
  replacementIds: string[];
}) {
  const [absent, setAbsent] = useState<Record<string, boolean>>(Object.fromEntries(rows.map((r) => [r.id, r.absent])));
  const [status, setStatus] = useState<Status>(initialStatus);
  const [repl, setRepl] = useState<string[]>(replacementIds);
  const [error, setError] = useState("");

  const toggle = async (id: string) => {
    const next = !absent[id];
    setAbsent((p) => ({ ...p, [id]: next }));
    setError("");
    const r = await setAbsence(eventId, id, next);
    if (!r.ok) {
      setAbsent((p) => ({ ...p, [id]: !next }));
      setError(r.error ?? "Uložení se nepodařilo.");
    }
  };
  const changeStatus = async (next: Status) => {
    const before = status;
    setStatus(next);
    setError("");
    const r = await setTrainingStatus(eventId, next, repl);
    if (!r.ok) {
      setStatus(before);
      setError(r.error ?? "Uložení se nepodařilo.");
    }
  };
  const btn = (active: boolean) =>
    `border px-3 py-1 text-sm ${active ? "border-fg bg-fg text-bg" : "border-line text-muted hover:text-fg"}`;
  const state = (r: Row) => (r.reg === "excused" ? "excused" : absent[r.id] ? "absent" : "present");
  const order = { present: 0, absent: 1, excused: 2 } as const;
  const sorted = [...rows].sort(
    (a, b) => order[state(a)] - order[state(b)] || Number(b.guest) - Number(a.guest) || a.name.localeCompare(b.name, "cs"),
  );
  const nPresent = rows.filter((r) => state(r) === "present").length;
  const nExcused = rows.filter((r) => state(r) === "excused").length;
  const nAbsent = rows.filter((r) => state(r) === "absent").length;

  return (
    <div className="space-y-8">
      {error && (
        <p className="text-sm text-accent" role="alert">
          {error}
        </p>
      )}
      <section>
        <h2 className="label mb-2">Stav tréninku</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn(status === "planned")} onClick={() => changeStatus("planned")}>
            Probíhá
          </button>
          <button type="button" className={btn(status === "cancelled")} onClick={() => changeStatus("cancelled")}>
            Zrušen
          </button>
          <button type="button" className={btn(status === "cancelled_replacement")} onClick={() => changeStatus("cancelled_replacement")}>
            Zrušen, náhrada jinde
          </button>
        </div>
        {status === "cancelled_replacement" && (
          <fieldset className="mt-3">
            <legend className="text-sm text-muted">Kde je náhrada (uloží se při dalším kliknutí na stav)</legend>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {otherBases.map((b) => (
                <label key={b.id} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={repl.includes(b.id)}
                    onChange={(e) => {
                      const next = e.target.checked ? [...repl, b.id] : repl.filter((x) => x !== b.id);
                      setRepl(next);
                      void setTrainingStatus(eventId, "cancelled_replacement", next);
                    }}
                  />
                  {b.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </section>

      <section>
        <h2 className="label mb-1">Docházka</h2>
        <p className="mb-2 text-sm text-muted">
          Přítomno {nPresent} · omluveno {nExcused} · absence bez omluvy {nAbsent}. Všichni přihlášení jsou přítomni, zapisuje se jen absence.
        </p>
        <ul className="divide-y divide-line border-y border-line">
          {sorted.map((r) => {
            const st = state(r);
            return (
              <li key={r.id} className="flex items-center gap-2 py-1.5">
                <span className={`min-w-0 flex-1 truncate ${st === "excused" ? "text-muted" : ""} ${st === "absent" ? "line-through" : ""}`}>{r.name}</span>
                {r.guest && <span className="text-xs text-muted">host</span>}
                {st === "excused" && <span className="text-xs text-accent">omluven{r.late ? " zpětně" : ""}</span>}
                {st === "absent" && <span className="text-xs text-accent">absence</span>}
                {st !== "excused" && (
                  <button
                    type="button"
                    onClick={() => toggle(r.id)}
                    className="border border-line px-2 py-0.5 text-xs text-muted hover:border-fg hover:text-fg"
                  >
                    {st === "absent" ? "Byl tu" : "Absence"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
