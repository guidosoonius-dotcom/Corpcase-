-- Corpcase — volledige databasestructuur.
--
-- Dit bestand beschrijft de eindtoestand van het schema en kan een leeg Supabase-project in één
-- keer inrichten. De losse migraties zijn met de Supabase-tooling toegepast onder de namen
-- corpcase_speltabellen, corpcase_rls_policies, corpcase_helpers_naar_intern_schema,
-- corpcase_fk_indexen, deelnemers_eigen_fase, sessies_beheercode_niet_publiek,
-- sessies_publiek_alleen_lezen, sessies_lezen_zonder_zelfreferentie_bij_aanmaken en
-- deelnemers_joinen_via_security_definer_en_lezen_zonder_zelfreferentie; dit bestand is daarvan
-- het samengevoegde resultaat.
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

-- Eén enum voor twee spellen. De eerste zeven waarden zijn de use-casesessie, de zes daarna de
-- processessie; alleen 'lobby' is gedeeld. Welke reeks bij welk spel hoort staat in
-- src/lib/supabase/types.ts (FASES_PER_SPELSOORT) — de database bewaakt hier alleen dat er geen
-- fase in terechtkomt die geen van beide spellen kent.
--
-- Bij een bestaande database gaan de zes nieuwe waarden erin met
-- `alter type fase add value if not exists '<naam>';`, elk in een eigen statement: Postgres staat
-- `add value` niet toe binnen een transactieblok met ander werk.
create type fase as enum (
  'lobby',
  'verkennen',
  'identificatie',
  'waardebepaling',
  'prioritering',
  'roadmap',
  'opbrengst',
  'proceskeuze',
  'afpellen',
  'diagnose',
  'herontwerp',
  'doorrekenen',
  'besluit'
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
  -- Welk van de twee spellen dit is. Default 'usecases', zodat bestaande sessies blijven wat ze zijn.
  spelsoort text not null default 'usecases' check (spelsoort in ('usecases', 'proces')),
  speelmodus text not null,
  fase fase not null default 'lobby',
  -- Momentopname van een afgeronde use-casesessie waar deze processessie op volgt; null als hij
  -- los gespeeld wordt. Bewust een kopie en geen verwijzing: zie het type Herkomst in
  -- src/lib/supabase/types.ts.
  herkomst jsonb,
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
  -- Nullable: een facilitator kan kiezen alleen te begeleiden, zonder zelf een rol te spelen.
  -- Reguliere deelnemers (via /deelnemen) kiezen nog altijd verplicht een rol; dat wordt
  -- client-side afgedwongen, niet hier — er is geen kolom die "is facilitator" en "heeft rol"
  -- aan elkaar koppelt zonder een check die bij elke nieuwe speelvorm weer bijgewerkt moet worden.
  rol_id text,
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

-- Fase 1: een zelf toegevoegde signaalkaart, vooralsnog alleen voor de uitdaging-lens. Staat los
-- van de statische signaalbibliotheek in content/ (zie de toelichting bovenaan dit bestand) —
-- precies zoals sessie_usecases hieronder los staat van de use-casebibliotheek. `signaal_id` in
-- signaal_selecties verwijst naar zo'n rij hier op dezelfde manier als naar een statische kaart:
-- als vrije tekst, zonder foreign key.
create table eigen_signalen (
  id uuid primary key default gen_random_uuid(),
  sessie_id uuid not null references sessies (id) on delete cascade,
  auteur_id uuid not null references deelnemers (id) on delete cascade,
  lens text not null default 'uitdaging',
  titel text not null,
  tekst text not null default '',
  aangemaakt_op timestamptz not null default now()
);

create index eigen_signalen_sessie_idx on eigen_signalen (sessie_id);

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

-- De processessie ------------------------------------------------------------
--
-- Fase 1: het proces dat op tafel gaat. `functie_id` verwijst naar een bedrijfsfunctie in
-- content/processen/cora-bedrijfsfuncties.json — als vrije tekst zonder foreign key, net als bij
-- de signaalkaarten: de contentbibliotheek leeft buiten de database.
create table sessie_processen (
  id uuid primary key default gen_random_uuid(),
  sessie_id uuid not null references sessies (id) on delete cascade,
  functie_id text not null,
  titel text not null,
  aanleiding text not null default '',
  -- Wordt in fase 3 gezet: 'iteratief', 'nieuw' of 'niet-nu'. Null zolang de diagnose loopt.
  spoor text check (spoor in ('iteratief', 'nieuw', 'niet-nu')),
  -- Alleen gevuld als het team afwijkt van het advies; dan is de onderbouwing verplicht in de UI.
  spoor_motivatie text not null default '',
  eigenaar_id uuid references deelnemers (id) on delete set null,
  aangemaakt_op timestamptz not null default now(),
  bijgewerkt_op timestamptz not null default now()
);

create index sessie_processen_sessie_idx on sessie_processen (sessie_id);

-- Fase 2: de stappen op de procesplaat. Eén rechte lijn per `soort`, met uitzonderingen ernaast.
--
-- `volgorde` wordt bij het verplaatsen in één keer voor alle stappen van een proces herschreven
-- (zie herordenStappen), niet per stap opgehoogd: twee mensen die tegelijk schuiven leveren dan
-- een volledige volgorde op in plaats van twee halve.
create table proces_stappen (
  id uuid primary key default gen_random_uuid(),
  sessie_id uuid not null references sessies (id) on delete cascade,
  proces_id uuid not null references sessie_processen (id) on delete cascade,
  volgorde integer not null default 0,
  naam text not null,
  -- Rol of afdeling die de stap doet; waar die tussen twee stappen wisselt, markeert de plaat een
  -- overdracht. Vrije tekst: niet elke uitvoerder is een rol uit het spel.
  uitvoerder text not null default '',
  knelpunt text not null default '',
  -- Een stap die maar in een deel van de gevallen langskomt; hangt naast de hoofdlijn.
  uitzondering boolean not null default false,
  -- 'huidig' is het proces zoals het loopt, 'nieuw' het herontwerp dat er in fase 4 naast komt.
  soort text not null default 'huidig' check (soort in ('huidig', 'nieuw')),
  -- Welke huidige stappen deze nieuwe stap vervangt. Vrije uuid's, geen foreign key: een stap die
  -- later wordt weggegooid mag deze rij niet meeslepen.
  vervangt uuid[] not null default '{}',
  -- Wie deze stap toevoegde. Staat zichtbaar op de plaat, zodat werk een gezicht houdt.
  toegevoegd_door uuid references deelnemers (id) on delete set null,
  aangemaakt_op timestamptz not null default now(),
  bijgewerkt_op timestamptz not null default now()
);

create index proces_stappen_sessie_idx on proces_stappen (sessie_id);
create index proces_stappen_proces_idx on proces_stappen (proces_id);

-- Fase 3: de diagnose. Eén rij per speler per proces — niet één gedeeld document zoals
-- `waarderingen` — want het gemiddelde moet over ieders eigen score gaan, niet over wie het laatst
-- een schuif aanraakte. Zelfde patroon als `signaal_selecties`: een rij per deelnemer, her-upsertbaar.
create table proces_diagnoses (
  id uuid primary key default gen_random_uuid(),
  sessie_id uuid not null references sessies (id) on delete cascade,
  proces_id uuid not null references sessie_processen (id) on delete cascade,
  deelnemer_id uuid not null references deelnemers (id) on delete cascade,
  -- De vijf assen: pijn, volume, variatie, datakwaliteit, strategisch_belang. Een as die nog niet
  -- gescoord is staat er niet in — net als kwalitatief/haalbaarheid — zodat "nog niet gescoord" en
  -- "bewust een 1" nooit door elkaar lopen.
  scores jsonb not null default '{}'::jsonb,
  aangemaakt_op timestamptz not null default now(),
  bijgewerkt_op timestamptz not null default now(),
  unique (proces_id, deelnemer_id)
);

create index proces_diagnoses_sessie_idx on proces_diagnoses (sessie_id);
create index proces_diagnoses_proces_idx on proces_diagnoses (proces_id);

-- Fase 4: een verbetering. Dekt beide sporen met één tabel: op het iteratieve spoor hangt hij aan
-- een 'huidig'-stap met een manoeuvre; op het new-practice-spoor aan een 'nieuw'-stap zonder
-- manoeuvre (die stap draagt zijn eigen vervangt[] al). drivers/kosten staan er in exact de vorm
-- van WaarderingRij, zodat berekenBusinessCase ze zonder omweg kan lezen — gevuld worden ze pas
-- bij het doorrekenen; hier blijven ze op hun default.
create table proces_verbeteringen (
  id uuid primary key default gen_random_uuid(),
  sessie_id uuid not null references sessies (id) on delete cascade,
  proces_id uuid not null references sessie_processen (id) on delete cascade,
  stap_id uuid references proces_stappen (id) on delete set null,
  manoeuvre text check (manoeuvre in
    ('voorkomen', 'schrappen', 'samenvoegen', 'verplaatsen', 'automatiseren', 'standaardiseren', 'verrijken')),
  titel text not null,
  toelichting text not null default '',
  -- Verwijst naar Herkomst.portfolio[].id (zie types.ts) — vrije tekst zonder foreign key: die use
  -- case leeft in een snapshot, niet in een tabel die deze sessie kan joinen.
  usecase_ref text,
  drivers jsonb not null default '[]'::jsonb,
  kosten jsonb not null default '{"eenmalig": 0, "jaarlijks": 0, "capaciteit": 0}'::jsonb,
  toegevoegd_door uuid references deelnemers (id) on delete set null,
  aangemaakt_op timestamptz not null default now(),
  bijgewerkt_op timestamptz not null default now()
);

create index proces_verbeteringen_sessie_idx on proces_verbeteringen (sessie_id);
create index proces_verbeteringen_proces_idx on proces_verbeteringen (proces_id);
create index proces_verbeteringen_stap_idx on proces_verbeteringen (stap_id);

create trigger sessies_bijgewerkt before update on sessies
for each row execute function zet_bijgewerkt_op();
create trigger sessie_usecases_bijgewerkt before update on sessie_usecases
for each row execute function zet_bijgewerkt_op();
create trigger waarderingen_bijgewerkt before update on waarderingen
for each row execute function zet_bijgewerkt_op();
create trigger allocaties_bijgewerkt before update on allocaties
for each row execute function zet_bijgewerkt_op();
create trigger sessie_processen_bijgewerkt before update on sessie_processen
for each row execute function zet_bijgewerkt_op();
create trigger proces_stappen_bijgewerkt before update on proces_stappen
for each row execute function zet_bijgewerkt_op();
create trigger proces_diagnoses_bijgewerkt before update on proces_diagnoses
for each row execute function zet_bijgewerkt_op();
create trigger proces_verbeteringen_bijgewerkt before update on proces_verbeteringen
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

-- Voor het joinen zelf: `sessies_lezen` staat met opzet geen lookup via de join_code toe (zie het
-- commentaar bij die policy). Een rechtstreekse subquery op `sessies` in `deelnemers_joinen` zou
-- daardoor nóóit een sessie vinden voor een gewone deelnemer — de subquery zelf valt óók onder
-- die RLS. Vandaar hier, net als bij `is_facilitator`/`is_deelnemer`, een `security definer`
-- die de sessies-RLS bewust omzeilt voor precies deze ene vergelijking.
create or replace function intern.sessie_toegankelijk_via_code(sid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.sessies s
    where s.id = sid
      and (
        s.join_code = intern.header_waarde('x-join-code')
        or s.beheer_code = intern.header_waarde('x-beheer-code')
      )
  );
$$;

grant execute on all functions in schema intern to anon, authenticated;

alter table sessies enable row level security;
alter table deelnemers enable row level security;
alter table signaal_selecties enable row level security;
alter table eigen_signalen enable row level security;
alter table sessie_usecases enable row level security;
alter table usecase_signalen enable row level security;
alter table waarderingen enable row level security;
alter table bijdragen enable row level security;
alter table allocaties enable row level security;
alter table realiteitscheck_besluiten enable row level security;
alter table roadmap_items enable row level security;
alter table sessie_processen enable row level security;
alter table proces_stappen enable row level security;
alter table proces_diagnoses enable row level security;
alter table proces_verbeteringen enable row level security;

-- De basistabel is met opzet alleen leesbaar met bewezen facilitatorstatus. Een rijbeleid filtert
-- rijen, geen kolommen: zou deze policy hier ook `is_deelnemer` of de joincode toelaten, dan kon
-- iedereen die de joincode kent — die is juist bedoeld om rond te sturen — met een gericht
-- `select=beheer_code`-verzoek de beheercode van diezelfde rij meelezen en zich zo tot
-- facilitator bevorderen. De brede zichtbaarheid zit in de view `sessies_publiek` verderop.
--
-- De rechtstreekse kolomvergelijking staat er niet naast `is_facilitator(id)` voor de leesbaarheid
-- maar noodgedwongen: `is_facilitator` doet een subquery op `sessies` zelf, en die subquery
-- gebruikt het snapshot van vóór het huidige statement. Bij `insert into sessies (...) returning
-- *` — wat supabase-js altijd doet — bestaat de zojuist ingevoegde rij dus nog niet voor die
-- subquery, en gaf dat "new row violates row-level security policy for table sessies" bij elke
-- sessiecreatie. De rechtstreekse vergelijking toetst de kolom van de rij die RETURNING al in
-- handen heeft, zonder herquery, en werkt daardoor wél meteen na een insert in hetzelfde statement.
create policy sessies_lezen on sessies for select
  using (
    beheer_code = intern.header_waarde('x-beheer-code')
    or intern.is_facilitator(id)
  );

create policy sessies_aanmaken on sessies for insert with check (true);

create policy sessies_wijzigen on sessies for update
  using (intern.is_facilitator(id)) with check (intern.is_facilitator(id));

create policy sessies_verwijderen on sessies for delete using (intern.is_facilitator(id));

-- Dezelfde reden voor de rechtstreekse kolomcheck als bij `sessies_lezen`: `is_deelnemer` doet een
-- subquery op `deelnemers` zelf, die de zojuist ingevoegde rij nog niet ziet bij `insert ...
-- returning` in hetzelfde statement — wat supabase-js altijd doet.
create policy deelnemers_lezen on deelnemers for select
  using (
    token = intern.huidig_token()
    or intern.is_deelnemer(sessie_id)
    or intern.is_facilitator(sessie_id)
  );

create policy deelnemers_joinen on deelnemers for insert
  with check (intern.sessie_toegankelijk_via_code(sessie_id));

create policy deelnemers_wijzigen on deelnemers for update
  using (token = intern.huidig_token() or intern.is_facilitator(sessie_id))
  with check (token = intern.huidig_token() or intern.is_facilitator(sessie_id));

create policy deelnemers_verwijderen on deelnemers for delete
  using (intern.is_facilitator(sessie_id));

-- Spelinhoud: iedereen in de sessie mag alles zien en bijdragen. Dat is het punt van het spel:
-- spelers vullen elkaars use cases aan. Wie niet in de sessie zit, ziet niets.
create policy signaal_selecties_alles on signaal_selecties for all
  using (intern.is_deelnemer(sessie_id)) with check (intern.is_deelnemer(sessie_id));

create policy eigen_signalen_alles on eigen_signalen for all
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

-- De processessie: spelinhoud, dus dezelfde regel als hierboven. Iedereen aan tafel mag de
-- procesplaat bewerken; wie wat toevoegde staat erbij, en verwijderen vraagt in de interface om
-- een bevestiging. Dat is een afspraak tussen collega's, geen rechtenkwestie.
create policy sessie_processen_alles on sessie_processen for all
  using (intern.is_deelnemer(sessie_id)) with check (intern.is_deelnemer(sessie_id));

create policy proces_stappen_alles on proces_stappen for all
  using (intern.is_deelnemer(sessie_id)) with check (intern.is_deelnemer(sessie_id));

create policy proces_diagnoses_alles on proces_diagnoses for all
  using (intern.is_deelnemer(sessie_id)) with check (intern.is_deelnemer(sessie_id));

create policy proces_verbeteringen_alles on proces_verbeteringen for all
  using (intern.is_deelnemer(sessie_id)) with check (intern.is_deelnemer(sessie_id));

-- Publieke aanzicht op sessies, zonder beheer_code ---------------------------
--
-- Postgres kent geen policies op views; deze bepaalt de zichtbaarheid daarom zelf in de
-- WHERE-clausule (dezelfde voorwaarde als de oude, bredere `sessies_lezen`), met de rechten van
-- de vieweigenaar zodat hij de nu striktere basistabel nog wel mag lezen. Dat maakt hem een
-- "SECURITY DEFINER view" — de Supabase-linter meldt dat terecht als aandachtspunt, maar het is
-- hier de bedoeling: zonder de eigenaarsrechten zou de view net zo min als een gewone deelnemer
-- door de facilitator-only basistabel heen kunnen kijken.
--
-- Alleen SELECT-rechten: een view op één tabel zonder join of aggregatie is voor Postgres een
-- "simple view" en kan automatisch updatable zijn, met de rechten van de eigenaar — dus zonder de
-- expliciete revoke hieronder zouden schrijfacties via deze view rond de eigen RLS van `sessies`
-- heen kunnen gaan. Nieuwe objecten in dit project krijgen bij aanmaken standaard bredere grants
-- dan alleen select; die worden hier meteen teruggedraaid.
create view sessies_publiek
with (security_invoker = false)
as
select
  id, titel, organisatie_id, spelsoort, speelmodus, fase, herkomst, join_code, budget_geld,
  budget_capaciteit, uitgangspunten, onzekerheid_pct, fase_deadline, aangemaakt_op, bijgewerkt_op,
  afgerond_op
from sessies s
where
  intern.is_deelnemer(s.id)
  or s.join_code = intern.header_waarde('x-join-code')
  or intern.is_facilitator(s.id);

grant select on sessies_publiek to anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on sessies_publiek from anon, authenticated;
