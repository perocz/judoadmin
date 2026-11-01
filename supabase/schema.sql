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

-- ---------------------------------------------------------------- ochrana profilu

-- Uživatel smí ve svém profilu měnit jen must_change_password; vše ostatní (jméno, uživatelské
-- jméno, vazba na člena) jen admin. Bez toho by si šlo připojit libovolného člena.
create function private.guard_profile_update() returns trigger
  language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and not private.has_role('admin')
     and (new.id, new.full_name, new.username, new.member_id, new.created_at)
         is distinct from (old.id, old.full_name, old.username, old.member_id, old.created_at) then
    raise exception 'Tento údaj smí měnit jen správce';
  end if;
  return new;
end $$;
revoke execute on function private.guard_profile_update() from public, anon, authenticated;

create trigger profiles_guard before update on profiles
  for each row execute function private.guard_profile_update();

create policy profiles_self_update on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Typ členského příspěvku a příznak "smí na jakýkoli trénink"
create type membership_type as enum ('unlimited','standard');
alter table members
  add column membership membership_type not null default 'standard',
  add column any_training boolean not null default false;

create policy members_trainer_update on members for update
  using (private.trains_base(base_id))
  with check (private.trains_base(base_id));

create or replace function private.guard_member_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and not private.has_role('admin')
     and (to_jsonb(new) - 'membership' - 'any_training')
         is distinct from (to_jsonb(old) - 'membership' - 'any_training') then
    raise exception 'Trenér smí měnit jen typ příspěvku a příznaky';
  end if;
  return new;
end $$;

create trigger guard_member_update before update on members
  for each row execute function private.guard_member_update();

-- ============ Tréninky (rozvrh jako akce typu 'trenink') ============
-- (aplikováno migracemi trainings_enum a trainings_schedule; generování každé pondělí v 3:00 přes pg_cron)
alter type event_type add value if not exists 'trenink';
create type training_status as enum ('planned','cancelled','cancelled_replacement');
create type registration_status as enum ('attending','excused');
alter table bases add column venue text, add column address text;
create table training_slots (
  id uuid primary key default gen_random_uuid(),
  base_id uuid not null references bases(id) on delete cascade,
  weekday int not null check (weekday between 1 and 7),
  starts_at time not null,
  ends_at time not null check (ends_at > starts_at),
  label text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
-- + sloupce events (base_id, slot_id, starts_at, ends_at, training_status, replacement_base_ids),
--   registrations (status, late_excuse), funkce private.generate_trainings(weeks),
--   trigger private.guard_registration (uzávěrka: trénink 1 h, ostatní akce 1 den), policies slots_* a events_trainer.
--   Přesné znění je v migraci trainings_schedule.

-- Typ příspěvku podle ceníku od 9/2026: novacek (1x týdně) / aktivni (až 4x týdně); příznak any_training zrušen
alter type membership_type rename value 'standard' to 'novacek';
alter type membership_type rename value 'unlimited' to 'aktivni';
alter table members drop column any_training;
create or replace function private.guard_member_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and not private.has_role('admin')
     and (to_jsonb(new) - 'membership') is distinct from (to_jsonb(old) - 'membership') then
    raise exception 'Trenér smí měnit jen typ příspěvku';
  end if;
  return new;
end $$;

-- Členství: novacek | hurikan | neaktivni (původně novacek | aktivni)
alter type membership_type rename value 'aktivni' to 'hurikan';
alter type membership_type add value if not exists 'neaktivni';

-- Docházka a přehled tréninků (migrace attendance_and_counts, registration_guard_excuse, trainer_sees_guests)
create table attendance (
  event_id uuid not null references events(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  marked_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  primary key (event_id, member_id)
);
-- + RLS att_admin, att_trainer (private.trains_event), att_own_read; reg_trainer_event; members_trainer_guest
--   (private.is_guest_of_my_training); public.training_counts(from_ts, to_ts) jen pro přihlášené;
--   guard_registration: omluva vždy (po uzávěrce s late_excuse), přihlášení/odhlášení do 1 h před tréninkem.

-- Základny Nová Ves, Smilovice, Skalice; členové jsou na tréninky své základny přihlášeni automaticky
-- (přihlášky = omluvy a hosté; public.training_counts to počítá); policy guardians_trainer (trenér spravuje vazbu rodič-dítě
-- u členů své základny). Viz migrace bases_defaults_trainer_scope.

-- Zakládání účtů: public.create_account(...) (admin: jakýkoli účet; trenér: rodič/člen u členů své základny),
-- počáteční heslo nastavuje funkce, účet musí při prvním přihlášení heslo změnit. Policy profiles_trainer_read,
-- guardians_trainer. Viz migrace create_account_function.

-- Trenéři na trénincích: user_roles.level (head|regular), trainer_attendance (excused = odhlášen z tréninku své základny,
-- attending = přihlášený host), public.training_trainers(from,to) pro správce a trenéry. Migrace trainers_on_trainings.

-- create_account má parametr p_level (hlavní | stálý trenér); trenér bez základny (base_id null) = trenér bez příznaku.
-- Migrace create_account_trainer_level.

-- Docházka: tabulka attendance přejmenována na absences = jen absence bez omluvy (migrace attendance_to_absences).
-- Přítomni jsou automaticky všichni členové základny bez omluvy a hosté; trenér zapisuje jen absenci.
