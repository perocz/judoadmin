"use client";

import { useState } from "react";
import { setAttendance, setTrainingStatus } from "@/lib/training-actions";

export type Row = { id: string; name: string; guest: boolean; reg: "attending" | "excused" | null; late: boolean; present: boolean };
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
  const [present, setPresent] = useState<Record<string, boolean>>(Object.fromEntries(rows.map((r) => [r.id, r.present])));
  const [status, setStatus] = useState<Status>(initialStatus);
  const [repl, setRepl] = useState<string[]>(replacementIds);
  const [error, setError] = useState("");

  const toggle = async (id: string) => {
    const next = !present[id];
    setPresent((p) => ({ ...p, [id]: next }));
    setError("");
    const r = await setAttendance(eventId, id, next);
    if (!r.ok) {
      setPresent((p) => ({ ...p, [id]: !next }));
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
  const sorted = [...rows].sort(
    (a, b) => Number(!!b.reg) - Number(!!a.reg) || Number(b.guest) - Number(a.guest) || a.name.localeCompare(b.name, "cs"),
  );

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
        <h2 className="label mb-2">Docházka</h2>
        <ul className="divide-y divide-line border-y border-line">
          {sorted.map((r) => (
            <li key={r.id}>
              <label className="flex cursor-pointer items-center gap-3 py-2">
                <input type="checkbox" className="h-5 w-5" checked={!!present[r.id]} onChange={() => toggle(r.id)} />
                <span>{r.name}</span>
                {r.guest && <span className="text-xs text-muted">host</span>}
                {r.reg === "attending" && <span className="text-xs text-muted">přihlášen</span>}
                {r.reg === "excused" && <span className="text-xs text-accent">omluven{r.late ? " zpětně" : ""}</span>}
              </label>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
