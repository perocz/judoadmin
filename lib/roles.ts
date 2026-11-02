import type { Role } from "./session";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Správce",
  moderator: "Moderátor",
  trainer: "Trenér",
  parent: "Rodič",
  member: "Člen",
};

/** Pořadí v přepínači a výchozí role (první, kterou uživatel má). */
export const ROLE_ORDER: Role[] = ["admin", "moderator", "trainer", "parent", "member"];

export type MenuItem = { href: string; label: string };

/**
 * Podmenu zvolené role. Odkazuje jen na stránky, které existují.
 * Další položky (správa akcí a aktualit, články základny, výsledky) přibudou s příslušnými stránkami.
 */
export function menuFor(role: Role): MenuItem[] {
  const home = { href: "/prehled", label: "Přehled" };
  // Společné všem rolím: akce klubu, žebříček a změna vlastního hesla.
  const common = [{ href: "/akce", label: "Akce" }, { href: "/zebricek", label: "Žebříček" }];
  const password = { href: "/heslo", label: "Změnit heslo" };
  switch (role) {
    case "admin":
      return [home, { href: "/clenove", label: "Členové" }, { href: "/dochazka", label: "Tréninky" }, ...common, { href: "/ucty", label: "Účty" }, password];
    case "moderator":
      return [home, ...common, password];
    case "trainer":
      return [home, { href: "/clenove", label: "Moje základna" }, { href: "/dochazka", label: "Docházka" }, { href: "/trener-treninky", label: "Tréninky" }, ...common, { href: "/ucty", label: "Účty rodičů" }, password];
    case "parent":
      return [home, { href: "/clenove", label: "Moje děti" }, { href: "/moje-treninky", label: "Tréninky" }, ...common, password];
    case "member":
      return [home, { href: "/clenove", label: "Můj profil" }, { href: "/moje-treninky", label: "Tréninky" }, ...common, password];
  }
}
