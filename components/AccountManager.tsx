"use client";

import { useState } from "react";
import { createAccount, linkChild, resetPassword, unlinkChild } from "@/lib/account-actions";
import MemberPicker, { type PickMember } from "./MemberPicker";

export type AccountRow = { id: string; username: string; fullName: string; roles: string[]; children: PickMember[] };
type Kind = "parent" | "member" | "trainer" | "moderator" | "admin";

const KIND_LABEL: Record<Kind, string> = { parent: "Rodič", member: "Člen", trainer: "Trenér", moderator: "Moderátor", admin: "Správce" };

export default function AccountManager({
  members,
  bases,
  accounts: initial,
  isAdmin,
  selfId,
}: {
  members: PickMember[];
  bases: { id: string; name: string }[];
  accounts: AccountRow[];
  isAdmin: boolean;
  /** Vlastní účet: heslo si uživatel mění sám v nabídce, ne tlačítkem Obnovit heslo. */
  selfId: string;
}) {
  const [accounts, setAccounts] = useState(initial);
  const [error, setError] = useState("");
  const [created, setCreated] = useState("");
  const [resetting, setResetting] = useState("");
  const [reset, setReset] = useState<{ id: string; username: string; password: string } | null>(null);

  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [kind, setKind] = useState<Kind>("parent");
  const [baseId, setBaseId] = useState(bases[0]?.id ?? "");
  const [level, setLevel] = useState<"head" | "regular">("head");
  const [children, setChildren] = useState<PickMember[]>([]);
  const [busy, setBusy] = useState(false);

  const kinds: Kind[] = isAdmin ? ["parent", "member", "trainer", "moderator", "admin"] : ["parent", "member"];
  const needsMembers = kind === "parent" || kind === "member";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCreated("");
    if (kind === "member" && children.length !== 1) return setError("Vyber jednoho člena, ke kterému účet patří.");
    if (kind === "parent" && children.length === 0) return setError("Přidej aspoň jedno dítě.");
    setBusy(true);
    const r = await createAccount({
      firstName: first,
      lastName: last,
      role: kind,
      baseId: kind === "trainer" && baseId ? baseId : undefined,
      level,
      memberId: kind === "member" ? children[0]?.id : undefined,
      childIds: kind === "parent" ? children.map((c) => c.id) : [],
    });
    setBusy(false);
    if (!r.ok) return setError(r.error ?? "Založení se nepodařilo.");
    setCreated(r.username!);
    setAccounts((a) => [
      { id: r.id!, username: r.username!, fullName: `${first.trim()} ${last.trim()}`, roles: [kind], children: kind === "parent" ? children : [] },
      ...a,
    ]);
    setFirst("");
    setLast("");
    setChildren([]);
  };

  const resetPw = async (acc: AccountRow) => {
    if (!window.confirm(`Obnovit heslo účtu ${acc.username}? Účet se odhlásí a dostane dočasné heslo.`)) return;
    setError("");
    setReset(null);
    setResetting(acc.id);
    const r = await resetPassword(acc.id);
    setResetting("");
    if (!r.ok || !r.password) return setError(r.error ?? "Obnovení hesla se nepodařilo.");
    setReset({ id: acc.id, username: acc.username, password: r.password });
  };

  const add = async (acc: AccountRow, m: PickMember) => {
    setError("");
    const r = await linkChild(acc.id, m.id);
    if (!r.ok) return setError(r.error ?? "Nepodařilo se.");
    setAccounts((all) => all.map((a) => (a.id === acc.id ? { ...a, children: [...a.children, m] } : a)));
  };
  const remove = async (acc: AccountRow, m: PickMember) => {
    setError("");
    const r = await unlinkChild(acc.id, m.id);
    if (!r.ok) return setError(r.error ?? "Nepodařilo se.");
    setAccounts((all) => all.map((a) => (a.id === acc.id ? { ...a, children: a.children.filter((c) => c.id !== m.id) } : a)));
  };

  return (
    <div className="space-y-10">
      {error && (
        <p className="text-sm text-accent" role="alert">
          {error}
        </p>
      )}

      <section>
        <h2 className="label mb-3">Nový účet</h2>
        <form onSubmit={submit} className="grid gap-4 sm:max-w-xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="label">Jméno</span>
              <input className="field" value={first} onChange={(e) => setFirst(e.target.value)} required autoComplete="off" />
            </label>
            <label className="grid gap-1">
              <span className="label">Příjmení</span>
              <input className="field" value={last} onChange={(e) => setLast(e.target.value)} required autoComplete="off" />
            </label>
          </div>
          <label className="grid gap-1">
            <span className="label">Druh účtu</span>
            <select
              className="field"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as Kind);
                setChildren([]);
              }}
            >
              {kinds.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          {kind === "trainer" && (
            <>
            <label className="grid gap-1">
              <span className="label">Základna</span>
              <select className="field" value={baseId} onChange={(e) => setBaseId(e.target.value)}>
                <option value="">Bez základny (trenér bez příznaku)</option>
                {bases.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            {baseId && (
              <label className="grid gap-1">
                <span className="label">Postavení na základně</span>
                <select className="field" value={level} onChange={(e) => setLevel(e.target.value as "head" | "regular")}>
                  <option value="head">Hlavní trenér</option>
                  <option value="regular">Stálý trenér</option>
                </select>
              </label>
            )}
            </>
          )}
          {needsMembers && (
            <div className="grid gap-2">
              <span className="label">{kind === "parent" ? "Děti" : "Patří k členovi"}</span>
              {children.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {children.map((c) => (
                    <li key={c.id} className="border border-line px-2 py-1 text-sm">
                      {c.name}{" "}
                      <button type="button" className="text-muted hover:text-accent" aria-label={`Odebrat ${c.name}`} onClick={() => setChildren((l) => l.filter((x) => x.id !== c.id))}>
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {(kind === "parent" || children.length === 0) && (
                <MemberPicker members={members} exclude={children.map((c) => c.id)} onPick={(m) => setChildren((l) => (kind === "member" ? [m] : [...l, m]))} />
              )}
            </div>
          )}
          <p className="text-sm text-muted">Počáteční heslo nastaví systém, při prvním přihlášení si ho uživatel musí změnit.</p>
          <div>
            <button type="submit" disabled={busy} className="border border-fg px-4 py-2 text-sm hover:border-accent hover:text-accent disabled:opacity-50">
              {busy ? "Zakládám…" : "Založit účet"}
            </button>
          </div>
          {created && (
            <p className="text-sm">
              Účet založen, uživatelské jméno: <span className="font-mono">{created}</span>
            </p>
          )}
        </form>
      </section>

      <section>
        <h2 className="label mb-3">Účty{!isAdmin ? " rodičů mé základny" : ""}</h2>
        {accounts.length === 0 ? (
          <p className="text-muted">Zatím žádné.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {accounts.map((a) => (
              <li key={a.id} className="space-y-2 py-3">
                <p>
                  {a.fullName} <span className="font-mono text-sm text-muted">{a.username}</span>{" "}
                  <span className="text-sm text-muted">· {a.roles.map((r) => KIND_LABEL[r as Kind] ?? r).join(", ")}</span>
                  {a.id !== selfId && (
                    <button
                      type="button"
                      disabled={resetting === a.id}
                      onClick={() => resetPw(a)}
                      className="ml-3 border border-line px-2 py-0.5 text-sm text-muted hover:border-accent hover:text-accent disabled:opacity-50"
                    >
                      {resetting === a.id ? "Obnovuji…" : "Obnovit heslo"}
                    </button>
                  )}
                </p>
                {reset?.id === a.id && (
                  <p className="text-sm" role="status">
                    Dočasné heslo pro <span className="font-mono">{reset.username}</span>: <span className="font-mono">{reset.password}</span>
                    <span className="text-muted"> · zobrazí se jen teď, uživatel si ho při přihlášení změní.</span>
                  </p>
                )}
                {a.roles.includes("parent") && (
                  <div className="space-y-2">
                    {a.children.length > 0 && (
                      <ul className="flex flex-wrap gap-2">
                        {a.children.map((c) => (
                          <li key={c.id} className="border border-line px-2 py-1 text-sm">
                            {c.name} <span className="text-muted">· {c.base}</span>{" "}
                            <button type="button" className="text-muted hover:text-accent" aria-label={`Odebrat ${c.name}`} onClick={() => remove(a, c)}>
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="sm:max-w-sm">
                      <MemberPicker members={members} exclude={a.children.map((c) => c.id)} onPick={(m) => add(a, m)} placeholder="přiřadit dítě" />
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
