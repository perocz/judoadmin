import { Suspense } from "react";
import type { Metadata } from "next";
import MemberCard from "@/components/MemberCard";
import MemberTable from "@/components/MemberTable";
import { getBases, getMembers, isDemo } from "@/lib/data";
import { getActiveRole } from "@/lib/active-role";
import { getMyCards } from "@/lib/profile";
import { requireSession } from "@/lib/session";
import { getMyMembers } from "@/lib/trainings";

export const metadata: Metadata = { title: "Členové" };

export default function MembersPage() {
  return (
    <Suspense fallback={<p className="text-muted">Načítám…</p>}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const session = isDemo ? null : await requireSession();
  const role = session ? await getActiveRole(session) : "admin";

  // Člen a rodič nevidí seznam, ale karty: svou, resp. dětí.
  if (session && (role === "member" || role === "parent")) {
    const people = await getMyMembers(session);
    const cards = await getMyCards(people.map((p) => p.id));
    const title = role === "member" ? "Můj profil" : "Moje děti";
    return (
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-muted">Fotku můžeš kdykoli změnit nebo smazat. Vidí ji jen ty, rodič a trenéři tvé základny.</p>
        <div className="mt-8 space-y-6">
          {cards.length === 0 ? <p className="text-muted">K tvému účtu zatím není přiřazen žádný člen ani dítě.</p> : cards.map((c) => <MemberCard key={c.id} card={c} />)}
        </div>
      </div>
    );
  }

  const [all, bases] = await Promise.all([getMembers(), getBases()]);
  let members = all;
  if (session && role === "trainer") members = all.filter((m) => session.trainerBaseIds.includes(m.baseId));
  const editableBaseIds = role === "admin" ? "all" : role === "trainer" ? (session?.trainerBaseIds ?? []) : [];
  // Filtr základen nabízí jen ty, ze kterých jsou zobrazení členové.
  const visibleBases = role === "admin" ? bases : bases.filter((b) => members.some((m) => m.baseId === b.id) || (role === "trainer" && session?.trainerBaseIds.includes(b.id)));
  return (
    <div>
      <h1 className="text-2xl font-semibold">Členové</h1>
      <p className="mt-1 text-muted">Seznam členů klubu podle základen a kategorií.</p>
      {isDemo && <p className="mt-1 text-xs text-muted">Po zavedení přihlášení bude seznam přístupný jen trenérům a správcům.</p>}
      <div className="mt-8">
        <MemberTable members={members} bases={visibleBases} editableBaseIds={editableBaseIds} />
      </div>
    </div>
  );
}
