import Link from "next/link";
import { getSession } from "@/lib/session";
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
  return (
    <>
      {session.mustChangePassword && (
        <li>
          <Link href="/heslo" className="no-underline hover:underline">
            Změnit heslo
          </Link>
        </li>
      )}
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
