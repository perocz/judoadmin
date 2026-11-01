export type Base = { id: string; name: string };

export const CATEGORIES = ["U8", "U10", "U12", "U14", "U16", "U18", "Dospělí"] as const;
export type Category = (typeof CATEGORIES)[number];

export type Member = {
  id: string;
  lastName: string;
  firstName: string;
  birthYear: number | null;
  category: Category;
  /** Žákovský technický stupeň (6 = nejnižší). */
  kyu: number;
  baseId: string;
  /** Typ členského příspěvku podle ceníku: nováček a přípravka (1× týdně, 1600 Kč/pololetí) nebo aktivní člen a závodní tým (až 4× týdně, 2600 Kč/pololetí). */
  membership: Membership;
};

export type Membership = "novacek" | "aktivni";
export const MEMBERSHIP_LABEL: Record<Membership, string> = {
  novacek: "Nováček",
  aktivni: "Aktivní",
};

export type EventType = "turnaj" | "mistrovstvi-klubu" | "prespavacka" | "kemp" | "jine";

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  turnaj: "Turnaj",
  "mistrovstvi-klubu": "Mistrovství klubu",
  prespavacka: "Přespávačka",
  kemp: "Kemp",
  jine: "Jiné",
};

/** Typy akcí, jejichž body se počítají do tabulky aktivit (ne do soutěžního žebříčku). */
export const ACTIVITY_TYPES: EventType[] = ["prespavacka", "kemp"];

export type ClubEvent = {
  id: string;
  title: string;
  type: EventType;
  /** ISO datum (YYYY-MM-DD). */
  startsOn: string;
  endsOn: string;
  venue?: string;
  city?: string;
  capacity: number;
  description?: string;
  /** Odkaz na pozvánku, rozpis nebo propozice. */
  documentUrl?: string;
};

export type Registration = { eventId: string; memberId: string };

export type Result = {
  id: string;
  eventId: string;
  memberId: string;
  /** null = bez umístění (účast). */
  placement: number | null;
  wins: number;
  matches: number;
  /** Body uložené u výsledku. Pravidla bodování se doplní později, do té doby se zadávají ručně. */
  points: number;
};

export type Post = {
  id: string;
  title: string;
  publishedAt: string;
  excerpt: string;
  attachmentUrl?: string;
};

export type RankingRow = {
  year: number;
  memberId: string;
  name: string;
  category: Category;
  baseId: string;
  points: number;
  wins: number;
  matches: number;
  activityPoints: number;
};
