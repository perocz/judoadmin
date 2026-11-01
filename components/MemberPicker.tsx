"use client";

import { useMemo, useState } from "react";

export type PickMember = { id: string; name: string; base: string };

function norm(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Hledání člena podle jména; po výběru zavolá onPick. */
export default function MemberPicker({
  members,
  exclude = [],
  onPick,
  placeholder = "hledat člena",
}: {
  members: PickMember[];
  exclude?: string[];
  onPick: (m: PickMember) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const hits = useMemo(() => {
    const n = norm(q.trim());
    if (n.length < 2) return [];
    return members.filter((m) => !exclude.includes(m.id) && norm(m.name).includes(n)).slice(0, 8);
  }, [q, members, exclude]);
  return (
    <div className="relative">
      <input className="field w-full" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} autoComplete="off" />
      {hits.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full border border-line bg-bg">
          {hits.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-line"
                onClick={() => {
                  onPick(m);
                  setQ("");
                }}
              >
                {m.name} <span className="text-muted">· {m.base}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
