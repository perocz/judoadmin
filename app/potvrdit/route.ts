import { NextResponse, type NextRequest } from "next/server";
import { serverClient } from "@/lib/supabase-server";

/**
 * Cíl odkazu z e-mailu. Přihlásí „schránku“ (uživatele Auth s ověřeným e-mailem) a podle čekajících
 * aktivací buď dokončí první přihlášení, nebo pustí na zadání nového hesla.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const sb = await serverClient();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");

  let ok = false;
  if (code) ok = !(await sb.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash) ok = !(await sb.auth.verifyOtp({ type: "email", token_hash: tokenHash })).error;
  if (!ok) return NextResponse.redirect(new URL("/prihlaseni?stav=odkaz", origin));

  const { data: activated, error } = await sb.rpc("activation_confirm");
  if (error) return NextResponse.redirect(new URL("/prihlaseni?stav=odkaz", origin));
  if (Number(activated) > 0) {
    await sb.auth.signOut();
    return NextResponse.redirect(new URL("/prihlaseni?stav=aktivovano", origin));
  }
  return NextResponse.redirect(new URL("/nove-heslo", origin));
}
