/**
 * Uživatelské jméno má tvar jmeno.prijmeni (malá písmena, bez diakritiky).
 * Supabase Auth přihlašuje e-mailem, proto se jméno převádí na neexistující adresu
 * v rezervované doméně .invalid (RFC 2606): nikdy na ni nic nedorazí a nikdo ji nemůže koupit.
 */
const DOMAIN = "judoadmin.invalid";

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${DOMAIN}`;
}

export function makeUsername(firstName: string, lastName: string): string {
  const clean = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  return `${clean(firstName.split(/\s+/)[0] ?? "")}.${clean(lastName.split(/\s+/)[0] ?? "")}`;
}
