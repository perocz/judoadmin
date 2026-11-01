"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ROLE_COOKIE } from "./active-role";
import { ROLE_ORDER } from "./roles";
import { getSession, type Role } from "./session";

export async function setRole(formData: FormData) {
  const role = String(formData.get("role")) as Role;
  const session = await getSession();
  if (!session || !ROLE_ORDER.includes(role) || !session.roles.includes(role)) redirect("/prihlaseni");
  (await cookies()).set(ROLE_COOKIE, role, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/prehled");
}
