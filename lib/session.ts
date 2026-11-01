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
  roles: Role[];
  /** Základny, které uživatel trénuje. */
  trainerBaseIds: string[];
};

/** Aktuální uživatel, nebo null. Čte relaci z cookies, proto patří vždy za Suspense. */
export const getSession = cache(async (): Promise<Session | null> => {
  if (!hasSupabase) return null;
  const sb = await serverClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const [profile, roles] = await Promise.all([
    sb.from("profiles").select("full_name,username,must_change_password").eq("id", user.id).maybeSingle(),
    sb.from("user_roles").select("role,base_id").eq("profile_id", user.id),
  ]);
  if (!profile.data) return null;
  const rows = roles.data ?? [];
  return {
    userId: user.id,
    username: profile.data.username,
    fullName: profile.data.full_name,
    mustChangePassword: profile.data.must_change_password,
    roles: [...new Set(rows.map((r) => r.role as Role))],
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
