# JudoAdmin

Webová aplikace pro správu klubu JUDO BESKYDY z.s.: členové, akce a přihlášky, výsledky, bodování a aktuality. Nahrazuje starou správu na sprava-judobeskydy.cz.

Stav: **kostra**. Veřejné stránky běží nad demo daty se smyšlenými jmény.

## Co už je hotové

- Přehled: nadcházející akce a aktuality
- Akce: kalendář po měsících, detail akce s počtem přihlášených po základnách (jména se veřejně neukazují)
- Členové: seznam s hledáním a filtrem základny a kategorie
- Žebříček: soutěže a aktivita, filtr roku, základny a kategorie
- Databázové schéma s rolemi a pravidly přístupu: `supabase/schema.sql` (nasazeno v Supabase)
- Čtení základen, akcí a aktualit ze Supabase; bez nastavených klíčů běží demo data
- Mobile-first, světlý i tmavý režim, manifest pro instalaci na plochu (PWA)

## Co zatím chybí

1. Přihlášení a role (admin, trenér, rodič)
2. Registrace na akce
3. Zadávání výsledků a bodovací systém (pravidla viz `docs/specifikace.md`, kap. 3.4)
4. Import skutečných dat ze staré správy
5. Veřejné počty přihlášených a žebříček z databáze (čeká na přihlášení a rozhodnutí o zveřejňování jmen)

## Nastavení databáze

Zkopíruj `.env.example` do `.env.local` a doplň URL projektu a publishable klíč (Supabase, Project Settings, API). Stejné dvě proměnné nastav i v hostingu. Klíč `service_role` se nikdy nedává do repozitáře ani do chatu.

## Spuštění

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # produkční build
```

Vyžaduje Node.js 20 nebo novější. Projekt používá Next.js 16 s Cache Components, viz `AGENTS.md`.

## Struktura

| Cesta | Obsah |
|---|---|
| `app/` | stránky a rozvržení |
| `components/` | filtrované tabulky (členové, žebříček) |
| `lib/data.ts` | jediné místo, kde se čtou data. Zatím demo, později Supabase |
| `lib/demo-data.ts` | smyšlená demo data |
| `supabase/schema.sql` | schéma databáze a RLS pravidla |
| `docs/specifikace.md` | specifikace převzatá ze staré správy |

## Osobní údaje

Jména dětí, roky narození a e-maily jsou osobní údaje. Skutečná data patří jen do databáze, nikdy do repozitáře. Složky `data/` a `imports/` a soubory `.env*` jsou v `.gitignore`.
