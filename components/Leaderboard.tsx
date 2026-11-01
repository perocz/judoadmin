"use client";

import { useMemo, useState } from "react";
import type { Base, RankingRow } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";

export default function Leaderboard({ rows, bases }: { rows: RankingRow[]; bases: Base[] }) {
  const years = useMemo(() => [...new Set(rows.map((r) => r.year))].sort((a, b) => b - a), [rows]);
  const [year, setYear] = useState(String(years[0] ?? ""));
  const [base, setBase] = useState("");
  const [cat, setCat] = useState("");
  const [mode, setMode] = useState<"soutez" | "aktivita">("soutez");

  const ranked = useMemo(() => {
    const list = rows.filter((r) => String(r.year) === year && (!base || r.baseId === base) && (!cat || r.category === cat));
    const score = (r: RankingRow) => (mode === "soutez" ? r.points : r.activityPoints);
    return list
      .filter((r) => score(r) > 0)
      .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name, "cs"))
      .map((r, i, arr) => {
        // Stejný počet bodů = stejné pořadí.
        const place = i > 0 && score(arr[i - 1]) === score(r) ? -1 : i + 1;
        return { ...r, place };
      });
  }, [rows, year, base, cat, mode]);

  // Doplníme sdílená pořadí.
  let lastPlace = 0;
  const display = ranked.map((r) => {
    if (r.place !== -1) lastPlace = r.place;
    return { ...r, place: lastPlace };
  });

  return (
    <div>
      <div role="tablist" aria-label="Typ žebříčku" className="flex gap-6 border-b border-line">
        {(
          [
            ["soutez", "Soutěže"],
            ["aktivita", "Aktivita"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mode === key}
            onClick={() => setMode(key)}
            className={`-mb-px border-b-2 pb-2 text-[0.9375rem] ${mode === key ? "border-accent font-medium" : "border-transparent text-muted hover:text-fg"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <form className="mt-5 grid gap-3 sm:grid-cols-3" onSubmit={(e) => e.preventDefault()}>
        <label className="grid gap-1">
          <span className="label">Rok</span>
          <select className="field" value={year} onChange={(e) => setYear(e.target.value)}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="label">Základna</span>
          <select className="field" value={base} onChange={(e) => setBase(e.target.value)}>
            <option value="">Všechny</option>
            {bases.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="label">Kategorie</span>
          <select className="field" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Všechny</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </form>

      <div className="mt-6 overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th className="num pr-2">#</th>
              <th>Jméno</th>
              <th>Kat.</th>
              {mode === "soutez" && (
                <>
                  <th className="num hidden sm:table-cell">Zápasy</th>
                  <th className="num hidden sm:table-cell">Výhry</th>
                </>
              )}
              <th className="num">Body</th>
            </tr>
          </thead>
          <tbody>
            {display.map((r) => (
              <tr key={r.memberId}>
                <td className="num pr-2">{r.place}.</td>
                <td>{r.name}</td>
                <td>{r.category}</td>
                {mode === "soutez" && (
                  <>
                    <td className="num hidden sm:table-cell">{r.matches}</td>
                    <td className="num hidden sm:table-cell">{r.wins}</td>
                  </>
                )}
                <td className="num font-medium">{mode === "soutez" ? r.points : r.activityPoints}</td>
              </tr>
            ))}
            {display.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted">
                  Žádné výsledky pro zvolený filtr.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">Body se berou ze zapsaných výsledků. Pravidla bodování se doplní.</p>
    </div>
  );
}
