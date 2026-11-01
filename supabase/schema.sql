-- JudoAdmin: databázové schéma pro Supabase (Postgres).
-- Stav: nasazeno do projektu judoAdmin (Supabase, EU). Zdroj pravdy je tento soubor.
-- Osobní údaje členů patří jen do databáze, nikdy do repozitáře.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- číselníky

create table bases (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now()
);

-- Role: admin (vše), moderator (články a akce), trainer (svěřená základna a její články),
-- parent (své děti), member (sám za sebe). Uživatel může mít víc rolí.
create type app_role as enum ('admin', 'trainer', 'parent', 'moderator', 'member');
create type event_type as enum ('turnaj', 'mistrovstvi-klubu', 'prespavacka', 'kemp', 'jine');
create type member_status as enum ('active', 'ended');

-- ---------------------------------------------------------------- uživatelé

-- Vazba na přihlášení Supabase (auth.users). Uživatelské jméno ve tvaru jmeno.prijmeni.
-- member_id: člen, za kterého se uživatel přihlašuje sám (role member).
-- must_change_password: do první změny hesla se uživateli ukáže jen formulář pro změnu.
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text not null,
  username    text unique check (username ~ '^[a-z0-9]+(\.[a-z0-9]+)*$'),
  member_id   uuid,                                -- reference se doplní níže, po vytvoření members
  must_change_password boolean not null default true,
  created_at  timestamptz not null default now()
);

create schema if not exists private;
grant usage on schema private to anon, authenticated;

-- ---------------------------------------------------------------- členové

create table members (
  id            uuid primary key default gen_random_uuid(),
  last_name     text not null,
  first_name    text not null,
  birth_year    int  check (birth_year between 1930 and 2100),   -- starý systém rok narození v seznamu nemá
  category      text not null check (category in ('U8','U10','U12','U14','U16','U18','Dospělí')),
  kyu           numeric(2,1) check (kyu between 0 and 6),        -- půlené stupně (4.5) se ve starém systému vyskytují
  base_id       uuid not null references bases (id),
  status        member_status not null default 'active',
  joined_on     date,
  ended_on      date,
  legacy_id     text,                           -- identifikátor ve starém systému (pro import)
  created_at    timestamptz not null default now()
);
create unique index members_legacy_id_key on members (legacy_id);
create index members_base_idx on members (base_id);
create index members_name_idx on members (last_name, first_name);

-- Zákonný zástupce uživatel (rodič) -> dítě.
create table guardians (
  profile_id  uuid not null references profiles (id) on delete cascade,
  member_id   uuid not null references members (id) on delete cascade,
  primary key (profile_id, member_id)
);

alter table profiles add constraint profiles_member_fk foreign key (member_id) references members (id) on delete set null;

-- Role uživatele. Trenér je vždy vázaný na základnu (může jich mít víc), ostatní role ne.
create table user_roles (
  profile_id uuid not null references profiles (id) on delete cascade,
  role       app_role not null,
  base_id    uuid references bases (id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((role = 'trainer') = (base_id is not null))
);
create unique index user_roles_unique on user_roles (profile_id, role, coalesce(base_id, '00000000-0000-0000-0000-000000000000'));

-- Pomocné funkce jsou v neveřejném schématu, aby nešly volat přes REST API.
create function private.has_role(r app_role) returns boolean
  language sql stable security definer set search_path = public as
  $$ select exists (select 1 from user_roles where profile_id = auth.uid() and role = r) $$;

create function private.trains_base(b uuid) returns boolean
  language sql stable security definer set search_path = public as
  $$ select exists (select 1 from user_roles where profile_id = auth.uid() and role = 'trainer' and base_id = b) $$;

create function private.my_member_ids() returns setof uuid
  language sql stable security definer set search_path = public as
  $$ select member_id from profiles where id = auth.uid() and member_id is not null
     union select member_id from guardians where profile_id = auth.uid() $$;

create function private.my_base_ids() returns setof uuid
  language sql stable security definer set search_path = public as
  $$ select base_id from members where id in (select private.my_member_ids())
     union select base_id from user_roles where profile_id = auth.uid() and role = 'trainer' $$;

revoke execute on function private.has_role(app_role), private.trains_base(uuid), private.my_member_ids(), private.my_base_ids() from public;
grant execute on function private.has_role(app_role), private.trains_base(uuid), private.my_member_ids(), private.my_base_ids() to anon, authenticated;

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
  base_id       uuid references bases (id) on delete cascade,  -- null = článek celého klubu, jinak extra článek základny
  published_at  timestamptz,                    -- null = koncept
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------- zabezpečení (RLS)

alter table bases         enable row level security;
alter table profiles      enable row level security;
alter table user_roles    enable row level security;
alter table members       enable row level security;
alter table guardians     enable row level security;
alter table events        enable row level security;
alter table registrations enable row level security;
alter table results       enable row level security;
alter table posts         enable row level security;

-- Základny a akce jsou veřejné, spravuje je admin (akce i moderátor).
create policy bases_read  on bases  for select using (true);
create policy bases_admin on bases  for all using (private.has_role('admin')) with check (private.has_role('admin'));
create policy events_read on events for select using (true);
create policy events_staff on events for all
  using (private.has_role('admin') or private.has_role('moderator'))
  with check (private.has_role('admin') or private.has_role('moderator'));

-- Uživatelé a role: každý vidí své, admin všechno.
create policy profiles_self  on profiles   for select using (id = auth.uid() or private.has_role('admin'));
create policy profiles_admin on profiles   for all using (private.has_role('admin')) with check (private.has_role('admin'));
create policy roles_self     on user_roles for select using (profile_id = auth.uid() or private.has_role('admin'));
create policy roles_admin    on user_roles for all using (private.has_role('admin')) with check (private.has_role('admin'));
create policy guardians_self  on guardians for select using (profile_id = auth.uid() or private.has_role('admin'));
create policy guardians_admin on guardians for all using (private.has_role('admin')) with check (private.has_role('admin'));

-- Členové: admin vše, trenér svoji základnu, rodič a člen jen sebe a své děti.
create policy members_admin   on members for all using (private.has_role('admin')) with check (private.has_role('admin'));
create policy members_trainer on members for select using (private.trains_base(base_id));
create policy members_own     on members for select using (id in (select private.my_member_ids()));

-- Aktuality: celoklubové zveřejněné vidí každý, základnové jen lidé z té základny.
-- Píše admin a moderátor, trenér jen extra články své základny.
create policy posts_public  on posts for select using (base_id is null and published_at is not null and published_at <= now());
create policy posts_base    on posts for select using (base_id in (select private.my_base_ids()) and published_at is not null and published_at <= now());
create policy posts_staff   on posts for all
  using (private.has_role('admin') or private.has_role('moderator'))
  with check (private.has_role('admin') or private.has_role('moderator'));
create policy posts_trainer on posts for all
  using (base_id is not null and private.trains_base(base_id))
  with check (base_id is not null and private.trains_base(base_id));

-- Přihlášky: admin vše, trenér čte svoji základnu, rodič a člen přihlašují a ruší jen své.
create policy reg_admin      on registrations for all using (private.has_role('admin')) with check (private.has_role('admin'));
create policy reg_trainer    on registrations for select using (member_id in (select id from members where private.trains_base(base_id)));
create policy reg_own_read   on registrations for select using (member_id in (select private.my_member_ids()));
create policy reg_own_insert on registrations for insert with check (member_id in (select private.my_member_ids()));
create policy reg_own_delete on registrations for delete using (member_id in (select private.my_member_ids()));

-- Výsledky: admin vše, trenér čte a zapisuje svoji základnu, rodič a člen čtou své.
create policy results_admin        on results for all using (private.has_role('admin')) with check (private.has_role('admin'));
create policy results_trainer_read  on results for select using (member_id in (select id from members where private.trains_base(base_id)));
create policy results_trainer_write on results for insert with check (member_id in (select id from members where private.trains_base(base_id)));
create policy results_own          on results for select using (member_id in (select private.my_member_ids()));

-- Veřejný žebříček bez celých jmen se doplní jako pohled (view) až po rozhodnutí klubu o zveřejňování jmen.
