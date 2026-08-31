import { maakClient } from "@/lib/supabase/client";
import type {
  AllocatieRij,
  BijdrageRij,
  DeelnemerRij,
  Fase,
  RealiteitscheckBesluitRij,
  RoadmapItemRij,
  SessieRij,
  SessieState,
  SessieUsecaseRij,
  SignaalSelectieRij,
  UsecaseSignaalRij,
  UsecaseStatus,
  WaarderingRij,
} from "@/lib/supabase/types";
import { maakBeheerCode, maakJoinCode, maakToken, normaliseerCode } from "./codes";
import { organisatie, rolopdrachtVoorRol, speelmodus } from "@/lib/content";
import {
  SessieFout,
  type AllocatieInvoer,
  type BesluitInvoer,
  type BijdrageInvoer,
  type Identiteit,
  type NieuweSessie,
  type NieuweUsecase,
  type Opslag,
  type RoadmapInvoer,
  type SessieVelden,
  type SignaalInvoer,
  type Toegang,
  type UsecaseVelden,
  type WaarderingInvoer,
} from "./soorten";

/**
 * Opslag-implementatie op Supabase: het normale gebruik, met meerdere apparaten en een sessie
 * die bewaard blijft.
 *
 * Toegang wordt in de database afgedwongen met de RLS-policies uit supabase/schema.sql; deze
 * laag zet alleen de juiste headers en vertaalt fouten.
 */

function controleer<T>(resultaat: { data: T | null; error: { message: string } | null }, wat: string): T {
  if (resultaat.error) throw new SessieFout(`${wat}: ${resultaat.error.message}`);
  if (resultaat.data === null) throw new SessieFout(`${wat}: geen resultaat`);
  return resultaat.data;
}

/**
 * De basistabel `sessies` is met opzet alleen leesbaar met bewezen facilitatorstatus (policy
 * `sessies_lezen`, `is_facilitator(id)`): een rijbeleid filtert rijen, geen kolommen, en de
 * joincode is juist bedoeld om rond te sturen. Wie hem kende kon vroeger met één extra
 * PostgREST-verzoek de beheercode van diezelfde rij meelezen en zich zo tot facilitator
 * bevorderen. `sessies_publiek` is de view zonder die kolom, met de brede zichtbaarheid (deelnemer
 * of joincode) er zelf in verwerkt; alles wat een sessie aflevert aan wie nog niet bewezen heeft
 * facilitator te zijn, leest hiervandaan en nooit van `sessies` zelf.
 */
const SESSIE_PUBLIEK = "sessies_publiek";

function maskeerBeheercode(sessie: SessieRij): SessieRij {
  return { ...sessie, beheer_code: null };
}

// Aanmaken en joinen --------------------------------------------------------

/**
 * Maakt een sessie en meteen de facilitator als deelnemer.
 *
 * De facilitator speelt gewoon mee: hij kiest een rol en krijgt een rolopdracht. Alleen de
 * fasebesturing is van hem, en die hangt aan de beheercode.
 */
export async function maakSessie(invoer: NieuweSessie): Promise<Toegang> {
  const org = organisatie(invoer.organisatieId);
  const modus = speelmodus(invoer.speelmodusId);
  const joinCode = maakJoinCode();
  const beheerCode = maakBeheerCode();

  const uitgangspunten = Object.fromEntries(
    [...org.rekenkundige_uitgangspunten, ...org.kengetallen].map((k) => [k.id, k.waarde]),
  );

  const anoniem = maakClient({ beheerCode });

  const sessie = controleer(
    await anoniem
      .from("sessies")
      .insert({
        titel: invoer.titel,
        organisatie_id: org.id,
        speelmodus: modus.id,
        join_code: joinCode,
        beheer_code: beheerCode,
        budget_geld: invoer.budgetGeld ?? org.budget_defaults.geld_eur,
        budget_capaciteit:
          invoer.budgetCapaciteit ?? org.budget_defaults.verandercapaciteit_mensmaanden,
        uitgangspunten,
      })
      .select()
      .single(),
    "Sessie aanmaken",
  ) as SessieRij;

  const deelnemer = await voegDeelnemerToe({
    sessieId: sessie.id,
    naam: invoer.facilitatorNaam,
    rolId: invoer.facilitatorRolId,
    isFacilitator: true,
    identiteit: { beheerCode },
  });

  return {
    sessie: maskeerBeheercode(sessie),
    deelnemer,
    identiteit: { deelnemerToken: deelnemer.token, beheerCode },
  };
}

async function voegDeelnemerToe(args: {
  sessieId: string;
  naam: string;
  rolId: string | null;
  isFacilitator: boolean;
  identiteit: Identiteit;
}): Promise<DeelnemerRij> {
  const token = maakToken();
  const opdracht = rolopdrachtVoorRol(args.rolId);
  /*
   * Het eigen token moet als header mee op precies dit verzoek: de RLS-policy `deelnemers_lezen`
   * herkent de zojuist ingevoegde rij aan `token = huidig_token()`, en die header moet er dus al
   * bij staan vóórdat deze insert wordt uitgevoerd — een latere client met dit token erin helpt
   * de RETURNING van déze insert niet.
   */
  const client = maakClient({ ...args.identiteit, deelnemerToken: token });

  return controleer(
    await client
      .from("deelnemers")
      .insert({
        sessie_id: args.sessieId,
        naam: args.naam,
        rol_id: args.rolId,
        rolopdracht_id: opdracht?.id ?? null,
        token,
        is_facilitator: args.isFacilitator,
      })
      .select()
      .single(),
    "Deelnemer toevoegen",
  ) as DeelnemerRij;
}

/** Zoekt een sessie op join-code, zonder al deel te nemen. Voor het joinscherm. */
export async function zoekSessie(code: string): Promise<SessieRij | null> {
  const joinCode = normaliseerCode(code);
  if (joinCode.length === 0) return null;

  const client = maakClient({ joinCode });
  const { data, error } = await client
    .from(SESSIE_PUBLIEK)
    .select("*")
    .eq("join_code", joinCode)
    .maybeSingle();

  if (error) throw new SessieFout(`Sessie zoeken: ${error.message}`);
  if (!data) return null;
  return { ...(data as Omit<SessieRij, "beheer_code">), beheer_code: null };
}

export async function neemDeel(args: {
  code: string;
  naam: string;
  rolId: string;
}): Promise<Toegang> {
  const joinCode = normaliseerCode(args.code);
  const sessie = await zoekSessie(joinCode);
  if (!sessie) throw new SessieFout("Geen sessie gevonden met deze code.");
  if (sessie.afgerond_op) throw new SessieFout("Deze sessie is al afgerond.");

  const deelnemer = await voegDeelnemerToe({
    sessieId: sessie.id,
    naam: args.naam,
    rolId: args.rolId,
    isFacilitator: false,
    identiteit: { joinCode },
  });

  return { sessie, deelnemer, identiteit: { deelnemerToken: deelnemer.token } };
}

/**
 * Toegang terugkrijgen met alleen de beheercode — een ander apparaat, een nieuwe browser, of een
 * collega die het overneemt. De facilitator is óók gewoon deelnemer (`maakSessie` zet hem meteen
 * neer), dus dit levert dezelfde `Toegang` op als bij het starten van de sessie: geen aparte
 * "facilitator zonder deelnemer"-vorm die de rest van de applicatie apart zou moeten behandelen.
 *
 * Deze functie leest wél rechtstreeks van `sessies` (niet van `sessies_publiek`): `is_facilitator`
 * accepteert de beheercode al als header, en dat is precies wat hier net bewezen wordt.
 */
export async function facilitatorInloggen(beheerCode: string): Promise<Toegang> {
  const code = normaliseerCode(beheerCode);
  if (code.length === 0) throw new SessieFout("Onbekende beheercode.");

  const client = maakClient({ beheerCode: code });

  const { data: sessie, error: sessieFout } = await client
    .from("sessies")
    .select("*")
    .eq("beheer_code", code)
    .maybeSingle();
  if (sessieFout) throw new SessieFout(`Beheercode controleren: ${sessieFout.message}`);
  if (!sessie) throw new SessieFout("Onbekende beheercode.");

  const { data: deelnemer, error: deelnemerFout } = await client
    .from("deelnemers")
    .select("*")
    .eq("sessie_id", (sessie as SessieRij).id)
    .eq("is_facilitator", true)
    .maybeSingle();
  if (deelnemerFout) throw new SessieFout(`Facilitator ophalen: ${deelnemerFout.message}`);
  if (!deelnemer) throw new SessieFout("Geen facilitator gevonden bij deze sessie.");

  return {
    sessie: maskeerBeheercode(sessie as SessieRij),
    deelnemer: deelnemer as DeelnemerRij,
    identiteit: { deelnemerToken: (deelnemer as DeelnemerRij).token, beheerCode: code },
  };
}

// Lezen ---------------------------------------------------------------------

/**
 * Haalt de volledige sessiestate op in één ronde.
 *
 * Bewust alles tegelijk: een sessie is klein (tientallen rijen) en de views hebben vrijwel altijd
 * meerdere tabellen tegelijk nodig. Dat is eenvoudiger en sneller dan per component apart laden.
 */
export async function haalState(identiteit: Identiteit, sessieId: string): Promise<SessieState> {
  const client = maakClient(identiteit);

  const [
    sessie,
    deelnemers,
    selecties,
    usecases,
    usecaseSignalen,
    waarderingen,
    bijdragen,
    allocaties,
    besluiten,
    roadmap,
  ] = await Promise.all([
    client.from(SESSIE_PUBLIEK).select("*").eq("id", sessieId).single(),
    client.from("deelnemers").select("*").eq("sessie_id", sessieId).order("aangemaakt_op"),
    client.from("signaal_selecties").select("*").eq("sessie_id", sessieId),
    client.from("sessie_usecases").select("*").eq("sessie_id", sessieId).order("aangemaakt_op"),
    client.from("usecase_signalen").select("*"),
    client.from("waarderingen").select("*").eq("sessie_id", sessieId),
    client.from("bijdragen").select("*").eq("sessie_id", sessieId).order("aangemaakt_op"),
    client.from("allocaties").select("*").eq("sessie_id", sessieId),
    client.from("realiteitscheck_besluiten").select("*").eq("sessie_id", sessieId),
    client.from("roadmap_items").select("*").eq("sessie_id", sessieId).order("volgorde"),
  ]);

  return {
    sessie: maskeerBeheercode(controleer(sessie, "Sessie laden") as SessieRij),
    deelnemers: controleer(deelnemers, "Deelnemers laden") as DeelnemerRij[],
    selecties: controleer(selecties, "Signaalselecties laden") as SignaalSelectieRij[],
    usecases: controleer(usecases, "Use cases laden") as SessieUsecaseRij[],
    usecaseSignalen: controleer(usecaseSignalen, "Onderbouwing laden") as UsecaseSignaalRij[],
    waarderingen: controleer(waarderingen, "Waarderingen laden") as WaarderingRij[],
    bijdragen: controleer(bijdragen, "Bijdragen laden") as BijdrageRij[],
    allocaties: controleer(allocaties, "Allocaties laden") as AllocatieRij[],
    besluiten: controleer(besluiten, "Besluiten laden") as RealiteitscheckBesluitRij[],
    roadmap: controleer(roadmap, "Roadmap laden") as RoadmapItemRij[],
  };
}

// Fasebesturing (facilitator) ------------------------------------------------

export async function zetFase(identiteit: Identiteit, sessieId: string, fase: Fase): Promise<void> {
  const client = maakClient(identiteit);
  const { error } = await client.from("sessies").update({ fase }).eq("id", sessieId);
  if (error) throw new SessieFout(`Fase wijzigen: ${error.message}`);
}

export async function zetFaseDeadline(
  identiteit: Identiteit,
  sessieId: string,
  deadline: Date | null,
): Promise<void> {
  const client = maakClient(identiteit);
  const { error } = await client
    .from("sessies")
    .update({ fase_deadline: deadline?.toISOString() ?? null })
    .eq("id", sessieId);
  if (error) throw new SessieFout(`Timer zetten: ${error.message}`);
}

/**
 * Zelfbediening: een deelnemer stuurt zijn eigen rij bij, niet die van de sessie. De bestaande
 * update-policy op `deelnemers` staat dit al toe voor het eigen token; er is geen aparte
 * beheerscontrole nodig zoals bij `zetFase`.
 */
export async function zetEigenFase(
  identiteit: Identiteit,
  deelnemerId: string,
  fase: Fase | null,
): Promise<void> {
  const client = maakClient(identiteit);
  const { error } = await client
    .from("deelnemers")
    .update({ eigen_fase: fase })
    .eq("id", deelnemerId);
  if (error) throw new SessieFout(`Eigen fase wijzigen: ${error.message}`);
}

export async function wijzigSessie(
  identiteit: Identiteit,
  sessieId: string,
  velden: SessieVelden,
): Promise<void> {
  const client = maakClient(identiteit);
  const { error } = await client.from("sessies").update(velden).eq("id", sessieId);
  if (error) throw new SessieFout(`Sessie bijwerken: ${error.message}`);
}

// Fase 1: signalen ----------------------------------------------------------

export async function selecteerSignaal(
  identiteit: Identiteit,
  args: SignaalInvoer,
): Promise<void> {
  const client = maakClient(identiteit);
  const { error } = await client.from("signaal_selecties").upsert(
    {
      sessie_id: args.sessieId,
      deelnemer_id: args.deelnemerId,
      signaal_id: args.signaalId,
      herkenning: args.herkenning,
      notitie: args.notitie ?? null,
    },
    { onConflict: "deelnemer_id,signaal_id" },
  );
  if (error) throw new SessieFout(`Signaal opslaan: ${error.message}`);
}

export async function verwijderSignaalSelectie(
  identiteit: Identiteit,
  args: { deelnemerId: string; signaalId: string },
): Promise<void> {
  const client = maakClient(identiteit);
  const { error } = await client
    .from("signaal_selecties")
    .delete()
    .eq("deelnemer_id", args.deelnemerId)
    .eq("signaal_id", args.signaalId);
  if (error) throw new SessieFout(`Signaal verwijderen: ${error.message}`);
}

// Fase 2: use cases ---------------------------------------------------------

export async function voegUsecaseToe(
  identiteit: Identiteit,
  invoer: NieuweUsecase,
): Promise<SessieUsecaseRij> {
  const client = maakClient(identiteit);

  const usecase = controleer(
    await client
      .from("sessie_usecases")
      .insert({
        sessie_id: invoer.sessieId,
        eigenaar_id: invoer.eigenaarId,
        titel: invoer.titel,
        domein: invoer.domein,
        probleem: invoer.probleem ?? "",
        oplossingsrichting: invoer.oplossingsrichting ?? "",
        benodigde_data: invoer.benodigdeData ?? [],
        aandachtspunten: invoer.aandachtspunten ?? [],
        bibliotheek_id: invoer.bibliotheekId ?? null,
      })
      .select()
      .single(),
    "Use case toevoegen",
  ) as SessieUsecaseRij;

  if (invoer.signaalIds?.length) {
    await koppelSignalen(identiteit, usecase.id, invoer.signaalIds);
  }

  return usecase;
}

export async function koppelSignalen(
  identiteit: Identiteit,
  usecaseId: string,
  signaalIds: string[],
): Promise<void> {
  if (signaalIds.length === 0) return;
  const client = maakClient(identiteit);
  const { error } = await client
    .from("usecase_signalen")
    .upsert(signaalIds.map((signaal_id) => ({ usecase_id: usecaseId, signaal_id })));
  if (error) throw new SessieFout(`Onderbouwing koppelen: ${error.message}`);
}

export async function ontkoppelSignaal(
  identiteit: Identiteit,
  usecaseId: string,
  signaalId: string,
): Promise<void> {
  const client = maakClient(identiteit);
  const { error } = await client
    .from("usecase_signalen")
    .delete()
    .eq("usecase_id", usecaseId)
    .eq("signaal_id", signaalId);
  if (error) throw new SessieFout(`Onderbouwing ontkoppelen: ${error.message}`);
}

export async function wijzigUsecase(
  identiteit: Identiteit,
  usecaseId: string,
  velden: UsecaseVelden,
): Promise<void> {
  const client = maakClient(identiteit);
  const { error } = await client.from("sessie_usecases").update(velden).eq("id", usecaseId);
  if (error) throw new SessieFout(`Use case bijwerken: ${error.message}`);
}

export async function zetUsecaseStatus(
  identiteit: Identiteit,
  usecaseId: string,
  status: UsecaseStatus,
): Promise<void> {
  await wijzigUsecase(identiteit, usecaseId, { status });
}

export async function verwijderUsecase(identiteit: Identiteit, usecaseId: string): Promise<void> {
  const client = maakClient(identiteit);
  const { error } = await client.from("sessie_usecases").delete().eq("id", usecaseId);
  if (error) throw new SessieFout(`Use case verwijderen: ${error.message}`);
}

// Fase 3: waardebepaling ----------------------------------------------------

export async function bewaarWaardering(
  identiteit: Identiteit,
  args: WaarderingInvoer,
): Promise<void> {
  const client = maakClient(identiteit);
  const rij: Record<string, unknown> = {
    usecase_id: args.usecaseId,
    sessie_id: args.sessieId,
    bijgewerkt_door: args.deelnemerId,
  };
  if (args.modus !== undefined) rij.modus = args.modus;
  if (args.scorekaart !== undefined) rij.scorekaart = args.scorekaart;
  if (args.drivers !== undefined) rij.drivers = args.drivers;
  if (args.kwalitatief !== undefined) rij.kwalitatief = args.kwalitatief;
  if (args.haalbaarheid !== undefined) rij.haalbaarheid = args.haalbaarheid;
  if (args.kosten !== undefined) rij.kosten = args.kosten;

  const { error } = await client.from("waarderingen").upsert(rij, { onConflict: "usecase_id" });
  if (error) throw new SessieFout(`Waardering opslaan: ${error.message}`);
}

// Elkaar helpen -------------------------------------------------------------

export async function voegBijdrageToe(
  identiteit: Identiteit,
  args: BijdrageInvoer,
): Promise<BijdrageRij> {
  const client = maakClient(identiteit);
  return controleer(
    await client
      .from("bijdragen")
      .insert({
        sessie_id: args.sessieId,
        deelnemer_id: args.deelnemerId,
        soort: args.soort,
        tekst: args.tekst,
        usecase_id: args.usecaseId ?? null,
        beantwoordt_id: args.beantwoordtId ?? null,
      })
      .select()
      .single(),
    "Bijdrage opslaan",
  ) as BijdrageRij;
}

export async function markeerOpgelost(
  identiteit: Identiteit,
  bijdrageId: string,
  opgelost = true,
): Promise<void> {
  const client = maakClient(identiteit);
  const { error } = await client.from("bijdragen").update({ opgelost }).eq("id", bijdrageId);
  if (error) throw new SessieFout(`Bijdrage bijwerken: ${error.message}`);
}

// Fase 4: allocatie en realiteitschecks -------------------------------------

export async function bewaarAllocatie(
  identiteit: Identiteit,
  args: AllocatieInvoer,
): Promise<void> {
  const client = maakClient(identiteit);
  const { error } = await client.from("allocaties").upsert(
    {
      usecase_id: args.usecaseId,
      sessie_id: args.sessieId,
      geld_eur: args.geldEur,
      capaciteit_mensmaanden: args.capaciteitMensmaanden,
    },
    { onConflict: "usecase_id" },
  );
  if (error) throw new SessieFout(`Allocatie opslaan: ${error.message}`);
}

export async function bewaarBesluit(
  identiteit: Identiteit,
  args: BesluitInvoer,
): Promise<void> {
  const client = maakClient(identiteit);
  const { error } = await client.from("realiteitscheck_besluiten").upsert(
    {
      sessie_id: args.sessieId,
      check_id: args.checkId,
      besluit: args.besluit,
      motivatie: args.motivatie,
    },
    { onConflict: "sessie_id,check_id" },
  );
  if (error) throw new SessieFout(`Besluit opslaan: ${error.message}`);
}

// Fase 5: roadmap -----------------------------------------------------------

export async function bewaarRoadmapItem(
  identiteit: Identiteit,
  args: RoadmapInvoer,
): Promise<void> {
  const client = maakClient(identiteit);
  const { error } = await client.from("roadmap_items").upsert(
    {
      usecase_id: args.usecaseId,
      sessie_id: args.sessieId,
      horizon: args.horizon,
      volgorde: args.volgorde ?? 0,
      randvoorwaarden: args.randvoorwaarden ?? "",
      afhankelijk_van: args.afhankelijkVan ?? [],
    },
    { onConflict: "usecase_id" },
  );
  if (error) throw new SessieFout(`Roadmap opslaan: ${error.message}`);
}

export async function verwijderRoadmapItem(
  identiteit: Identiteit,
  usecaseId: string,
): Promise<void> {
  const client = maakClient(identiteit);
  const { error } = await client.from("roadmap_items").delete().eq("usecase_id", usecaseId);
  if (error) throw new SessieFout(`Roadmap-item verwijderen: ${error.message}`);
}

/** Houdt bij wie er nog actief is, voor de aanwezigheidsweergave bij de facilitator. */
export async function meldAanwezig(identiteit: Identiteit, deelnemerId: string): Promise<void> {
  const client = maakClient(identiteit);
  await client
    .from("deelnemers")
    .update({ laatst_gezien_op: new Date().toISOString() })
    .eq("id", deelnemerId);
}

/** De datalaag zoals de rest van de applicatie hem gebruikt. */
export const supabaseOpslag: Opslag = {
  maakSessie,
  zoekSessie,
  neemDeel,
  facilitatorInloggen,
  haalState,
  zetFase,
  zetFaseDeadline,
  zetEigenFase,
  wijzigSessie,
  selecteerSignaal,
  verwijderSignaalSelectie,
  voegUsecaseToe,
  koppelSignalen,
  ontkoppelSignaal,
  wijzigUsecase,
  zetUsecaseStatus,
  verwijderUsecase,
  bewaarWaardering,
  voegBijdrageToe,
  markeerOpgelost,
  bewaarAllocatie,
  bewaarBesluit,
  bewaarRoadmapItem,
  verwijderRoadmapItem,
  meldAanwezig,
};
