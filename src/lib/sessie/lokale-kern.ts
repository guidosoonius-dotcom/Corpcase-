import { organisatie, rolopdrachtVoorRol, speelmodus } from "@/lib/content";
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
import {
  SessieFout,
  type AllocatieInvoer,
  type BesluitInvoer,
  type BijdrageInvoer,
  type Identiteit,
  type NieuweSessie,
  type NieuweUsecase,
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
  usecases: SessieUsecaseRij[];
  usecaseSignalen: UsecaseSignaalRij[];
  waarderingen: WaarderingRij[];
  bijdragen: BijdrageRij[];
  allocaties: AllocatieRij[];
  besluiten: RealiteitscheckBesluitRij[];
  roadmap: RoadmapItemRij[];
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
  const modus = speelmodus(invoer.speelmodusId);

  const sessie: SessieRij = {
    id: crypto.randomUUID(),
    titel: invoer.titel,
    organisatie_id: org.id,
    speelmodus: modus.id,
    fase: "lobby",
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
    usecases: [],
    usecaseSignalen: [],
    waarderingen: [],
    bijdragen: [],
    allocaties: [],
    besluiten: [],
    roadmap: [],
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
  const deelnemer: DeelnemerRij = {
    id: crypto.randomUUID(),
    sessie_id: dossier.sessie.id,
    naam,
    rol_id: rolId,
    rolopdracht_id: rolopdrachtVoorRol(rolId)?.id ?? null,
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

// Lezen ---------------------------------------------------------------------

export function haalState(identiteit: Identiteit, sessieId: string): SessieState {
  const dossier = vindDossier(sessieId);
  eisDeelnemer(dossier, identiteit);

  const ids = new Set(dossier.usecases.map((u) => u.id));
  return {
    sessie: maskeerBeheercode(dossier.sessie),
    deelnemers: [...dossier.deelnemers],
    selecties: [...dossier.selecties],
    usecases: [...dossier.usecases],
    usecaseSignalen: dossier.usecaseSignalen.filter((k) => ids.has(k.usecase_id)),
    waarderingen: [...dossier.waarderingen],
    bijdragen: [...dossier.bijdragen],
    allocaties: [...dossier.allocaties],
    besluiten: [...dossier.besluiten],
    roadmap: [...dossier.roadmap].sort((a, b) => a.volgorde - b.volgorde),
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
