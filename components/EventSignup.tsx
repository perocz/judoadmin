"use client";

import { useState } from "react";
import { registerForEvent, unregisterFromEvent } from "@/lib/event-actions";

export type SignupPerson = { id: string; name: string };
export type SignupReg = { weightKg: number | null; staysOvernight: boolean; note: string };

type Draft = { weight: string; overnight: boolean; note: string };

const toDraft = (r: SignupReg | undefined, defaultOvernight: boolean): Draft => ({
  weight: r?.weightKg == null ? "" : String(r.weightKg).replace(".", ","),
  overnight: r ? r.staysOvernight : defaultOvernight,
  note: r?.note ?? "",
});

export default function EventSignup({
  eventId,
  people,
  initial,
  showWeight,
  showOvernight,
  closedReason,
}: {
  eventId: string;
  people: SignupPerson[];
  /** Existující přihlášky podle id člena. */
  initial: Record<string, SignupReg>;
  showWeight: boolean;
  showOvernight: boolean;
  /** Důvod, proč se nelze přihlašovat (uzavřeno, uzávěrka); prázdné = otevřeno. */
  closedReason: string;
}) {
  const [registered, setRegistered] = useState<Record<string, boolean>>(Object.fromEntries(people.map((p) => [p.id, !!initial[p.id]])));
  const [drafts, setDrafts] = useState<Record<string, Draft>>(Object.fromEntries(people.map((p) => [p.id, toDraft(initial[p.id], showOvernight)])));
  const [busy, setBusy] = useState("");
  const [error, setError] = useState<{ id: string; text: string } | null>(null);
  const [saved, setSaved] = useState("");

  const set = (id: string, patch: Partial<Draft>) => {
    setSaved("");
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  };

  const save = async (p: SignupPerson) => {
    const d = drafts[p.id];
    let weightKg: number | null = null;
    if (showWeight && d.weight.trim()) {
      weightKg = Number(d.weight.trim().replace(",", "."));
      if (!Number.isFinite(weightKg)) return setError({ id: p.id, text: "Váhu zapiš číslem, například 32,5." });
    }
    setBusy(p.id);
    setError(null);
    const r = await registerForEvent({ eventId, memberId: p.id, weightKg, staysOvernight: showOvernight && d.overnight, note: d.note });
    setBusy("");
    if (!r.ok) return setError({ id: p.id, text: r.error ?? "Uložení se nepodařilo." });
    setRegistered((x) => ({ ...x, [p.id]: true }));
    setSaved(p.id);
  };

  const remove = async (p: SignupPerson) => {
    setBusy(p.id);
    setError(null);
    const r = await unregisterFromEvent(eventId, p.id);
    setBusy("");
    if (!r.ok) return setError({ id: p.id, text: r.error ?? "Odhlášení se nepodařilo." });
    setRegistered((x) => ({ ...x, [p.id]: false }));
    setDrafts((x) => ({ ...x, [p.id]: toDraft(undefined, showOvernight) }));
    setSaved("");
  };

  const closed = closedReason !== "";

  return (
    <ul className="divide-y divide-line border-y border-line">
      {people.map((p) => {
        const d = drafts[p.id];
        const reg = registered[p.id];
        return (
          <li key={p.id} className="space-y-3 py-4">
            <p>
              <span className="font-medium">{p.name}</span>{" "}
              <span className={`text-sm ${reg ? "text-fg" : "text-muted"}`}>· {reg ? "přihlášen" : "nepřihlášen"}</span>
            </p>
            {(!closed || reg) && (
              <div className="grid gap-3 sm:max-w-md">
                {showWeight && (
                  <label className="grid gap-1">
                    <span className="label">Váha v kg (nepovinné)</span>
                    <input className="field" inputMode="decimal" value={d.weight} onChange={(e) => set(p.id, { weight: e.target.value })} disabled={closed} autoComplete="off" />
                  </label>
                )}
                {showOvernight && (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={d.overnight} onChange={(e) => set(p.id, { overnight: e.target.checked })} disabled={closed} />
                    Zůstane přes noc
                  </label>
                )}
                <label className="grid gap-1">
                  <span className="label">Poznámka (nepovinné)</span>
                  <input className="field" value={d.note} maxLength={200} onChange={(e) => set(p.id, { note: e.target.value })} disabled={closed} placeholder="například jen v pátek" autoComplete="off" />
                </label>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {!closed && (
                <button
                  type="button"
                  disabled={busy === p.id}
                  onClick={() => save(p)}
                  className="border border-fg px-4 py-2 text-sm hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  {busy === p.id ? "Ukládám…" : reg ? "Uložit změny" : "Přihlásit"}
                </button>
              )}
              {reg && !closed && (
                <button
                  type="button"
                  disabled={busy === p.id}
                  onClick={() => remove(p)}
                  className="border border-line px-4 py-2 text-sm text-muted hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  Odhlásit
                </button>
              )}
              {saved === p.id && <span className="text-sm text-muted">Uloženo.</span>}
            </div>
            {closed && <p className="text-sm text-muted">{closedReason}</p>}
            {error?.id === p.id && (
              <p role="alert" className="text-sm text-accent">
                {error.text}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
