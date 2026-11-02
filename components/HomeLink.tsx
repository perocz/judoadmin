import Link from "next/link";
import { getSession } from "@/lib/session";

/** Logo: přihlášeného vede na Přehled, ostatní na úvodní stránku. Čte relaci, proto se vkládá za Suspense. */
export default async function HomeLink() {
  const session = await getSession();
  return <Brand href={session && !session.mustChangePassword ? "/prehled" : "/"} />;
}

export function Brand({ href }: { href: string }) {
  return (
    <Link href={href} className="no-underline">
      <span className="text-lg font-semibold tracking-[0.18em] uppercase">Judo Beskydy</span>
      <span className="ml-3 text-sm text-muted">správa klubu</span>
    </Link>
  );
}
