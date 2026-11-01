import Link from "next/link";
import { getSession } from "@/lib/session";
import { getActiveRole } from "@/lib/active-role";
import { menuFor, ROLE_LABEL, ROLE_ORDER } from "@/lib/roles";
import RoleSwitch from "./RoleSwitch";

/** Pruh pod hlavním menu: přepínač rolí a podmenu zvolené role. Zobrazí se jen přihlášenému. */
export default async function RoleBar() {
  const session = await getSession();
  if (!session || session.mustChangePassword) return null;
  const active = await getActiveRole(session);
  const roles = ROLE_ORDER.filter((r) => session.roles.includes(r));
  return (
    <div className="border-b border-line bg-bg">
      <div className="mx-auto max-w-4xl space-y-2 px-4 py-2 text-sm">
        {roles.length > 1 && <RoleSwitch roles={roles.map((r) => ({ role: r, label: ROLE_LABEL[r] }))} active={active} />}
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
