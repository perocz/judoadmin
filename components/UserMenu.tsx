import Link from "next/link";
import { getSession } from "@/lib/session";
import { menuFor, ROLE_LABEL } from "@/lib/roles";
import { logout } from "@/lib/auth-actions";

/** Menu podle rolí přihlášeného uživatele. Čte relaci, proto se v layoutu vkládá za Suspense. */
export default async function UserMenu() {
  const session = await getSession();
  if (!session) {
    return (
      <li>
        <Link href="/prihlaseni" className="no-underline hover:underline">
          Přihlásit
        </Link>
      </li>
    );
  }
  const items = session.mustChangePassword ? [] : menuFor(session.roles);
  return (
    <>
      {items.map((i) => (
        <li key={i.href + i.label}>
          <Link href={i.href} className="no-underline hover:underline">
            {i.label}
          </Link>
        </li>
      ))}
      {session.mustChangePassword && (
        <li>
          <Link href="/heslo" className="no-underline hover:underline">
            Změnit heslo
          </Link>
        </li>
      )}
      <li className="text-muted" title={session.roles.map((r) => ROLE_LABEL[r]).join(", ")}>
        {session.fullName}
      </li>
      <li>
        <form action={logout}>
          <button type="submit" className="text-muted hover:text-accent">
            Odhlásit
          </button>
        </form>
      </li>
    </>
  );
}
