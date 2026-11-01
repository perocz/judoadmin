"use client";

import { useMemo, useState } from "react";
import { setMembership } from "@/lib/member-actions";
import type { Base, Member } from "@/lib/types";
import { CATEGORIES, MEMBERSHIP_LABEL, MEMBERSHIPS } from "@/lib/types";


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
  const [overrides, setOverrides] = useState<Record<string, Member["membership"]>>({});
  const [error, setError] = useState("");
  const canEdit = (m: Member) => editableBaseIds === "all" || editableBaseIds.includes(m.baseId);
  const typeOf = (m: Member) => overrides[m.id] ?? m.membership;
  // Změna se ukáže hned, uložení běží na pozadí; při chybě se vrátí.
  const save = async (m: Member, value: Member["membership"]) => {
    const before = typeOf(m);
    setOverrides((o) => ({ ...o, [m.id]: value }));
    setError("");
    const r = await setMembership(m.id, value);
    if (!r.ok) {
      setOverrides((o) => ({ ...o, [m.id]: before }));
      setError(r.error ?? "Uložení se nepodařilo.");
    }
  };
  const [q, setQ] = useState("");
  const [base, setBase] = useState("");
  const [cat, setCat] = useState("");
  const [inactive, setInactive] = useState(false);

  const baseName = useMemo(() => new Map(bases.map((b) => [b.id, b.name])), [bases]);

  const filtered = useMemo(() => {
    const needle = norm(q.trim());
    return members.filter(
      (m) =>
        (!base || m.baseId === base) &&
        (!cat || m.category === cat) &&
        (inactive || (overrides[m.id] ?? m.membership) !== "neaktivni") &&
        (!needle || norm(`${m.lastName} ${m.firstName}`).includes(needle)),
    );
  }, [members, q, base, cat, inactive, overrides]);

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

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={inactive}
          onChange={(e) => {
            setInactive(e.target.checked);
          }}
        />
        Zobrazit neaktivní
      </label>

      <p className="mt-2 text-sm text-muted" aria-live="polite">
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
              <th>Členství</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id}>
                <td>
                  {m.lastName} {m.firstName}
                </td>
                <td>{m.category}</td>
                <td className="num pr-6">{m.kyu}</td>
                <td className="hidden text-muted sm:table-cell">{baseName.get(m.baseId)}</td>
                <td className="whitespace-nowrap">
                  {canEdit(m) ? (
                    <span className="inline-flex border border-line text-sm" role="group" aria-label={`Členství: ${m.lastName} ${m.firstName}`}>
                      {MEMBERSHIPS.map((v) => (
                        <button
                          key={v}
                          type="button"
                          aria-pressed={typeOf(m) === v}
                          onClick={() => typeOf(m) !== v && save(m, v)}
                          className={`px-3 py-1 ${typeOf(m) === v ? "bg-fg text-bg" : "text-muted hover:text-fg"}`}
                        >
                          {MEMBERSHIP_LABEL[v]}
                        </button>
                      ))}
                    </span>
                  ) : (
                    <span>{MEMBERSHIP_LABEL[typeOf(m)]}</span>
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
    </div>
  );
}
