import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Bez nastavených proměnných prostředí aplikace běží nad demo daty. */
export const hasSupabase = Boolean(url && key);

/** Anonymní klient pro veřejné čtení. Co smí vidět, určují pravidla RLS v databázi. */
export function publicClient() {
  if (!url || !key) throw new Error("Chybí NEXT_PUBLIC_SUPABASE_URL nebo NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
