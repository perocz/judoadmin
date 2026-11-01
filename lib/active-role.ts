import "server-only";
import { cookies } from "next/headers";
import { ROLE_ORDER } from "./roles";
import type { Role, Session } from "./session";

export const ROLE_COOKIE = "role";

/** Zvolená role: z cookie, pokud ji uživatel má, jinak první podle pořadí. Čte cookies, patří za Suspense. */
export async function getActiveRole(session: Session): Promise<Role> {
  const c = (await cookies()).get(ROLE_COOKIE)?.value as Role | undefined;
  if (c && session.roles.includes(c)) return c;
  return ROLE_ORDER.find((r) => session.roles.includes(r)) ?? "member";
}
