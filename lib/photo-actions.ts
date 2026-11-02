"use server";

import { revalidatePath } from "next/cache";
import { serverClient } from "./supabase-server";

export type PhotoResult = { ok: boolean; error?: string };

const MAX_BYTES = 300 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const message = (e: { code?: string; message: string }) => (e.code === "42501" || /oprávnění|row-level|policy/i.test(e.message) ? "Nemáte oprávnění měnit tuto fotku." : `Uložení fotky se nepodařilo (${e.message}).`);

/** Nahraje fotku člena (již zmenšenou v prohlížeči na WebP). Smí jen člen sám nebo jeho zákonný zástupce. */
export async function uploadMemberPhoto(memberId: string, form: FormData): Promise<PhotoResult> {
  if (!UUID.test(memberId)) return { ok: false, error: "Neplatný člen." };
  const file = form.get("photo");
  if (!(file instanceof Blob) || file.type !== "image/webp") return { ok: false, error: "Fotka musí být obrázek." };
  if (file.size === 0 || file.size > MAX_BYTES) return { ok: false, error: "Fotka je příliš velká." };

  const sb = await serverClient();
  const up = await sb.storage.from("member-photos").upload(`${memberId}.webp`, file, { upsert: true, contentType: "image/webp", cacheControl: "3600" });
  if (up.error) return { ok: false, error: message(up.error) };
  const mark = await sb.rpc("set_member_photo", { p_member: memberId, p_has: true });
  if (mark.error) return { ok: false, error: message(mark.error) };
  revalidatePath("/clenove");
  return { ok: true };
}

export async function removeMemberPhoto(memberId: string): Promise<PhotoResult> {
  if (!UUID.test(memberId)) return { ok: false, error: "Neplatný člen." };
  const sb = await serverClient();
  const mark = await sb.rpc("set_member_photo", { p_member: memberId, p_has: false });
  if (mark.error) return { ok: false, error: message(mark.error) };
  await sb.storage.from("member-photos").remove([`${memberId}.webp`]);
  revalidatePath("/clenove");
  return { ok: true };
}

/** Váha člena: smí měnit jen člen sám nebo zákonný zástupce. Prázdná hodnota váhu smaže. */
export async function setMemberWeight(memberId: string, kg: number | null): Promise<PhotoResult> {
  if (!UUID.test(memberId)) return { ok: false, error: "Neplatný člen." };
  if (kg !== null && (!Number.isFinite(kg) || kg < 10 || kg > 200)) return { ok: false, error: "Váha musí být mezi 10 a 200 kg." };
  const sb = await serverClient();
  const { error } = await sb.rpc("set_member_weight", { p_member: memberId, p_kg: kg === null ? null : Math.round(kg * 10) / 10 });
  if (error) return { ok: false, error: error.code === "42501" ? "Nemáte oprávnění měnit tuto váhu." : "Uložení váhy se nepodařilo." };
  revalidatePath("/clenove");
  return { ok: true };
}
