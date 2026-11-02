import WeightEditor from "@/components/WeightEditor";
import PhotoEditor from "@/components/PhotoEditor";
import { formatDate } from "@/lib/format";
import type { Card } from "@/lib/profile";

/** Karta člena: fotka a přehledně údaje o osobě. */
export default function MemberCard({ card }: { card: Card }) {
  const rows: [string, string][] = [
    ["Základna", card.baseName],
    ["Kategorie", card.category],
    ["Stupeň (kyu)", card.kyu === null ? "–" : String(card.kyu).replace(".", ",")],
    ["Členství", card.membership],
    ["Rok narození", card.birthYear ? String(card.birthYear) : "–"],
    ["Členem od", card.joinedOn ? formatDate(card.joinedOn) : "–"],
  ];
  return (
    <article className="flex flex-col gap-6 border border-line p-5 sm:flex-row sm:gap-8">
      <PhotoEditor memberId={card.id} name={card.name} initialUrl={card.photoUrl} />
      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-semibold">{card.name}</h2>
        <dl className="mt-4 grid grid-cols-[8rem_1fr] gap-y-2 text-[0.9375rem]">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <WeightEditor memberId={card.id} initialKg={card.weightKg} updatedOn={card.weightUpdatedOn} />
      </div>
    </article>
  );
}
