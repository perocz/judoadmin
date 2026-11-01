import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import MemberTable from "@/components/MemberTable";
import { getBases, getMembers } from "@/lib/data";

export const metadata: Metadata = { title: "Členové" };

export default function MembersPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Členové</h1>
      <p className="mt-1 text-muted">Seznam členů klubu podle základen a kategorií.</p>
      <p className="mt-1 text-xs text-muted">Po zavedení přihlášení bude seznam přístupný jen trenérům a správcům.</p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-muted">Načítám…</p>}>
          <Members />
        </Suspense>
      </div>
    </div>
  );
}

async function Members() {
  await connection();
  const [members, bases] = await Promise.all([getMembers(), getBases()]);
  return <MemberTable members={members} bases={bases} />;
}
