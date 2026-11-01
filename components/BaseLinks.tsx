import { Fragment } from "react";
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
    <nav aria-label="Základna" className="text-[0.8125rem] leading-6">
      {bases.map((b, i) => {
        const active = b.id === current;
        const h = hueOf(b.name);
        return (
          <Fragment key={b.id}>
          <span className="whitespace-nowrap">
            <Link
              href={`${path}?zakladna=${b.id}`}
              aria-current={active ? "page" : undefined}
              className={`px-1 py-px no-underline ${active ? "font-medium" : "text-muted hover:text-fg"}`}
              style={active ? { background: `hsl(${h} 60% 50% / 0.18)`, borderBottom: `2px solid hsl(${h} 55% 50%)` } : undefined}
            >
              {b.name}
              {b.id === homeId && <span aria-label="moje základna"> ●</span>}
            </Link>
            {i < bases.length - 1 && (
              <span className="mx-1 text-muted/50" aria-hidden="true">
                |{" "}
              </span>
            )}
          </span>
          {" "}
          </Fragment>
        );
      })}
    </nav>
  );
}
