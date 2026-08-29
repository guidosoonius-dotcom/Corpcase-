-- Corpcase — volledige databasestructuur.
--
-- Dit bestand beschrijft de eindtoestand van het schema en kan een leeg Supabase-project in één
-- keer inrichten. De losse migraties zijn met de Supabase-tooling toegepast onder de namen
-- corpcase_speltabellen, corpcase_rls_policies, corpcase_helpers_naar_intern_schema,
-- corpcase_fk_indexen en deelnemers_eigen_fase; dit bestand is daarvan het samengevoegde
-- resultaat.
--
-- Twee ontwerpkeuzes die de rest verklaren:
--
-- 1. De inhoudelijke bibliotheek (CORA-domeinen, signaalkaarten, use cases, waardemodel,
--    spelinstellingen) staat NIET in de database. Die leeft in content/ en wordt met de applicatie
--    meegebouwd en gevalideerd. De database bewaart alleen sessiestate en verwijst naar die
--    content met tekstuele ids. Zo kan er geen drift ontstaan tussen wat de app kent en wat de
--    database opslaat, en is er geen seed-stap nodig om de app te kunnen draaien.
--
-- 2. Er zijn geen accounts. Een deelnemer bewijst zich met een token dat hij bij het joinen krijgt,
--    de facilitator met de beheercode. Beide gaan als HTTP-header mee en worden in de policies
--    gecontroleerd. De publieke sleutel alleen geeft dus nergens toegang toe.

-- Typen ----------------------------------------------------------------------

create type fase as enum (
  'lobby',
  'verkennen',
  'identificatie',
  'waardebepaling',
  'prioritering',
  'roadmap',
  'opbrengst'
);

create type usecase_status as enum ('kandidaat', 'portfolio', 'afgevallen');
create type waardemodus as enum ('scorekaart', 'businesscase');
create type bijdrage_soort as enum ('hulpvraag', 'assist', 'challenge', 'opmerking');
create type check_besluit as enum ('aanpassen', 'handhaven');

create or replace function zet_bijgewerkt_op()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.bijgewerkt_op = now();
  return new;
end;
$$;

-- Tabellen -------------------------------------------------------------------

create table sessies (
  id uuid primary key default gen_random_uuid(),
  titel text not null,
  organisatie_id text not null,
  speelmodus text not null,
  fase fase not null default 'lobby',
  join_code text not null unique,
  beheer_code text not null unique,
  budget_geld numeric(14, 2) not null,
  budget_capaciteit numeric(8, 2) not null,
  -- Overschrijfbare rekenkundige uitgangspunten (uurtarief, dagopbrengst, volumes).
  uitgangspunten jsonb not null default '{}'::jsonb,
  onzekerheid_pct smallint not null default 30 check (onzekerheid_pct between 0 and 100),
  fase_deadline timestamptz,
  aangemaakt_op timestamptz not null default now(),
  bijgewerkt_op timestamptz not null default now(),
  afgerond_op timestamptz
);

create table deelnemers (
  id uuid primary key default gen_random_uuid(),
  sessie_id uuid not null references sessies (id) on delete cascade,
  naam text not null,
  rol_id text not null,
  rolopdracht_id text,
  -- Geheim per deelnemer; bewijst wie je bent zonder account. Staat in localStorage.
  token text not null unique,
  is_facilitator boolean not null default false,
  laatst_gezien_op timestamptz not null default now(),
  aangemaakt_op timestamptz not null default now(),
  -- Eigen navigatiepositie, los van sessies.fase. Null = volgt de groep automatisch mee; een
  -- waarde = zelf naar een andere fase genavigeerd. Geen aparte RLS-policy nodig: de bestaande
  -- deelnemers_wijzigen staat een deelnemer al toe zijn eigen rij te updaten.
  eigen_fase fase
);

create index deelnemers_sessie_idx on deelnemers (sessie_id);

-- Fase 1: welke signalen herkent een speler, en hoe hard?
create table signaal_selecties (
  id uuid primary key default gen_random_uuid(),
  sessie_id uuid not null references sessies (id) on delete cascade,
  deelnemer_id uuid not null references deelnemers (id) on delete cascade,
  signaal_id text not null,
  herkenning smallint not null default 3 check (herkenning between 1 and 5),
  notitie text,
  aangemaakt_op timestamptz not null default now(),
  unique (deelnemer_id, signaal_id)
);

create index signaal_selecties_sessie_idx on signaal_selecties (sessie_id);

-- Fase 2: een use case in deze sessie. Komt uit de bibliotheek of is zelf bedacht.
create table sessie_usecases (
  id uuid primary key default gen_random_uuid(),
  sessie_id uuid not null references sessies (id) on delete cascade,
  bibliotheek_id text,
  titel text not null,
  probleem text not null default '',
  oplossingsrichting text not null default '',
  domein text not null,
  benodigde_data text[] not null default '{}',
  aandachtspunten text[] not null default '{}',
  eigenaar_id uuid references deelnemers (id) on delete set null,
  status usecase_status not null default 'kandidaat',
  aangemaakt_op timestamptz not null default now(),
  bijgewerkt_op timestamptz not null default now()
);

create index sessie_usecases_sessie_idx on sessie_usecases (sessie_id);
create index sessie_usecases_eigenaar_idx on sessie_usecases (eigenaar_id);

-- Welke signalen onderbouwen deze use case: de herleidbaarheid naar het jaarverslag.
create table usecase_signalen (
  usecase_id uuid not null references sessie_usecases (id) on delete cascade,
  signaal_id text not null,
  primary key (usecase_id, signaal_id)
);

-- Fase 3: waardebepaling. Scorekaart en business case staan naast elkaar; modus bepaalt
-- welke van de twee leidend is voor de matrix.
create table waarderingen (
  usecase_id uuid primary key references sessie_usecases (id) on delete cascade,
  sessie_id uuid not null references sessies (id) on delete cascade,
  modus waardemodus not null default 'scorekaart',
  scorekaart jsonb not null default '{}'::jsonb,
  drivers jsonb not null default '[]'::jsonb,
  kwalitatief jsonb not null default '{}'::jsonb,
  haalbaarheid jsonb not null default '{}'::jsonb,
  kosten jsonb not null default '{"eenmalig": 0, "jaarlijks": 0, "capaciteit": 0}'::jsonb,
  bijgewerkt_door uuid references deelnemers (id) on delete set null,
  bijgewerkt_op timestamptz not null default now()
);

create index waarderingen_sessie_idx on waarderingen (sessie_id);
create index waarderingen_bijgewerkt_door_idx on waarderingen (bijgewerkt_door);

-- Elkaar helpen: hulpvraag, assist, challenge en opmerking lopen door dezelfde tabel,
-- zodat een assist zichtbaar aan de hulpvraag hangt die hem opriep.
create table bijdragen (
  id uuid primary key default gen_random_uuid(),
  sessie_id uuid not null references sessies (id) on delete cascade,
  usecase_id uuid references sessie_usecases (id) on delete cascade,
  deelnemer_id uuid not null references deelnemers (id) on delete cascade,
  soort bijdrage_soort not null,
  tekst text not null,
  -- Een assist verwijst naar de hulpvraag die hij beantwoordt.
  beantwoordt_id uuid references bijdragen (id) on delete set null,
  opgelost boolean not null default false,
  aangemaakt_op timestamptz not null default now()
);

create index bijdragen_sessie_idx on bijdragen (sessie_id);
create index bijdragen_usecase_idx on bijdragen (usecase_id);
create index bijdragen_beantwoordt_idx on bijdragen (beantwoordt_id);
create index bijdragen_deelnemer_idx on bijdragen (deelnemer_id);

-- Fase 4: verdeling van de begrensde investeringsruimte.
create table allocaties (
  usecase_id uuid primary key references sessie_usecases (id) on delete cascade,
  sessie_id uuid not null references sessies (id) on delete cascade,
  geld_eur numeric(14, 2) not null default 0,
  capaciteit_mensmaanden numeric(8, 2) not null default 0,
  bijgewerkt_op timestamptz not null default now()
);

create index allocaties_sessie_idx on allocaties (sessie_id);

-- Fase 4: uitkomst van elke realiteitscheck. Niet beslissen is de enige verkeerde uitkomst,
-- dus zowel aanpassen als onderbouwd handhaven wordt vastgelegd.
create table realiteitscheck_besluiten (
  id uuid primary key default gen_random_uuid(),
  sessie_id uuid not null references sessies (id) on delete cascade,
  check_id text not null,
  besluit check_besluit not null,
  motivatie text not null default '',
  aangemaakt_op timestamptz not null default now(),
  unique (sessie_id, check_id)
);

-- Fase 5: roadmap.
create table roadmap_items (
  usecase_id uuid primary key references sessie_usecases (id) on delete cascade,
  sessie_id uuid not null references sessies (id) on delete cascade,
  horizon text not null,
  volgorde integer not null default 0,
  randvoorwaarden text not null default '',
  afhankelijk_van uuid[] not null default '{}',
  bijgewerkt_op timestamptz not null default now()
);

create index roadmap_items_sessie_idx on roadmap_items (sessie_id);

create trigger sessies_bijgewerkt before update on sessies
for each row execute function zet_bijgewerkt_op();
create trigger sessie_usecases_bijgewerkt before update on sessie_usecases
for each row execute function zet_bijgewerkt_op();
create trigger waarderingen_bijgewerkt before update on waarderingen
for each row execute function zet_bijgewerkt_op();
create trigger allocaties_bijgewerkt before update on allocaties
for each row execute function zet_bijgewerkt_op();
create trigger roadmap_items_bijgewerkt before update on roadmap_items
for each row execute function zet_bijgewerkt_op();

-- Toegangsmodel --------------------------------------------------------------
--
-- De helpers staan in het schema `intern`, dat PostgREST niet aanbiedt: policies kunnen ze
-- gebruiken, maar ze zijn niet van buitenaf als endpoint aan te roepen. Ze zijn security definer
-- zodat een policy op deelnemers niet zichzelf hoeft te raadplegen, wat tot recursie zou leiden.

create schema if not exists intern;
grant usage on schema intern to anon, authenticated;

create or replace function intern.header_waarde(naam text)
returns text language sql stable set search_path = '' as $$
  select nullif(current_setting('request.headers', true)::json ->> naam, '');
$$;

create or replace function intern.huidig_token()
returns text language sql stable set search_path = '' as $$
  select intern.header_waarde('x-deelnemer-token');
$$;

create or replace function intern.is_deelnemer(sid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.deelnemers d
    where d.sessie_id = sid and d.token = intern.huidig_token()
  );
$$;

create or replace function intern.is_facilitator(sid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.sessies s
    where s.id = sid and s.beheer_code = intern.header_waarde('x-beheer-code')
  )
  or exists (
    select 1 from public.deelnemers d
    where d.sessie_id = sid and d.token = intern.huidig_token() and d.is_facilitator
  );
$$;

create or replace function intern.mag_bij_usecase(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.sessie_usecases u
    where u.id = uid and intern.is_deelnemer(u.sessie_id)
  );
$$;

grant execute on all functions in schema intern to anon, authenticated;

alter table sessies enable row level security;
alter table deelnemers enable row level security;
alter table signaal_selecties enable row level security;
alter table sessie_usecases enable row level security;
alter table usecase_signalen enable row level security;
alter table waarderingen enable row level security;
alter table bijdragen enable row level security;
alter table allocaties enable row level security;
alter table realiteitscheck_besluiten enable row level security;
alter table roadmap_items enable row level security;

-- Vinden op join-code mag voordat je deelnemer bent; dat is de enige manier om te joinen.
create policy sessies_lezen on sessies for select
  using (
    intern.is_deelnemer(id)
    or join_code = intern.header_waarde('x-join-code')
    or beheer_code = intern.header_waarde('x-beheer-code')
  );

create policy sessies_aanmaken on sessies for insert with check (true);

create policy sessies_wijzigen on sessies for update
  using (intern.is_facilitator(id)) with check (intern.is_facilitator(id));

create policy sessies_verwijderen on sessies for delete using (intern.is_facilitator(id));

create policy deelnemers_lezen on deelnemers for select
  using (intern.is_deelnemer(sessie_id) or intern.is_facilitator(sessie_id));

create policy deelnemers_joinen on deelnemers for insert
  with check (
    exists (
      select 1 from sessies s
      where s.id = sessie_id
        and (
          s.join_code = intern.header_waarde('x-join-code')
          or s.beheer_code = intern.header_waarde('x-beheer-code')
        )
    )
  );

create policy deelnemers_wijzigen on deelnemers for update
  using (token = intern.huidig_token() or intern.is_facilitator(sessie_id))
  with check (token = intern.huidig_token() or intern.is_facilitator(sessie_id));

create policy deelnemers_verwijderen on deelnemers for delete
  using (intern.is_facilitator(sessie_id));

-- Spelinhoud: iedereen in de sessie mag alles zien en bijdragen. Dat is het punt van het spel:
-- spelers vullen elkaars use cases aan. Wie niet in de sessie zit, ziet niets.
create policy signaal_selecties_alles on signaal_selecties for all
  using (intern.is_deelnemer(sessie_id)) with check (intern.is_deelnemer(sessie_id));

create policy sessie_usecases_alles on sessie_usecases for all
  using (intern.is_deelnemer(sessie_id)) with check (intern.is_deelnemer(sessie_id));

create policy usecase_signalen_alles on usecase_signalen for all
  using (intern.mag_bij_usecase(usecase_id)) with check (intern.mag_bij_usecase(usecase_id));

create policy waarderingen_alles on waarderingen for all
  using (intern.is_deelnemer(sessie_id)) with check (intern.is_deelnemer(sessie_id));

create policy bijdragen_alles on bijdragen for all
  using (intern.is_deelnemer(sessie_id)) with check (intern.is_deelnemer(sessie_id));

create policy allocaties_alles on allocaties for all
  using (intern.is_deelnemer(sessie_id)) with check (intern.is_deelnemer(sessie_id));

create policy realiteitscheck_besluiten_alles on realiteitscheck_besluiten for all
  using (intern.is_deelnemer(sessie_id)) with check (intern.is_deelnemer(sessie_id));

create policy roadmap_items_alles on roadmap_items for all
  using (intern.is_deelnemer(sessie_id)) with check (intern.is_deelnemer(sessie_id));
