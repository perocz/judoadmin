import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import Leaderboard from "@/components/Leaderboard";
import { getBases, getRankingRows } from "@/lib/data";

export const metadata: Metadata = { title: "Žebříček" };

export default function RankingPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Žebříček</h1>
      <p className="mt-1 text-muted">Bodování členů za soutěže a za aktivitu v klubu.</p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-muted">Načítám…</p>}>
          <Ranking />
        </Suspense>
      </div>
    </div>
  );
}

async function Ranking() {
  await connection();
  const [rows, bases] = await Promise.all([getRankingRows(), getBases()]);
  return <Leaderboard rows={rows} bases={bases} />;
}
