"use client";

import { useState } from "react";
import { setMemberWeight } from "@/lib/photo-actions";
import { formatDate } from "@/lib/format";

export default function WeightEditor({ memberId, initialKg, updatedOn }: { memberId: string; initialKg: number | null; updatedOn: string | null }) {
  const [value, setValue] = useState(initialKg === null ? "" : String(initialKg).replace(".", ","));
  const [saved, setSaved] = useState<{ kg: number | null; on: string | null }>({ kg: initialKg, on: updatedOn });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    const text = value.trim().replace(",", ".");
    const kg = text === "" ? null : Number(text);
    if (kg !== null && (!Number.isFinite(kg) || kg < 10 || kg > 200)) return setError("Váhu zapiš v kg mezi 10 a 200, například 32,5.");
    setBusy(true);
    setError("");
    const r = await setMemberWeight(memberId, kg);
    setBusy(false);
    if (!r.ok) return setError(r.error ?? "Uložení se nepodařilo.");
    setSaved({ kg, on: kg === null ? null : new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Prague" }) });
  };

  const changed = value.trim().replace(",", ".") !== (saved.kg === null ? "" : String(saved.kg));
  return (
    <div className="mt-6 border-t border-line pt-4">
      <label className="grid max-w-xs gap-1">
        <span className="label">Moje váha (kg)</span>
        <span className="flex gap-2">
          <input className="field w-28" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" aria-label="Váha v kg" />
          <button type="button" disabled={busy || !changed} onClick={save} className="border border-fg px-4 py-2 text-sm hover:border-accent hover:text-accent disabled:opacity-50">
            {busy ? "Ukládám…" : "Uložit"}
          </button>
        </span>
      </label>
      {saved.on && !changed && <p className="mt-1 text-xs text-muted">Naposledy upraveno {formatDate(saved.on)}.</p>}
      {error && (
        <p role="alert" className="mt-1 text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  );
}
