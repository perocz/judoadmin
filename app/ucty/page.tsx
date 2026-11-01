import { Suspense } from "react";
import type { Metadata } from "next";
import AccountManager, { type AccountRow } from "@/components/AccountManager";
import { getBases } from "@/lib/data";
import { requireSession } from "@/lib/session";
import { serverClient } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Účty" };

export default function Page() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Účty</h1>
      <p className="mt-1 text-muted">Zakládání účtů a přiřazování dětí rodičům. Smí správce a trenér u členů své základny.</p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-muted">Načítám…</p>}>
          <Content />
        </Suspense>
      </div>
    </div>
  );
}

async function Content() {
  const session = await requireSession();
  const isAdmin = session.roles.includes("admin");
  if (!isAdmin && session.trainerBaseIds.length === 0) return <p className="text-muted">Tato stránka je pro správce a trenéry.</p>;
  const sb = await serverClient();
  const bases = await getBases();
  const baseName = new Map(bases.map((b) => [b.id, b.name]));

  // Trenér vidí členy svých základen (RLS), správce všechny.
  const { data: ms } = await sb.from("members").select("id,first_name,last_name,base_id").eq("status", "active").order("last_name").order("first_name");
  const members = (ms ?? [])
    .filter((m) => isAdmin || session.trainerBaseIds.includes(m.base_id))
    .map((m) => ({ id: m.id, name: `${m.last_name} ${m.first_name}`, base: baseName.get(m.base_id) ?? "" }));
  const byId = new Map(members.map((m) => [m.id, m]));

  const [profiles, roles, guardians] = await Promise.all([
    sb.from("profiles").select("id,full_name,username").order("full_name"),
    isAdmin ? sb.from("user_roles").select("profile_id,role") : Promise.resolve({ data: [] as { profile_id: string; role: string }[] }),
    sb.from("guardians").select("profile_id,member_id"),
  ]);
  const rolesOf = new Map<string, string[]>();
  for (const r of roles.data ?? []) rolesOf.set(r.profile_id, [...(rolesOf.get(r.profile_id) ?? []), r.role]);
  const kids = new Map<string, string[]>();
  for (const g of guardians.data ?? []) kids.set(g.profile_id, [...(kids.get(g.profile_id) ?? []), g.member_id]);

  const accounts: AccountRow[] = (profiles.data ?? [])
    .filter((p) => isAdmin || kids.has(p.id))
    .map((p) => ({
      id: p.id,
      username: p.username ?? "",
      fullName: p.full_name,
      roles: isAdmin ? (rolesOf.get(p.id) ?? []) : ["parent"],
      children: (kids.get(p.id) ?? []).map((id) => byId.get(id)).filter((m): m is NonNullable<typeof m> => !!m),
    }));
  const myBases = isAdmin ? bases : bases.filter((b) => session.trainerBaseIds.includes(b.id));
  return <AccountManager members={members} bases={myBases} accounts={accounts} isAdmin={isAdmin} />;
}
