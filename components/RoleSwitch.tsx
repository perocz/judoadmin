"use client";

import { useOptimistic, useTransition } from "react";
import { setRole } from "@/lib/role-actions";

/** Přepínač rolí: tlačítko se přepne ihned, stránka se doplní, jakmile odpoví server. */
export default function RoleSwitch({ roles, active }: { roles: { role: string; label: string }[]; active: string }) {
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(active);
  const choose = (role: string) => {
    if (role === shown) return;
    const fd = new FormData();
    fd.set("role", role);
    startTransition(async () => {
      setShown(role);
      await setRole(fd);
    });
  };
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1" role="group" aria-label="Přepínač rolí" aria-busy={pending}>
      <span className="mr-2 text-xs uppercase tracking-wider text-muted">Role</span>
      {roles.map((r) => (
        <button
          key={r.role}
          type="button"
          onClick={() => choose(r.role)}
          aria-pressed={r.role === shown}
          className={`px-2.5 py-0.5 ${r.role === shown ? "bg-fg text-bg" : "text-muted hover:text-fg"} ${pending && r.role !== shown ? "opacity-60" : ""}`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
