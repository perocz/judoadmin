import Link from "next/link";
import { getSession } from "@/lib/session";
import { getActiveRole } from "@/lib/active-role";
import { menuFor, ROLE_LABEL, ROLE_ORDER } from "@/lib/roles";
import { setRole } from "@/lib/role-actions";

/** Pruh pod hlavním menu: přepínač rolí a podmenu zvolené role. Zobrazí se jen přihlášenému. */
export default async function RoleBar() {
  const session = await getSession();
  if (!session || session.mustChangePassword) return null;
  const active = await getActiveRole(session);
  const roles = ROLE_ORDER.filter((r) => session.roles.includes(r));
  return (
    <div className="border-b border-line bg-bg">
      <div className="mx-auto max-w-4xl space-y-2 px-4 py-2 text-sm">
        {roles.length > 1 && (
          <form action={setRole} className="flex flex-wrap items-center gap-x-1 gap-y-1" aria-label="Přepínač rolí">
            <span className="mr-2 text-xs uppercase tracking-wider text-muted">Role</span>
            {roles.map((r) => (
              <button
                key={r}
                type="submit"
                name="role"
                value={r}
                aria-pressed={r === active}
                className={`px-2.5 py-0.5 ${r === active ? "bg-fg text-bg" : "text-muted hover:text-fg"}`}
              >
                {ROLE_LABEL[r]}
              </button>
            ))}
          </form>
        )}
        <nav aria-label={`Menu role ${ROLE_LABEL[active]}`}>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {menuFor(active).map((i) => (
              <li key={i.href + i.label}>
                <Link href={i.href} className="no-underline hover:underline">
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
