import "server-only";
import { serverClient } from "./supabase-server";
import { MEMBERSHIP_LABEL, type Membership } from "./types";

export type Card = {
  id: string;
  name: string;
  birthYear: number | null;
  category: string;
  kyu: number | null;
  baseName: string;
  membership: string;
  joinedOn: string | null;
  photoUrl: string | null;
  weightKg: number | null;
  weightUpdatedOn: string | null;
};

/** Karty členů z mého účtu (já a děti) včetně odkazu na fotku. Databáze vrací jen moje členy. */
export async function getMyCards(memberIds: string[]): Promise<Card[]> {
  if (memberIds.length === 0) return [];
  const sb = await serverClient();
  const { data } = await sb
    .from("members")
    .select("id,first_name,last_name,birth_year,category,kyu,membership,joined_on,photo_updated_at,weight_kg,weight_updated_at,bases(name)")
    .in("id", memberIds)
    .order("first_name");
  const rows = data ?? [];
  const withPhoto = rows.filter((r) => r.photo_updated_at);
  const signed = withPhoto.length
    ? await sb.storage.from("member-photos").createSignedUrls(
        withPhoto.map((r) => `${r.id}.webp`),
        3600,
      )
    : { data: [] as { path: string | null; signedUrl: string }[] };
  const url = new Map((signed.data ?? []).filter((s) => s.path).map((s) => [s.path as string, s.signedUrl]));
  return rows.map((r) => ({
    id: r.id,
    name: `${r.first_name} ${r.last_name}`,
    birthYear: r.birth_year ?? null,
    category: r.category,
    kyu: r.kyu === null ? null : Number(r.kyu),
    baseName: (r.bases as unknown as { name: string } | null)?.name ?? "–",
    membership: MEMBERSHIP_LABEL[r.membership as Membership] ?? "–",
    joinedOn: r.joined_on ?? null,
    photoUrl: url.get(`${r.id}.webp`) ?? null,
    weightKg: r.weight_kg === null ? null : Number(r.weight_kg),
    weightUpdatedOn: r.weight_updated_at ? r.weight_updated_at.slice(0, 10) : null,
  }));
}
