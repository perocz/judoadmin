import Link from "next/link";

/** Odstín základny z jejího jména, stejný všude v aplikaci. */
export function hueOf(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

/** Výběr základny jako řada odkazů oddělených svislítkem; zvolená je zvýrazněná světlým odstínem. */
export default function BaseLinks({
  bases,
  current,
  path,
  homeId,
}: {
  bases: { id: string; name: string }[];
  current: string;
  path: string;
  /** Základna uživatele, označí se tečkou. */
  homeId?: string;
}) {
  return (
    <nav aria-label="Základna" className="text-sm">
      <ul className="flex flex-wrap items-center gap-y-1">
        {bases.map((b, i) => {
          const active = b.id === current;
          const h = hueOf(b.name);
          return (
            <li key={b.id} className="flex items-center">
              {i > 0 && (
                <span className="px-2 text-line" aria-hidden="true">
                  |
                </span>
              )}
              <Link
                href={`${path}?zakladna=${b.id}`}
                aria-current={active ? "page" : undefined}
                className={`px-1.5 py-0.5 no-underline ${active ? "font-medium" : "text-muted hover:text-fg"}`}
                style={active ? { background: `hsl(${h} 60% 50% / 0.18)`, borderBottom: `2px solid hsl(${h} 55% 50%)` } : undefined}
              >
                {b.name}
                {b.id === homeId && <span aria-label="moje základna"> ●</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
