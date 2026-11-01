import { Suspense } from "react";
import type { Metadata } from "next";
import MemberTable from "@/components/MemberTable";
import { getBases, getMembers, isDemo } from "@/lib/data";
import { getActiveRole } from "@/lib/active-role";
import { requireSession } from "@/lib/session";
import { getMyMembers } from "@/lib/trainings";

export const metadata: Metadata = { title: "Členové" };

export default function MembersPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Členové</h1>
      <p className="mt-1 text-muted">Seznam členů klubu podle základen a kategorií.</p>
      {isDemo && <p className="mt-1 text-xs text-muted">Po zavedení přihlášení bude seznam přístupný jen trenérům a správcům.</p>}
      <div className="mt-8">
        <Suspense fallback={<p className="text-muted">Načítám…</p>}>
          <Members />
        </Suspense>
      </div>
    </div>
  );
}

async function Members() {
  const session = isDemo ? null : await requireSession();
  const [all, bases] = await Promise.all([getMembers(), getBases()]);
  // Co člen seznamu uvidí, určuje zvolená role (databáze ukazuje vše, co uživatel smí).
  const role = session ? await getActiveRole(session) : "admin";
  let members = all;
  if (session && (role === "parent" || role === "member")) {
    const mine = new Set((await getMyMembers(session)).map((m) => m.id));
    members = all.filter((m) => mine.has(m.id));
  } else if (session && role === "trainer") {
    members = all.filter((m) => session.trainerBaseIds.includes(m.baseId));
  }
  const editableBaseIds = role === "admin" ? "all" : role === "trainer" ? (session?.trainerBaseIds ?? []) : [];
  // Filtr základen nabízí jen ty, ze kterých jsou zobrazení členové.
  const visibleBases = role === "admin" ? bases : bases.filter((b) => members.some((m) => m.baseId === b.id) || (role === "trainer" && session?.trainerBaseIds.includes(b.id)));
  return <MemberTable members={members} bases={visibleBases} editableBaseIds={editableBaseIds} />;
}
