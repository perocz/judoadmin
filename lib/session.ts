import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { hasSupabase } from "./supabase";
import { serverClient } from "./supabase-server";

export type Role = "admin" | "moderator" | "trainer" | "parent" | "member";

export type Session = {
  userId: string;
  username: string | null;
  fullName: string;
  mustChangePassword: boolean;
  /** Má ověřený kontaktní e-mail (nutný pro obnovu hesla). */
  hasContactEmail: boolean;
  roles: Role[];
  /** Má roli trenéra (i bez základny = trenér bez příznaku). */
  isTrainer: boolean;
  /** Základny, které uživatel trénuje. */
  trainerBaseIds: string[];
};

/** Aktuální uživatel, nebo null. Čte relaci z cookies, proto patří vždy za Suspense. */
export const getSession = cache(async (): Promise<Session | null> => {
  if (!hasSupabase) return null;
  const sb = await serverClient();
  // getClaims ověří podpis přihlašovacího tokenu lokálně (bez dotazu na Supabase Auth), proxy.ts ho podle potřeby obnoví.
  const { data: auth } = await sb.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return null;
  const user = { id: userId };
  const [profile, roles] = await Promise.all([
    sb.from("profiles").select("full_name,username,must_change_password,contact_email").eq("id", user.id).maybeSingle(),
    sb.from("user_roles").select("role,base_id").eq("profile_id", user.id),
  ]);
  if (!profile.data) return null;
  const rows = roles.data ?? [];
  return {
    userId: user.id,
    username: profile.data.username,
    fullName: profile.data.full_name,
    mustChangePassword: profile.data.must_change_password,
    hasContactEmail: !!profile.data.contact_email,
    roles: [...new Set(rows.map((r) => r.role as Role))],
    isTrainer: rows.some((r) => r.role === "trainer"),
    trainerBaseIds: rows.filter((r) => r.role === "trainer" && r.base_id).map((r) => r.base_id as string),
  };
});

/** Stránka vyžadující přihlášení. Do změny počátečního hesla pustí jen na /heslo. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/prihlaseni");
  if (session.mustChangePassword) redirect("/heslo");
  return session;
}
