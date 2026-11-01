-- JudoAdmin: databázové schéma pro Supabase (Postgres).
-- Stav: první návrh, zatím nespuštěno proti živé databázi.
-- Osobní údaje členů patří jen do databáze, nikdy do repozitáře.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- číselníky

create table bases (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now()
);

create type app_role as enum ('admin', 'trainer', 'parent');
create type event_type as enum ('turnaj', 'mistrovstvi-klubu', 'prespavacka', 'kemp', 'jine');
create type member_status as enum ('active', 'ended');

-- ---------------------------------------------------------------- uživatelé

-- Vazba na přihlášení Supabase (auth.users). Role určuje, co uživatel smí.
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text not null,
  role        app_role not null default 'parent',
  base_id     uuid references bases (id),      -- jen pro trenéra
  created_at  timestamptz not null default now()
);

create function current_app_role() returns app_role
  language sql stable security definer set search_path = public as
  $$ select role from profiles where id = auth.uid() $$;

create function current_trainer_base() returns uuid
  language sql stable security definer set search_path = public as
  $$ select base_id from profiles where id = auth.uid() and role = 'trainer' $$;

-- ---------------------------------------------------------------- členové

create table members (
  id            uuid primary key default gen_random_uuid(),
  last_name     text not null,
  first_name    text not null,
  birth_year    int  not null check (birth_year between 1930 and 2100),
  category      text not null check (category in ('U8','U10','U12','U14','U16','U18','Dospělí')),
  kyu           int  check (kyu between 0 and 6),
  base_id       uuid not null references bases (id),
  status        member_status not null default 'active',
  joined_on     date,
  ended_on      date,
  legacy_id     text,                           -- identifikátor ve starém systému (pro import)
  created_at    timestamptz not null default now()
);
create index members_base_idx on members (base_id);
create index members_name_idx on members (last_name, first_name);

-- Zákonný zástupce uživatel (rodič) -> dítě.
create table guardians (
  profile_id  uuid not null references profiles (id) on delete cascade,
  member_id   uuid not null references members (id) on delete cascade,
  primary key (profile_id, member_id)
);

-- ---------------------------------------------------------------- akce

create table events (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  type          event_type not null,
  starts_on     date not null,
  ends_on       date not null check (ends_on >= starts_on),
  venue         text,
  city          text,
  capacity      int  not null default 100,
  registration_open boolean not null default true,
  description   text,
  document_url  text,                           -- pozvánka, rozpis, propozice
  created_at    timestamptz not null default now()
);
create index events_date_idx on events (starts_on);

-- Přihláška člena na akci. Poznámky jako "jen pátek" mají vlastní pole, ne jméno.
create table registrations (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events (id) on delete cascade,
  member_id     uuid not null references members (id) on delete cascade,
  weight_kg     numeric(5,1),
  stays_overnight boolean not null default true,
  note          text,
  contact_email text,
  created_by    uuid references profiles (id),
  created_at    timestamptz not null default now(),
  unique (event_id, member_id)                  -- žádné duplicity
);

-- ---------------------------------------------------------------- výsledky a body

create table results (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events (id) on delete cascade,
  member_id     uuid not null references members (id) on delete cascade,
  placement     int check (placement > 0),      -- null = bez umístění
  wins          int not null default 0 check (wins >= 0),
  matches       int not null default 0 check (matches >= wins),
  points        int not null default 0,         -- uložené body; do doplnění pravidel se zadávají ručně
  points_note   text,                           -- zdůvodnění ruční úpravy
  created_at    timestamptz not null default now(),
  unique (event_id, member_id)
);

-- Pravidla bodování se doplní později jako data (kategorie závodu, body za umístění).
-- Zdroj: bodovani2017.xls, viz docs/specifikace.

-- ---------------------------------------------------------------- aktuality

create table posts (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  body          text not null default '',
  excerpt       text not null default '',
  attachment_url text,
  published_at  timestamptz,                    -- null = koncept
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------- zabezpečení (RLS)

alter table bases         enable row level security;
alter table profiles      enable row level security;
alter table members       enable row level security;
alter table guardians     enable row level security;
alter table events        enable row level security;
alter table registrations enable row level security;
alter table results       enable row level security;
alter table posts         enable row level security;

-- Veřejně čitelné: základny, akce, zveřejněné aktuality.
create policy bases_read  on bases  for select using (true);
create policy events_read on events for select using (true);
create policy posts_read  on posts  for select using (published_at is not null and published_at <= now());

-- Členové: admin vše, trenér svoji základnu, rodič své děti.
create policy members_admin  on members for all    using (current_app_role() = 'admin') with check (current_app_role() = 'admin');
create policy members_trainer on members for select using (current_app_role() = 'trainer' and base_id = current_trainer_base());
create policy members_parent on members for select using (
  exists (select 1 from guardians g where g.member_id = members.id and g.profile_id = auth.uid())
);

-- Profil: každý vidí a mění jen svůj; admin všechny.
create policy profiles_self  on profiles for select using (id = auth.uid() or current_app_role() = 'admin');
create policy profiles_admin on profiles for all    using (current_app_role() = 'admin') with check (current_app_role() = 'admin');
create policy guardians_read on guardians for select using (profile_id = auth.uid() or current_app_role() = 'admin');
create policy guardians_admin on guardians for all   using (current_app_role() = 'admin') with check (current_app_role() = 'admin');

-- Akce, aktuality a výsledky spravuje admin (trenér zapisuje výsledky své základny).
create policy events_admin on events for all using (current_app_role() = 'admin') with check (current_app_role() = 'admin');
create policy posts_admin  on posts  for all using (current_app_role() = 'admin') with check (current_app_role() = 'admin');
create policy bases_admin  on bases  for all using (current_app_role() = 'admin') with check (current_app_role() = 'admin');

-- Přihlášky: admin vše; trenér základny; rodič přihlašuje a ruší jen své děti.
create policy reg_admin   on registrations for all using (current_app_role() = 'admin') with check (current_app_role() = 'admin');
create policy reg_trainer on registrations for select using (
  current_app_role() = 'trainer' and exists (select 1 from members m where m.id = registrations.member_id and m.base_id = current_trainer_base())
);
create policy reg_parent_read on registrations for select using (
  exists (select 1 from guardians g where g.member_id = registrations.member_id and g.profile_id = auth.uid())
);
create policy reg_parent_write on registrations for insert with check (
  exists (select 1 from guardians g where g.member_id = registrations.member_id and g.profile_id = auth.uid())
);
create policy reg_parent_delete on registrations for delete using (
  exists (select 1 from guardians g where g.member_id = registrations.member_id and g.profile_id = auth.uid())
);

-- Výsledky: čtení jako u členů; zápis admin a trenér své základny.
create policy results_admin on results for all using (current_app_role() = 'admin') with check (current_app_role() = 'admin');
create policy results_trainer_read on results for select using (
  current_app_role() = 'trainer' and exists (select 1 from members m where m.id = results.member_id and m.base_id = current_trainer_base())
);
create policy results_trainer_write on results for insert with check (
  current_app_role() = 'trainer' and exists (select 1 from members m where m.id = results.member_id and m.base_id = current_trainer_base())
);
create policy results_parent_read on results for select using (
  exists (select 1 from guardians g where g.member_id = results.member_id and g.profile_id = auth.uid())
);

-- Veřejný žebříček bez celých jmen se doplní jako pohled (view) až po rozhodnutí klubu o zveřejňování jmen.
