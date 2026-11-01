/**
 * Demo data. Všechna jména jsou smyšlená, nejde o skutečné členy klubu.
 * Skutečná data patří do databáze (viz supabase/schema.sql), nikdy do repozitáře.
 */
import {
  ACTIVITY_TYPES,
  type Base,
  type Category,
  type ClubEvent,
  type Member,
  type Post,
  type Registration,
  type Result,
} from "./types";

export const bases: Base[] = [
  "Brušperk",
  "Dobrá",
  "Dolní Domaslavice",
  "Fryčovice",
  "Frýdek-Místek",
  "Frýdlant nad Ostravicí",
  "Hnojník",
  "Komorní Lhotka",
  "Morávka",
  "Nošovice",
  "Palkovice",
  "Raškovice",
  "Řepiště",
  "Střítěž",
].map((name, i) => ({ id: `b${i + 1}`, name }));

// Deterministický generátor, aby demo data byla při každém buildu stejná.
function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const rnd = lcg(20261101);
const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];

/** [mužský tvar, ženský tvar] */
const lastNames: [string, string][] = [
  ["Havlík", "Havlíková"], ["Dvořáček", "Dvořáčková"], ["Kolář", "Kolářová"],
  ["Marek", "Marková"], ["Němeček", "Němečková"], ["Kratochvíl", "Kratochvílová"],
  ["Doležal", "Doležalová"], ["Beran", "Beranová"], ["Soukup", "Soukupová"],
  ["Vlček", "Vlčková"], ["Matoušek", "Matoušková"], ["Hruška", "Hrušková"],
  ["Pavlík", "Pavlíková"], ["Straka", "Straková"], ["Šimek", "Šimková"],
  ["Zelenka", "Zelenková"], ["Holub", "Holubová"], ["Bureš", "Burešová"],
  ["Kos", "Kosová"], ["Fiala", "Fialová"],
];
const maleFirst = ["Adam", "Jakub", "Matěj", "Filip", "Tomáš", "Ondřej", "Vojtěch", "Daniel", "Lukáš", "David"];
const femaleFirst = ["Eliška", "Tereza", "Anna", "Nela", "Klára", "Adéla", "Sára", "Lucie", "Barbora", "Julie"];

const catAge: Record<Category, [number, number]> = {
  U8: [5, 7],
  U10: [8, 9],
  U12: [10, 11],
  U14: [12, 13],
  U16: [14, 15],
  U18: [16, 17],
  Dospělí: [18, 30],
};
const catList = Object.keys(catAge) as Category[];

export const members: Member[] = Array.from({ length: 60 }, (_, i) => {
  const category = catList[Math.floor(rnd() * catList.length)];
  const female = rnd() < 0.45;
  const [lastM, lastF] = pick(lastNames);
  const [lo, hi] = catAge[category];
  const age = lo + Math.floor(rnd() * (hi - lo + 1));
  return {
    id: `m${i + 1}`,
    lastName: female ? lastF : lastM,
    firstName: pick(female ? femaleFirst : maleFirst),
    birthYear: 2026 - age,
    category,
    kyu: category === "Dospělí" ? 4 + Math.floor(rnd() * 3) : category === "U18" || category === "U16" ? 5 + Math.floor(rnd() * 2) : 6,
    baseId: pick(bases).id,
    membership: "standard" as const,
    anyTraining: false,
  };
}).sort((a, b) => a.lastName.localeCompare(b.lastName, "cs") || a.firstName.localeCompare(b.firstName, "cs"));

export const events: ClubEvent[] = [
  { id: "e1", title: "22. Přespávačka", type: "prespavacka", startsOn: "2026-11-06", endsOn: "2026-11-07", capacity: 100, description: "Trénink a přespání v hale. Rozpis v pozvánce.", documentUrl: "#" },
  { id: "e2", title: "MT Sosnowiec", type: "turnaj", startsOn: "2026-11-08", endsOn: "2026-11-08", city: "Sosnowiec", capacity: 100, description: "Mezinárodní turnaj, sraz dle propozic." },
  { id: "e3", title: "23. Přespávačka", type: "prespavacka", startsOn: "2026-11-13", endsOn: "2026-11-14", capacity: 100, documentUrl: "#" },
  { id: "e4", title: "MVC Martin", type: "turnaj", startsOn: "2026-11-14", endsOn: "2026-11-14", city: "Martin", capacity: 100 },
  { id: "e5", title: "4. kolo Mistrovství klubu", type: "mistrovstvi-klubu", startsOn: "2026-11-22", endsOn: "2026-11-22", capacity: 150, description: "Domácí soutěž pro začátečníky." },
  { id: "e6", title: "24. Přespávačka", type: "prespavacka", startsOn: "2026-11-27", endsOn: "2026-11-28", capacity: 100 },
  { id: "e7", title: "Mikulášská přespávačka", type: "prespavacka", startsOn: "2026-12-04", endsOn: "2026-12-05", capacity: 100 },
  { id: "e8", title: "Hornoslezský pohár Orlová", type: "turnaj", startsOn: "2026-12-12", endsOn: "2026-12-12", city: "Orlová", capacity: 100 },
  { id: "e0a", title: "Turnaj Sosnowiec", type: "turnaj", startsOn: "2026-10-11", endsOn: "2026-10-11", city: "Sosnowiec", capacity: 100 },
  { id: "e0b", title: "VC Ostrava", type: "turnaj", startsOn: "2026-09-28", endsOn: "2026-09-28", city: "Ostrava", capacity: 100 },
  { id: "e0c", title: "19. Přespávačka", type: "prespavacka", startsOn: "2026-09-19", endsOn: "2026-09-20", capacity: 100 },
];

export const registrations: Registration[] = events
  .filter((e) => e.startsOn >= "2026-11-01")
  .flatMap((e) =>
    members
      .filter(() => rnd() < (e.type === "prespavacka" ? 0.3 : 0.12))
      .map((m) => ({ eventId: e.id, memberId: m.id })),
  );

// Body v demo datech jsou orientační, ne podle skutečného bodovacího systému.
export const results: Result[] = events
  .filter((e) => e.startsOn < "2026-11-01")
  .flatMap((e) =>
    members
      .filter(() => rnd() < 0.35)
      .map((m, idx) => {
        const isActivity = ACTIVITY_TYPES.includes(e.type);
        const placement = isActivity ? null : 1 + Math.floor(rnd() * 5);
        const matches = isActivity ? 0 : 2 + Math.floor(rnd() * 3);
        const wins = isActivity ? 0 : Math.max(0, Math.min(matches, matches - Math.floor(rnd() * 3)));
        const placeBonus = placement === 1 ? 35 : placement === 2 ? 25 : placement === 3 ? 15 : placement === 5 ? 10 : 0;
        return {
          id: `r-${e.id}-${m.id}-${idx}`,
          eventId: e.id,
          memberId: m.id,
          placement,
          wins,
          matches,
          points: isActivity ? 15 : placeBonus + wins * 10,
        };
      }),
  );

export const posts: Post[] = [
  { id: "p1", title: "Podzimní prázdniny: tréninky", publishedAt: "2026-10-24", excerpt: "Přehled tréninků o podzimních prázdninách. Základny se mohou lišit, sledujte rozpis u svého trenéra." },
  { id: "p2", title: "Nominace na šampionát Moravy", publishedAt: "2026-10-18", excerpt: "Trenéři zveřejnili nominaci. Nominovaní závodníci dostanou informace e-mailem." },
  { id: "p3", title: "Výsledky 3. kola Mistrovství klubu", publishedAt: "2026-10-05", excerpt: "Děkujeme všem za účast. Výsledky najdete v tabulkách." },
];
