import {
  bedrijfsfunctie,
  organisatie,
  procesmodus,
  rolopdrachtVoorRol,
  speelmodus,
} from "@/lib/content";
import type {
  AllocatieRij,
  BijdrageRij,
  DeelnemerRij,
  EigenSignaalRij,
  Fase,
  ProcesDiagnoseRij,
  ProcesRij,
  ProcesStapRij,
  ProcesVerbeteringRij,
  RealiteitscheckBesluitRij,
  RoadmapItemRij,
  SessieRij,
  SessieState,
  SessieUsecaseRij,
  SignaalSelectieRij,
  SpoorKeuze,
  UsecaseSignaalRij,
  UsecaseStatus,
  WaarderingRij,
} from "@/lib/supabase/types";
import { maakBeheerCode, maakJoinCode, maakToken, normaliseerCode } from "./codes";
import {
  SessieFout,
  type AllocatieInvoer,
  type BesluitInvoer,
  type BijdrageInvoer,
  type EigenUitdagingInvoer,
  type FacilitatorSessieOverzicht,
  type Identiteit,
  type NieuweSessie,
  type NieuwProces,
  type NieuweStap,
  type NieuweUsecase,
  type NieuweVerbetering,
  type StapVelden,
  type VerbeteringVelden,
  type DiagnoseInvoer,
  type RoadmapInvoer,
  type SessieVelden,
  type SignaalInvoer,
  type Toegang,
  type UsecaseVelden,
  type WaarderingInvoer,
} from "./soorten";

/**
 * Sessieopslag in het geheugen van de server: de offline modus.
 *
 * Bestaat om twee redenen. Ten eerste is de multiplayer-flow er zonder externe dienst automatisch
 * mee te testen, met meerdere browsers tegen dezelfde server. Ten tweede is het een terugvaloptie
 * voor een sessie op locatie waar het netwerk niet meewerkt: de facilitator draait de app dan op
 * zijn eigen laptop en de deelnemers verbinden over hetzelfde wifi-netwerk.
 *
 * De toegangsregels zijn met opzet identiek aan de RLS-policies in supabase/schema.sql. Anders
 * zou een geslaagde test in deze modus niets zeggen over de andere.
 *
 * Wat je hier niet krijgt: de sessie overleeft geen herstart van de server en werkt niet over
 * meerdere serverinstanties. Voor een echte workshop is Supabase de bedoelde modus.
 */

type Dossier = {
  sessie: SessieRij;
  deelnemers: DeelnemerRij[];
  selecties: SignaalSelectieRij[];
  eigenSignalen: EigenSignaalRij[];
  usecases: SessieUsecaseRij[];
  usecaseSignalen: UsecaseSignaalRij[];
  waarderingen: WaarderingRij[];
  bijdragen: BijdrageRij[];
  allocaties: AllocatieRij[];
  besluiten: RealiteitscheckBesluitRij[];
  roadmap: RoadmapItemRij[];
  processen: ProcesRij[];
  stappen: ProcesStapRij[];
  diagnoses: ProcesDiagnoseRij[];
  verbeteringen: ProcesVerbeteringRij[];
};

// Overleeft hot reload in ontwikkeling; zonder dit begint elke codewijziging met een lege sessie.
const globaalObject = globalThis as unknown as { __corpcaseDossiers?: Map<string, Dossier> };
const dossiers: Map<string, Dossier> = (globaalObject.__corpcaseDossiers ??= new Map());

function nu(): string {
  return new Date().toISOString();
}

function vindDossier(sessieId: string): Dossier {
  const dossier = dossiers.get(sessieId);
  if (!dossier) throw new SessieFout("Sessie bestaat niet (meer).");
  return dossier;
}

function dossierViaUsecase(usecaseId: string): Dossier {
  for (const dossier of dossiers.values()) {
    if (dossier.usecases.some((u) => u.id === usecaseId)) return dossier;
  }
  throw new SessieFout("Use case bestaat niet (meer).");
}

function dossierViaBijdrage(bijdrageId: string): Dossier {
  for (const dossier of dossiers.values()) {
    if (dossier.bijdragen.some((b) => b.id === bijdrageId)) return dossier;
  }
  throw new SessieFout("Bijdrage bestaat niet (meer).");
}

// Toegangsregels, gelijk aan de RLS-policies ---------------------------------

function deelnemerVan(dossier: Dossier, identiteit: Identiteit): DeelnemerRij | null {
  if (!identiteit.deelnemerToken) return null;
  return dossier.deelnemers.find((d) => d.token === identiteit.deelnemerToken) ?? null;
}

function eisDeelnemer(dossier: Dossier, identiteit: Identiteit): DeelnemerRij {
  const deelnemer = deelnemerVan(dossier, identiteit);
  if (!deelnemer) throw new SessieFout("Geen toegang tot deze sessie.");
  return deelnemer;
}

function isFacilitator(dossier: Dossier, identiteit: Identiteit): boolean {
  if (identiteit.beheerCode && identiteit.beheerCode === dossier.sessie.beheer_code) return true;
  return deelnemerVan(dossier, identiteit)?.is_facilitator === true;
}

/**
 * De echte beheercode reist alleen in `Identiteit.beheerCode`, nooit in een `SessieRij` die de
 * browser bereikt — anders zou elke deelnemer hem op elke poll van `haalState` meekrijgen. Elke
 * functie hieronder die een sessie teruggeeft aan de aanroeper stuurt hem hierdoorheen.
 */
function maskeerBeheercode(sessie: SessieRij): SessieRij {
  return { ...sessie, beheer_code: null };
}

/**
 * Stilzwijgend niets doen als je geen facilitator bent, precies zoals een RLS-update die nul
 * rijen raakt. De aanroeper leest de state opnieuw en ziet dat er niets veranderd is.
 */
function magBesturen(dossier: Dossier, identiteit: Identiteit): boolean {
  return isFacilitator(dossier, identiteit);
}

// Aanmaken en joinen --------------------------------------------------------

export function maakSessie(invoer: NieuweSessie): Toegang {
  const org = organisatie(invoer.organisatieId);
  const spelsoort = invoer.spelsoort ?? "usecases";
  // Beide spellen kennen dezelfde drie speelduren; welke knoppen daaronder hangen verschilt.
  const modus =
    spelsoort === "proces" ? procesmodus(invoer.speelmodusId) : speelmodus(invoer.speelmodusId);

  const sessie: SessieRij = {
    id: crypto.randomUUID(),
    titel: invoer.titel,
    organisatie_id: org.id,
    spelsoort,
    speelmodus: modus.id,
    fase: "lobby",
    herkomst: invoer.herkomst ?? null,
    join_code: maakJoinCode(),
    beheer_code: maakBeheerCode(),
    budget_geld: invoer.budgetGeld ?? org.budget_defaults.geld_eur,
    budget_capaciteit:
      invoer.budgetCapaciteit ?? org.budget_defaults.verandercapaciteit_mensmaanden,
    uitgangspunten: Object.fromEntries(
      [...org.rekenkundige_uitgangspunten, ...org.kengetallen].map((k) => [k.id, k.waarde]),
    ),
    onzekerheid_pct: 30,
    fase_deadline: null,
    aangemaakt_op: nu(),
    bijgewerkt_op: nu(),
    afgerond_op: null,
  };

  const dossier: Dossier = {
    sessie,
    deelnemers: [],
    selecties: [],
    eigenSignalen: [],
    usecases: [],
    usecaseSignalen: [],
    waarderingen: [],
    bijdragen: [],
    allocaties: [],
    besluiten: [],
    roadmap: [],
    processen: [],
    stappen: [],
    diagnoses: [],
    verbeteringen: [],
  };
  dossiers.set(sessie.id, dossier);

  const deelnemer = voegDeelnemerToe(dossier, invoer.facilitatorNaam, invoer.facilitatorRolId, true);

  return {
    sessie: maskeerBeheercode(sessie),
    deelnemer,
    identiteit: { deelnemerToken: deelnemer.token, beheerCode: sessie.beheer_code },
  };
}

function voegDeelnemerToe(
  dossier: Dossier,
  naam: string,
  rolId: string | null,
  isFacilitatorRol: boolean,
): DeelnemerRij {
  // De privé-opdracht hoort bij het spel dat gespeeld wordt; die van het andere spel valt hier
  // niet te halen.
  const deelnemer: DeelnemerRij = {
    id: crypto.randomUUID(),
    sessie_id: dossier.sessie.id,
    naam,
    rol_id: rolId,
    rolopdracht_id: rolopdrachtVoorRol(rolId, dossier.sessie.spelsoort)?.id ?? null,
    token: maakToken(),
    is_facilitator: isFacilitatorRol,
    laatst_gezien_op: nu(),
    aangemaakt_op: nu(),
    eigen_fase: null,
  };
  dossier.deelnemers.push(deelnemer);
  return deelnemer;
}

/** Publieke opzoeking vóór het joinen; de beheercode gaat hier nooit in mee terug. */
export function zoekSessie(code: string): SessieRij | null {
  const joinCode = normaliseerCode(code);
  if (!joinCode) return null;
  for (const dossier of dossiers.values()) {
    if (dossier.sessie.join_code === joinCode) return maskeerBeheercode(dossier.sessie);
  }
  return null;
}

export function neemDeel(args: { code: string; naam: string; rolId: string }): Toegang {
  const sessie = zoekSessie(args.code);
  if (!sessie) throw new SessieFout("Geen sessie gevonden met deze code.");
  if (sessie.afgerond_op) throw new SessieFout("Deze sessie is al afgerond.");

  // Het id is niet gemaskeerd, dus deze zoekt gewoon het echte dossier op.
  const dossier = vindDossier(sessie.id);
  const deelnemer = voegDeelnemerToe(dossier, args.naam, args.rolId, false);

  return { sessie, deelnemer, identiteit: { deelnemerToken: deelnemer.token } };
}

/** Zie de uitleg bij `Opslag.facilitatorInloggen`. */
export function facilitatorInloggen(beheerCode: string): Toegang {
  const code = normaliseerCode(beheerCode);
  if (!code) throw new SessieFout("Onbekende beheercode.");

  for (const dossier of dossiers.values()) {
    if (dossier.sessie.beheer_code !== code) continue;
    const facilitator = dossier.deelnemers.find((d) => d.is_facilitator);
    if (!facilitator) throw new SessieFout("Geen facilitator gevonden bij deze sessie.");
    return {
      sessie: maskeerBeheercode(dossier.sessie),
      deelnemer: facilitator,
      identiteit: { deelnemerToken: facilitator.token, beheerCode: code },
    };
  }
  throw new SessieFout("Onbekende beheercode.");
}

function wachtwoordKlopt(opgegeven: string): boolean {
  const verwacht = process.env.FACILITATOR_WACHTWOORD;
  return Boolean(verwacht) && opgegeven === verwacht;
}

/** Het facilitatoroverzicht. In deze modus staat alles toch al in het geheugen van de server. */
export function lijstAlleSessies(wachtwoord: string): FacilitatorSessieOverzicht[] {
  if (!wachtwoordKlopt(wachtwoord)) throw new SessieFout("Onjuist wachtwoord.");

  return [...dossiers.values()]
    .sort((a, b) => b.sessie.aangemaakt_op.localeCompare(a.sessie.aangemaakt_op))
    .map((dossier) => ({
      id: dossier.sessie.id,
      titel: dossier.sessie.titel,
      spelsoort: dossier.sessie.spelsoort,
      speelmodus: dossier.sessie.speelmodus,
      fase: dossier.sessie.fase,
      join_code: dossier.sessie.join_code,
      beheer_code: dossier.sessie.beheer_code ?? "",
      deelnemers_aantal: dossier.deelnemers.length,
      aangemaakt_op: dossier.sessie.aangemaakt_op,
      afgerond_op: dossier.sessie.afgerond_op,
    }));
}

/** Onomkeerbaar: het hele dossier verdwijnt uit het geheugen. */
export function verwijderSessie(identiteit: Identiteit, sessieId: string): void {
  const dossier = vindDossier(sessieId);
  if (!magBesturen(dossier, identiteit)) throw new SessieFout("Geen toegang tot deze sessie.");
  dossiers.delete(sessieId);
}

// Lezen ---------------------------------------------------------------------

export function haalState(identiteit: Identiteit, sessieId: string): SessieState {
  const dossier = vindDossier(sessieId);
  eisDeelnemer(dossier, identiteit);

  const ids = new Set(dossier.usecases.map((u) => u.id));
  return {
    sessie: maskeerBeheercode(dossier.sessie),
    deelnemers: [...dossier.deelnemers],
    selecties: [...dossier.selecties],
    eigenSignalen: [...dossier.eigenSignalen],
    usecases: [...dossier.usecases],
    usecaseSignalen: dossier.usecaseSignalen.filter((k) => ids.has(k.usecase_id)),
    waarderingen: [...dossier.waarderingen],
    bijdragen: [...dossier.bijdragen],
    allocaties: [...dossier.allocaties],
    besluiten: [...dossier.besluiten],
    roadmap: [...dossier.roadmap].sort((a, b) => a.volgorde - b.volgorde),
    processen: [...dossier.processen],
    stappen: [...dossier.stappen].sort((a, b) => a.volgorde - b.volgorde),
    diagnoses: [...dossier.diagnoses],
    verbeteringen: [...dossier.verbeteringen],
  };
}

// Fasebesturing -------------------------------------------------------------

export function zetFase(identiteit: Identiteit, sessieId: string, fase: Fase): void {
  const dossier = vindDossier(sessieId);
  if (!magBesturen(dossier, identiteit)) return;
  dossier.sessie = { ...dossier.sessie, fase, bijgewerkt_op: nu() };
}

export function zetFaseDeadline(
  identiteit: Identiteit,
  sessieId: string,
  deadline: string | null,
): void {
  const dossier = vindDossier(sessieId);
  if (!magBesturen(dossier, identiteit)) return;
  dossier.sessie = { ...dossier.sessie, fase_deadline: deadline, bijgewerkt_op: nu() };
}

/**
 * Zelfbediening, met dezelfde grens als de Supabase-policy `deelnemers_wijzigen`: het eigen
 * token, of de facilitator die de hele rij van elke deelnemer al mag bijwerken.
 */
export function zetEigenFase(
  identiteit: Identiteit,
  deelnemerId: string,
  fase: Fase | null,
): void {
  for (const dossier of dossiers.values()) {
    const deelnemer = dossier.deelnemers.find((d) => d.id === deelnemerId);
    if (!deelnemer) continue;
    if (deelnemer.token !== identiteit.deelnemerToken && !isFacilitator(dossier, identiteit)) {
      return;
    }
    deelnemer.eigen_fase = fase;
    return;
  }
}

export function wijzigSessie(
  identiteit: Identiteit,
  sessieId: string,
  velden: SessieVelden,
): void {
  const dossier = vindDossier(sessieId);
  if (!magBesturen(dossier, identiteit)) return;
  dossier.sessie = { ...dossier.sessie, ...velden, bijgewerkt_op: nu() };
}

// Fase 1: signalen ----------------------------------------------------------

export function selecteerSignaal(identiteit: Identiteit, invoer: SignaalInvoer): void {
  const dossier = vindDossier(invoer.sessieId);
  eisDeelnemer(dossier, identiteit);

  const bestaand = dossier.selecties.find(
    (s) => s.deelnemer_id === invoer.deelnemerId && s.signaal_id === invoer.signaalId,
  );
  if (bestaand) {
    bestaand.herkenning = invoer.herkenning;
    bestaand.notitie = invoer.notitie ?? null;
    return;
  }

  dossier.selecties.push({
    id: crypto.randomUUID(),
    sessie_id: invoer.sessieId,
    deelnemer_id: invoer.deelnemerId,
    signaal_id: invoer.signaalId,
    herkenning: invoer.herkenning,
    notitie: invoer.notitie ?? null,
    aangemaakt_op: nu(),
  });
}

export function verwijderSignaalSelectie(
  identiteit: Identiteit,
  args: { deelnemerId: string; signaalId: string },
): void {
  for (const dossier of dossiers.values()) {
    if (!deelnemerVan(dossier, identiteit)) continue;
    dossier.selecties = dossier.selecties.filter(
      (s) => !(s.deelnemer_id === args.deelnemerId && s.signaal_id === args.signaalId),
    );
  }
}

export function voegEigenUitdagingToe(
  identiteit: Identiteit,
  invoer: EigenUitdagingInvoer,
): EigenSignaalRij {
  const dossier = vindDossier(invoer.sessieId);
  eisDeelnemer(dossier, identiteit);

  const kaart: EigenSignaalRij = {
    id: crypto.randomUUID(),
    sessie_id: invoer.sessieId,
    auteur_id: invoer.deelnemerId,
    lens: "uitdaging",
    titel: invoer.titel,
    tekst: invoer.tekst ?? "",
    aangemaakt_op: nu(),
  };
  dossier.eigenSignalen.push(kaart);

  // Wie een kaart toevoegt, herkent hem per definitie — zelfde herkenning als bij het aantikken
  // van een bestaande kaart.
  selecteerSignaal(identiteit, {
    sessieId: invoer.sessieId,
    deelnemerId: invoer.deelnemerId,
    signaalId: kaart.id,
    herkenning: 3,
  });

  return kaart;
}

// Fase 2: use cases ---------------------------------------------------------

export function voegUsecaseToe(identiteit: Identiteit, invoer: NieuweUsecase): SessieUsecaseRij {
  const dossier = vindDossier(invoer.sessieId);
  eisDeelnemer(dossier, identiteit);

  const usecase: SessieUsecaseRij = {
    id: crypto.randomUUID(),
    sessie_id: invoer.sessieId,
    bibliotheek_id: invoer.bibliotheekId ?? null,
    titel: invoer.titel,
    probleem: invoer.probleem ?? "",
    oplossingsrichting: invoer.oplossingsrichting ?? "",
    domein: invoer.domein,
    benodigde_data: invoer.benodigdeData ?? [],
    aandachtspunten: invoer.aandachtspunten ?? [],
    eigenaar_id: invoer.eigenaarId,
    status: "kandidaat",
    aangemaakt_op: nu(),
    bijgewerkt_op: nu(),
  };
  dossier.usecases.push(usecase);

  for (const signaalId of invoer.signaalIds ?? []) {
    dossier.usecaseSignalen.push({ usecase_id: usecase.id, signaal_id: signaalId });
  }

  return usecase;
}

export function koppelSignalen(
  identiteit: Identiteit,
  usecaseId: string,
  signaalIds: string[],
): void {
  const dossier = dossierViaUsecase(usecaseId);
  eisDeelnemer(dossier, identiteit);
  for (const signaalId of signaalIds) {
    const bestaat = dossier.usecaseSignalen.some(
      (k) => k.usecase_id === usecaseId && k.signaal_id === signaalId,
    );
    if (!bestaat) dossier.usecaseSignalen.push({ usecase_id: usecaseId, signaal_id: signaalId });
  }
}

export function ontkoppelSignaal(
  identiteit: Identiteit,
  usecaseId: string,
  signaalId: string,
): void {
  const dossier = dossierViaUsecase(usecaseId);
  eisDeelnemer(dossier, identiteit);
  dossier.usecaseSignalen = dossier.usecaseSignalen.filter(
    (k) => !(k.usecase_id === usecaseId && k.signaal_id === signaalId),
  );
}

export function wijzigUsecase(
  identiteit: Identiteit,
  usecaseId: string,
  velden: UsecaseVelden,
): void {
  const dossier = dossierViaUsecase(usecaseId);
  eisDeelnemer(dossier, identiteit);
  dossier.usecases = dossier.usecases.map((u) =>
    u.id === usecaseId ? { ...u, ...velden, bijgewerkt_op: nu() } : u,
  );
}

export function zetUsecaseStatus(
  identiteit: Identiteit,
  usecaseId: string,
  status: UsecaseStatus,
): void {
  wijzigUsecase(identiteit, usecaseId, { status });
}

export function verwijderUsecase(identiteit: Identiteit, usecaseId: string): void {
  const dossier = dossierViaUsecase(usecaseId);
  eisDeelnemer(dossier, identiteit);
  dossier.usecases = dossier.usecases.filter((u) => u.id !== usecaseId);
  dossier.usecaseSignalen = dossier.usecaseSignalen.filter((k) => k.usecase_id !== usecaseId);
  dossier.waarderingen = dossier.waarderingen.filter((w) => w.usecase_id !== usecaseId);
  dossier.allocaties = dossier.allocaties.filter((a) => a.usecase_id !== usecaseId);
  dossier.roadmap = dossier.roadmap.filter((r) => r.usecase_id !== usecaseId);
  dossier.bijdragen = dossier.bijdragen.filter((b) => b.usecase_id !== usecaseId);
}

// Fase 3: waardebepaling ----------------------------------------------------

export function bewaarWaardering(identiteit: Identiteit, invoer: WaarderingInvoer): void {
  const dossier = vindDossier(invoer.sessieId);
  eisDeelnemer(dossier, identiteit);

  const bestaand = dossier.waarderingen.find((w) => w.usecase_id === invoer.usecaseId);
  const basis: WaarderingRij = bestaand ?? {
    usecase_id: invoer.usecaseId,
    sessie_id: invoer.sessieId,
    modus: "scorekaart",
    scorekaart: {},
    drivers: [],
    kwalitatief: {},
    haalbaarheid: {},
    kosten: { eenmalig: 0, jaarlijks: 0, capaciteit: 0 },
    bijgewerkt_door: null,
    bijgewerkt_op: nu(),
  };

  const bijgewerkt: WaarderingRij = {
    ...basis,
    modus: invoer.modus ?? basis.modus,
    scorekaart: invoer.scorekaart ?? basis.scorekaart,
    drivers: invoer.drivers ?? basis.drivers,
    kwalitatief: invoer.kwalitatief ?? basis.kwalitatief,
    haalbaarheid: invoer.haalbaarheid ?? basis.haalbaarheid,
    kosten: invoer.kosten ?? basis.kosten,
    bijgewerkt_door: invoer.deelnemerId,
    bijgewerkt_op: nu(),
  };

  dossier.waarderingen = bestaand
    ? dossier.waarderingen.map((w) => (w.usecase_id === invoer.usecaseId ? bijgewerkt : w))
    : [...dossier.waarderingen, bijgewerkt];
}

// Elkaar helpen -------------------------------------------------------------

export function voegBijdrageToe(identiteit: Identiteit, invoer: BijdrageInvoer): BijdrageRij {
  const dossier = vindDossier(invoer.sessieId);
  eisDeelnemer(dossier, identiteit);

  const bijdrage: BijdrageRij = {
    id: crypto.randomUUID(),
    sessie_id: invoer.sessieId,
    usecase_id: invoer.usecaseId ?? null,
    deelnemer_id: invoer.deelnemerId,
    soort: invoer.soort,
    tekst: invoer.tekst,
    beantwoordt_id: invoer.beantwoordtId ?? null,
    opgelost: false,
    aangemaakt_op: nu(),
  };
  dossier.bijdragen.push(bijdrage);
  return bijdrage;
}

export function markeerOpgelost(
  identiteit: Identiteit,
  bijdrageId: string,
  opgelost = true,
): void {
  const dossier = dossierViaBijdrage(bijdrageId);
  eisDeelnemer(dossier, identiteit);
  dossier.bijdragen = dossier.bijdragen.map((b) =>
    b.id === bijdrageId ? { ...b, opgelost } : b,
  );
}

// Fase 4 en 5 ---------------------------------------------------------------

export function bewaarAllocatie(identiteit: Identiteit, invoer: AllocatieInvoer): void {
  const dossier = vindDossier(invoer.sessieId);
  eisDeelnemer(dossier, identiteit);

  const rij: AllocatieRij = {
    usecase_id: invoer.usecaseId,
    sessie_id: invoer.sessieId,
    geld_eur: invoer.geldEur,
    capaciteit_mensmaanden: invoer.capaciteitMensmaanden,
    bijgewerkt_op: nu(),
  };
  const bestaat = dossier.allocaties.some((a) => a.usecase_id === invoer.usecaseId);
  dossier.allocaties = bestaat
    ? dossier.allocaties.map((a) => (a.usecase_id === invoer.usecaseId ? rij : a))
    : [...dossier.allocaties, rij];
}

export function bewaarBesluit(identiteit: Identiteit, invoer: BesluitInvoer): void {
  const dossier = vindDossier(invoer.sessieId);
  eisDeelnemer(dossier, identiteit);

  const bestaand = dossier.besluiten.find((b) => b.check_id === invoer.checkId);
  const rij: RealiteitscheckBesluitRij = {
    id: bestaand?.id ?? crypto.randomUUID(),
    sessie_id: invoer.sessieId,
    check_id: invoer.checkId,
    besluit: invoer.besluit,
    motivatie: invoer.motivatie,
    aangemaakt_op: bestaand?.aangemaakt_op ?? nu(),
  };
  dossier.besluiten = bestaand
    ? dossier.besluiten.map((b) => (b.check_id === invoer.checkId ? rij : b))
    : [...dossier.besluiten, rij];
}

export function bewaarRoadmapItem(identiteit: Identiteit, invoer: RoadmapInvoer): void {
  const dossier = vindDossier(invoer.sessieId);
  eisDeelnemer(dossier, identiteit);

  const rij: RoadmapItemRij = {
    usecase_id: invoer.usecaseId,
    sessie_id: invoer.sessieId,
    horizon: invoer.horizon,
    volgorde: invoer.volgorde ?? 0,
    randvoorwaarden: invoer.randvoorwaarden ?? "",
    afhankelijk_van: invoer.afhankelijkVan ?? [],
    bijgewerkt_op: nu(),
  };
  const bestaat = dossier.roadmap.some((r) => r.usecase_id === invoer.usecaseId);
  dossier.roadmap = bestaat
    ? dossier.roadmap.map((r) => (r.usecase_id === invoer.usecaseId ? rij : r))
    : [...dossier.roadmap, rij];
}

export function verwijderRoadmapItem(identiteit: Identiteit, usecaseId: string): void {
  const dossier = dossierViaUsecase(usecaseId);
  eisDeelnemer(dossier, identiteit);
  dossier.roadmap = dossier.roadmap.filter((r) => r.usecase_id !== usecaseId);
}

// De processessie: proceskeuze en de procesplaat ----------------------------
//
// Regel voor regel gelijk aan opslag-supabase.ts. Wijkt deze af, dan zegt een geslaagde test in de
// offline modus niets meer over de Supabase-modus.

export function voegProcesToe(identiteit: Identiteit, invoer: NieuwProces): ProcesRij {
  const dossier = vindDossier(invoer.sessieId);
  eisDeelnemer(dossier, identiteit);

  const proces: ProcesRij = {
    id: crypto.randomUUID(),
    sessie_id: invoer.sessieId,
    functie_id: invoer.functieId,
    titel: invoer.titel,
    aanleiding: invoer.aanleiding ?? "",
    spoor: null,
    spoor_motivatie: "",
    eigenaar_id: null,
    aangemaakt_op: nu(),
    bijgewerkt_op: nu(),
  };
  dossier.processen.push(proces);
  return proces;
}

function dossierViaProces(procesId: string): Dossier {
  for (const dossier of dossiers.values()) {
    if (dossier.processen.some((p) => p.id === procesId)) return dossier;
  }
  throw new SessieFout("Proces bestaat niet (meer).");
}

function dossierViaStap(stapId: string): Dossier {
  for (const dossier of dossiers.values()) {
    if (dossier.stappen.some((s) => s.id === stapId)) return dossier;
  }
  throw new SessieFout("Stap bestaat niet (meer).");
}

export function verwijderProces(identiteit: Identiteit, procesId: string): void {
  const dossier = dossierViaProces(procesId);
  eisDeelnemer(dossier, identiteit);
  dossier.processen = dossier.processen.filter((p) => p.id !== procesId);
  // Komt in de database van de cascade op proces_id.
  dossier.stappen = dossier.stappen.filter((s) => s.proces_id !== procesId);
}

export function voegStapToe(identiteit: Identiteit, invoer: NieuweStap): ProcesStapRij {
  const dossier = vindDossier(invoer.sessieId);
  eisDeelnemer(dossier, identiteit);

  const soort = invoer.soort ?? "huidig";
  const bestaande = dossier.stappen
    .filter((s) => s.proces_id === invoer.procesId && s.soort === soort)
    .sort((a, b) => a.volgorde - b.volgorde);
  const positie = invoer.voorVolgorde ?? bestaande.length;

  const stap: ProcesStapRij = {
    id: crypto.randomUUID(),
    sessie_id: invoer.sessieId,
    proces_id: invoer.procesId,
    volgorde: positie,
    naam: invoer.naam,
    uitvoerder: invoer.uitvoerder ?? "",
    knelpunt: invoer.knelpunt ?? "",
    uitzondering: invoer.uitzondering ?? false,
    soort,
    vervangt: [],
    toegevoegd_door: invoer.deelnemerId,
    aangemaakt_op: nu(),
    bijgewerkt_op: nu(),
  };

  // Alles vanaf het invoegpunt schuift een plek op, zodat de reeks aaneengesloten blijft.
  for (const [index, s] of bestaande.filter((s) => s.volgorde >= positie).entries()) {
    s.volgorde = positie + index + 1;
    s.bijgewerkt_op = nu();
  }
  dossier.stappen.push(stap);
  return stap;
}

export function wijzigStap(identiteit: Identiteit, stapId: string, velden: StapVelden): void {
  const dossier = dossierViaStap(stapId);
  eisDeelnemer(dossier, identiteit);
  const stap = dossier.stappen.find((s) => s.id === stapId);
  if (!stap) return;
  if (velden.naam !== undefined) stap.naam = velden.naam;
  if (velden.uitvoerder !== undefined) stap.uitvoerder = velden.uitvoerder;
  if (velden.knelpunt !== undefined) stap.knelpunt = velden.knelpunt;
  if (velden.uitzondering !== undefined) stap.uitzondering = velden.uitzondering;
  if (velden.vervangt !== undefined) stap.vervangt = velden.vervangt;
  stap.bijgewerkt_op = nu();
}

export function verwijderStap(identiteit: Identiteit, stapId: string): void {
  const dossier = dossierViaStap(stapId);
  eisDeelnemer(dossier, identiteit);
  dossier.stappen = dossier.stappen.filter((s) => s.id !== stapId);
}

export function herordenStappen(
  identiteit: Identiteit,
  procesId: string,
  stapIds: string[],
): void {
  const dossier = dossierViaProces(procesId);
  eisDeelnemer(dossier, identiteit);
  for (const [index, id] of stapIds.entries()) {
    const stap = dossier.stappen.find((s) => s.id === id && s.proces_id === procesId);
    if (!stap) continue;
    stap.volgorde = index;
    stap.bijgewerkt_op = nu();
  }
}

export function laadStappenVoorzet(
  identiteit: Identiteit,
  procesId: string,
  deelnemerId: string,
): void {
  const dossier = dossierViaProces(procesId);
  eisDeelnemer(dossier, identiteit);

  const proces = dossier.processen.find((p) => p.id === procesId);
  if (!proces) return;

  const voorzet = bedrijfsfunctie(proces.functie_id)?.stappen_voorzet ?? [];
  if (voorzet.length === 0) return;

  // Doet niets als er al stappen staan: laden mag het werk van het team nooit overschrijven.
  const alGevuld = dossier.stappen.some((s) => s.proces_id === procesId && s.soort === "huidig");
  if (alGevuld) return;

  for (const [index, stap] of voorzet.entries()) {
    dossier.stappen.push({
      id: crypto.randomUUID(),
      sessie_id: proces.sessie_id,
      proces_id: procesId,
      volgorde: index,
      naam: stap.naam,
      uitvoerder: stap.uitvoerder,
      knelpunt: "",
      uitzondering: stap.uitzondering ?? false,
      soort: "huidig",
      vervangt: [],
      toegevoegd_door: deelnemerId,
      aangemaakt_op: nu(),
      bijgewerkt_op: nu(),
    });
  }
}

// De processessie: diagnose en herontwerp ------------------------------------
//
// Regel voor regel gelijk aan opslag-supabase.ts. Wijkt deze af, dan zegt een geslaagde test in de
// offline modus niets meer over de Supabase-modus.

/**
 * Verwacht de volledige, al gemergde scores van deze deelnemer. Dezelfde afspraak als
 * `bewaarWaardering` bij `kwalitatief`: de component spreidt zelf het bestaande object en stuurt
 * het complete resultaat mee, deze functie doet geen eigen read-before-write.
 */
export function bewaarDiagnose(identiteit: Identiteit, invoer: DiagnoseInvoer): void {
  const dossier = vindDossier(invoer.sessieId);
  eisDeelnemer(dossier, identiteit);

  const bestaand = dossier.diagnoses.find(
    (d) => d.proces_id === invoer.procesId && d.deelnemer_id === invoer.deelnemerId,
  );
  if (bestaand) {
    bestaand.scores = invoer.scores;
    bestaand.bijgewerkt_op = nu();
    return;
  }
  dossier.diagnoses.push({
    id: crypto.randomUUID(),
    sessie_id: invoer.sessieId,
    proces_id: invoer.procesId,
    deelnemer_id: invoer.deelnemerId,
    scores: invoer.scores,
    aangemaakt_op: nu(),
    bijgewerkt_op: nu(),
  });
}

export function zetSpoor(
  identiteit: Identiteit,
  procesId: string,
  spoor: SpoorKeuze,
  motivatie?: string,
): void {
  const dossier = dossierViaProces(procesId);
  eisDeelnemer(dossier, identiteit);
  const proces = dossier.processen.find((p) => p.id === procesId);
  if (!proces) return;
  proces.spoor = spoor;
  proces.spoor_motivatie = motivatie ?? "";
  proces.bijgewerkt_op = nu();
}

export function voegVerbeteringToe(
  identiteit: Identiteit,
  invoer: NieuweVerbetering,
): ProcesVerbeteringRij {
  const dossier = vindDossier(invoer.sessieId);
  eisDeelnemer(dossier, identiteit);

  const verbetering: ProcesVerbeteringRij = {
    id: crypto.randomUUID(),
    sessie_id: invoer.sessieId,
    proces_id: invoer.procesId,
    stap_id: invoer.stapId ?? null,
    manoeuvre: invoer.manoeuvre ?? null,
    titel: invoer.titel,
    toelichting: invoer.toelichting ?? "",
    usecase_ref: invoer.usecaseRef ?? null,
    drivers: [],
    kosten: { eenmalig: 0, jaarlijks: 0, capaciteit: 0 },
    eigenaar_id: null,
    meetmoment: null,
    toegevoegd_door: invoer.deelnemerId,
    aangemaakt_op: nu(),
    bijgewerkt_op: nu(),
  };
  dossier.verbeteringen.push(verbetering);
  return verbetering;
}

function dossierViaVerbetering(verbeteringId: string): Dossier {
  for (const dossier of dossiers.values()) {
    if (dossier.verbeteringen.some((v) => v.id === verbeteringId)) return dossier;
  }
  throw new SessieFout("Verbetering bestaat niet (meer).");
}

export function wijzigVerbetering(
  identiteit: Identiteit,
  verbeteringId: string,
  velden: VerbeteringVelden,
): void {
  const dossier = dossierViaVerbetering(verbeteringId);
  eisDeelnemer(dossier, identiteit);
  const verbetering = dossier.verbeteringen.find((v) => v.id === verbeteringId);
  if (!verbetering) return;
  if (velden.titel !== undefined) verbetering.titel = velden.titel;
  if (velden.toelichting !== undefined) verbetering.toelichting = velden.toelichting;
  if (velden.manoeuvre !== undefined) verbetering.manoeuvre = velden.manoeuvre;
  if (velden.usecase_ref !== undefined) verbetering.usecase_ref = velden.usecase_ref;
  if (velden.stap_id !== undefined) verbetering.stap_id = velden.stap_id;
  if (velden.drivers !== undefined) verbetering.drivers = velden.drivers;
  if (velden.kosten !== undefined) verbetering.kosten = velden.kosten;
  if (velden.eigenaar_id !== undefined) verbetering.eigenaar_id = velden.eigenaar_id;
  if (velden.meetmoment !== undefined) verbetering.meetmoment = velden.meetmoment;
  verbetering.bijgewerkt_op = nu();
}

export function verwijderVerbetering(identiteit: Identiteit, verbeteringId: string): void {
  const dossier = dossierViaVerbetering(verbeteringId);
  eisDeelnemer(dossier, identiteit);
  dossier.verbeteringen = dossier.verbeteringen.filter((v) => v.id !== verbeteringId);
}

export function meldAanwezig(identiteit: Identiteit, deelnemerId: string): void {
  for (const dossier of dossiers.values()) {
    const deelnemer = dossier.deelnemers.find((d) => d.id === deelnemerId);
    if (deelnemer && deelnemer.token === identiteit.deelnemerToken) {
      deelnemer.laatst_gezien_op = nu();
      return;
    }
  }
}

/** Alleen voor tests: begint met een schone lei. */
export function leegAlles(): void {
  dossiers.clear();
}
