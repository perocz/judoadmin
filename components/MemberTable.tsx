"use client";

import { useMemo, useState, useTransition } from "react";
import { setMembership } from "@/lib/member-actions";
import type { Base, Member } from "@/lib/types";
import { CATEGORIES, MEMBERSHIP_LABEL } from "@/lib/types";

const PAGE = 50;

function norm(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export default function MemberTable({
  members,
  bases,
  editableBaseIds,
}: {
  members: Member[];
  bases: Base[];
  editableBaseIds: string[] | "all";
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const canEdit = (m: Member) => editableBaseIds === "all" || editableBaseIds.includes(m.baseId);
  const save = (m: Member, membership: Member["membership"], anyTraining: boolean) =>
    startTransition(async () => {
      const r = await setMembership(m.id, membership, anyTraining);
      setError(r.ok ? "" : (r.error ?? "Uložení se nepodařilo."));
    });
  const [q, setQ] = useState("");
  const [base, setBase] = useState("");
  const [cat, setCat] = useState("");
  const [shown, setShown] = useState(PAGE);

  const baseName = useMemo(() => new Map(bases.map((b) => [b.id, b.name])), [bases]);

  const filtered = useMemo(() => {
    const needle = norm(q.trim());
    return members.filter(
      (m) =>
        (!base || m.baseId === base) &&
        (!cat || m.category === cat) &&
        (!needle || norm(`${m.lastName} ${m.firstName}`).includes(needle)),
    );
  }, [members, q, base, cat]);

  const reset = () => setShown(PAGE);

  return (
    <div>
      <form className="grid gap-3 sm:grid-cols-[1fr_auto_auto]" role="search" onSubmit={(e) => e.preventDefault()}>
        <label className="grid gap-1">
          <span className="label">Hledat</span>
          <input
            className="field"
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              reset();
            }}
            placeholder="příjmení nebo jméno"
            autoComplete="off"
          />
        </label>
        <label className="grid gap-1">
          <span className="label">Základna</span>
          <select
            className="field"
            value={base}
            onChange={(e) => {
              setBase(e.target.value);
              reset();
            }}
          >
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
          <select
            className="field"
            value={cat}
            onChange={(e) => {
              setCat(e.target.value);
              reset();
            }}
          >
            <option value="">Všechny</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </form>

      <p className="mt-4 text-sm text-muted" aria-live="polite">
        {filtered.length} z {members.length} členů
      </p>

      {error && (
        <p className="mt-2 text-sm text-accent" role="alert">
          {error}
        </p>
      )}

      <div className="mt-2 overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>Příjmení a jméno</th>
              <th>Kat.</th>
              <th className="num pr-6">Kyu</th>
              <th className="hidden sm:table-cell">Základna</th>
              <th>Příspěvek</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, shown).map((m) => (
              <tr key={m.id}>
                <td>
                  {m.lastName} {m.firstName}
                </td>
                <td>{m.category}</td>
                <td className="num pr-6">{m.kyu}</td>
                <td className="hidden text-muted sm:table-cell">{baseName.get(m.baseId)}</td>
                <td className="whitespace-nowrap">
                  {canEdit(m) ? (
                    <span className="flex items-center gap-3">
                      <select
                        className="field py-1"
                        aria-label={`Typ příspěvku: ${m.lastName} ${m.firstName}`}
                        value={m.membership}
                        disabled={pending}
                        onChange={(e) => save(m, e.target.value as Member["membership"], m.anyTraining)}
                      >
                        <option value="standard">{MEMBERSHIP_LABEL.standard}</option>
                        <option value="unlimited">{MEMBERSHIP_LABEL.unlimited}</option>
                      </select>
                      <label className="flex items-center gap-1 text-xs text-muted">
                        <input
                          type="checkbox"
                          checked={m.anyTraining}
                          disabled={pending}
                          onChange={(e) => save(m, m.membership, e.target.checked)}
                        />
                        kamkoli
                      </label>
                    </span>
                  ) : (
                    <span>
                      {MEMBERSHIP_LABEL[m.membership]}
                      {m.anyTraining && <span className="text-muted"> · kamkoli</span>}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted">
                  Nikdo neodpovídá filtru.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > shown && (
        <button type="button" className="mt-4 border border-fg px-4 py-2 text-sm hover:border-accent hover:text-accent" onClick={() => setShown((n) => n + PAGE)}>
          Zobrazit dalších {Math.min(PAGE, filtered.length - shown)}
        </button>
      )}
    </div>
  );
}
