import type { Role } from "./session";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Správce",
  moderator: "Moderátor",
  trainer: "Trenér",
  parent: "Rodič",
  member: "Člen",
};

export type MenuItem = { href: string; label: string };

/**
 * Menu podle rolí. Odkazuje jen na stránky, které existují.
 * Další položky (správa akcí a aktualit, články základny, výsledky) přibudou s příslušnými stránkami.
 */
export function menuFor(roles: Role[]): MenuItem[] {
  const items: MenuItem[] = [];
  const add = (item: MenuItem) => {
    if (!items.some((i) => i.href === item.href)) items.push(item);
  };
  if (roles.includes("admin")) add({ href: "/clenove", label: "Členové" });
  if (roles.includes("trainer")) add({ href: "/clenove", label: "Moje základna" });
  if (roles.includes("parent")) add({ href: "/clenove", label: "Moje děti" });
  if (roles.includes("member")) add({ href: "/clenove", label: "Můj profil" });
  return items;
}
