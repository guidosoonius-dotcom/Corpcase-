import type { Identiteit } from "@/lib/supabase/client";
import type {
  BijdrageRij,
  BijdrageSoort,
  CheckBesluit,
  DeelnemerRij,
  EigenSignaalRij,
  Fase,
  Herkomst,
  ProcesRij,
  ProcesStapRij,
  ProcesVerbeteringRij,
  SessieRij,
  SessieState,
  SessieUsecaseRij,
  Spelsoort,
  SpoorKeuze,
  UsecaseStatus,
  Waardemodus,
} from "@/lib/supabase/types";

export type { Identiteit };

export class SessieFout extends Error {}

export type NieuweSessie = {
  titel: string;
  organisatieId: string;
  /** Welk spel dit wordt. Weggelaten betekent de use-casesessie. */
  spelsoort?: Spelsoort;
  speelmodusId: string;
  facilitatorNaam: string;
  /** Null als de facilitator ervoor kiest alleen te begeleiden, zonder zelf een rol te spelen. */
  facilitatorRolId: string | null;
  budgetGeld?: number;
  budgetCapaciteit?: number;
  /**
   * Momentopname van een afgeronde use-casesessie waar deze processessie op volgt.
   *
   * De client stelt hem samen — die heeft met de beheercode van die sessie legitiem toegang tot
   * zijn state — en levert hem hier als kopie aan. Er wordt dus nooit vanuit deze sessie in een
   * andere sessie gelezen.
   */
  herkomst?: Herkomst | null;
};

/** Fase 1 van de processessie: een proces op tafel leggen. */
export type NieuwProces = {
  sessieId: string;
  /** Een bedrijfsfunctie-id uit content/processen/cora-bedrijfsfuncties.json. */
  functieId: string;
  titel: string;
  aanleiding?: string;
};

/** Fase 2: een stap op de procesplaat. */
export type NieuweStap = {
  sessieId: string;
  procesId: string;
  deelnemerId: string;
  naam: string;
  uitvoerder?: string;
  knelpunt?: string;
  uitzondering?: boolean;
  soort?: "huidig" | "nieuw";
  /**
   * Waar de stap komt te staan: het volgnummer waarvóór hij wordt ingevoegd. Weggelaten betekent
   * achteraan. De rest van de stappen schuift op, zodat de volgorde aaneengesloten blijft.
   */
  voorVolgorde?: number;
};

export type StapVelden = {
  naam?: string;
  uitvoerder?: string;
  knelpunt?: string;
  uitzondering?: boolean;
  vervangt?: string[];
};

/**
 * Fase 3: de score van één deelnemer op de vijf diagnose-assen.
 *
 * `scores` draagt alleen de assen die de client meestuurt en overschrijft de rest niet — de
 * merge (bestaande score van deze deelnemer + de nieuwe as) gebeurt in de component, precies zoals
 * `waardebepaling.tsx` dat al doet voor `WaarderingInvoer.kwalitatief`. De opslagfunctie zelf voegt
 * dus geen eigen mergelogica toe.
 */
export type DiagnoseInvoer = {
  sessieId: string;
  procesId: string;
  deelnemerId: string;
  scores: Partial<Record<string, number>>;
};

/** Fase 4, iteratief of new practice: een genoteerde verbetering. */
export type NieuweVerbetering = {
  sessieId: string;
  procesId: string;
  deelnemerId: string;
  /** Gezet op het iteratieve spoor (welke stap wordt verbeterd); leeg op new practice. */
  stapId?: string | null;
  manoeuvre?: string | null;
  titel: string;
  toelichting?: string;
  /** Een use case uit `Herkomst.portfolio[].id` — de brug tussen de twee sessies. */
  usecaseRef?: string | null;
};

export type VerbeteringVelden = {
  titel?: string;
  toelichting?: string;
  manoeuvre?: string | null;
  usecase_ref?: string | null;
  stap_id?: string | null;
  /** Fase 5: dezelfde vorm als `WaarderingInvoer.drivers`/`.kosten` — de rekenmotor leest ze zonder omweg. */
  drivers?: Driverwaarden[];
  kosten?: Kosten;
  /** Fase 6: wie dit oppakt, en wanneer het team teruggaat om te meten of het werkte. */
  eigenaar_id?: string | null;
  meetmoment?: string | null;
};

export type Toegang = {
  sessie: SessieRij;
  deelnemer: DeelnemerRij;
  identiteit: Identiteit;
};

/**
 * Eén rij in het facilitatoroverzicht (`/facilitator`). Draagt de échte beheercode — anders dan
 * `SessieRij` zoals die verder door de app gaat, waar hij altijd gemaskeerd is — omdat het
 * overzicht hem nodig heeft om per sessie `facilitatorInloggen` te kunnen aanroepen.
 */
export type FacilitatorSessieOverzicht = {
  id: string;
  titel: string;
  spelsoort: Spelsoort;
  speelmodus: string;
  fase: Fase;
  join_code: string;
  beheer_code: string;
  deelnemers_aantal: number;
  aangemaakt_op: string;
  afgerond_op: string | null;
};

export type NieuweUsecase = {
  sessieId: string;
  eigenaarId: string;
  titel: string;
  domein: string;
  probleem?: string;
  oplossingsrichting?: string;
  benodigdeData?: string[];
  aandachtspunten?: string[];
  bibliotheekId?: string | null;
  signaalIds?: string[];
};

export type UsecaseVelden = Partial<
  Pick<
    SessieUsecaseRij,
    | "titel"
    | "probleem"
    | "oplossingsrichting"
    | "domein"
    | "benodigde_data"
    | "aandachtspunten"
    | "status"
  >
>;

export type SessieVelden = Partial<
  Pick<
    SessieRij,
    "budget_geld" | "budget_capaciteit" | "onzekerheid_pct" | "uitgangspunten" | "afgerond_op"
  >
>;

export type Driverwaarden = { type: string; waarden: Record<string, number | null> };
export type Kosten = { eenmalig: number; jaarlijks: number; capaciteit: number };

export type WaarderingInvoer = {
  sessieId: string;
  usecaseId: string;
  deelnemerId: string;
  modus?: Waardemodus;
  scorekaart?: Record<string, number>;
  drivers?: Driverwaarden[];
  kwalitatief?: Record<string, number>;
  haalbaarheid?: Record<string, number>;
  kosten?: Kosten;
};

export type BijdrageInvoer = {
  sessieId: string;
  deelnemerId: string;
  soort: BijdrageSoort;
  tekst: string;
  usecaseId?: string | null;
  beantwoordtId?: string | null;
};

export type SignaalInvoer = {
  sessieId: string;
  deelnemerId: string;
  signaalId: string;
  herkenning: number;
  notitie?: string;
};

/**
 * Een zelf toegevoegde uitdaging: meteen ook een herkenning van de auteur zelf, net zoals het
 * aantikken van een bestaande kaart dat doet — wie een kaart toevoegt, herkent hem per definitie.
 */
export type EigenUitdagingInvoer = {
  sessieId: string;
  deelnemerId: string;
  titel: string;
  tekst?: string;
};

export type AllocatieInvoer = {
  sessieId: string;
  usecaseId: string;
  geldEur: number;
  capaciteitMensmaanden: number;
};

export type BesluitInvoer = {
  sessieId: string;
  checkId: string;
  besluit: CheckBesluit;
  motivatie: string;
};

export type RoadmapInvoer = {
  sessieId: string;
  usecaseId: string;
  horizon: string;
  volgorde?: number;
  randvoorwaarden?: string;
  afhankelijkVan?: string[];
};

/**
 * De volledige datalaag van de applicatie.
 *
 * Er zijn twee implementaties: Supabase (normaal gebruik, meerdere apparaten, blijft bewaard) en
 * een lokale opslag in het geheugen van de Next.js-server. Die tweede bestaat om twee redenen:
 * de multiplayer-flow is er zonder externe dienst automatisch mee te testen, en het geeft een
 * terugvaloptie als het netwerk op locatie het laat afweten.
 *
 * Beide implementaties dwingen dezelfde toegangsregels af, anders zou een geslaagde test in de
 * ene modus niets zeggen over de andere.
 */
export type Opslag = {
  maakSessie(invoer: NieuweSessie): Promise<Toegang>;
  zoekSessie(code: string): Promise<SessieRij | null>;
  neemDeel(args: { code: string; naam: string; rolId: string }): Promise<Toegang>;
  /**
   * Opnieuw toegang als facilitator, met alleen de beheercode — een ander apparaat, een nieuwe
   * browser, of een collega die het overneemt. De facilitator is óók deelnemer, dus dit levert
   * dezelfde `Toegang` op als bij het starten van de sessie.
   */
  facilitatorInloggen(beheerCode: string): Promise<Toegang>;
  /**
   * Alle sessies, voor het overzicht op `/facilitator`. Niet identiteitsgebonden zoals de rest van
   * deze interface: dit werkt bewust buiten het per-sessie-toegangsmodel om, achter een gedeeld
   * wachtwoord in plaats van een beheercode. Zie src/lib/supabase/service.ts voor hoe dat in de
   * Supabase-implementatie is begrensd.
   */
  lijstAlleSessies(wachtwoord: string): Promise<FacilitatorSessieOverzicht[]>;
  /** Onomkeerbaar; ruimt via de database-cascade (of het in-memory dossier) alles op wat erbij hoort. */
  verwijderSessie(identiteit: Identiteit, sessieId: string): Promise<void>;
  haalState(identiteit: Identiteit, sessieId: string): Promise<SessieState>;

  zetFase(identiteit: Identiteit, sessieId: string, fase: Fase): Promise<void>;
  zetFaseDeadline(identiteit: Identiteit, sessieId: string, deadline: Date | null): Promise<void>;
  wijzigSessie(identiteit: Identiteit, sessieId: string, velden: SessieVelden): Promise<void>;

  /**
   * De deelnemer navigeert zelf naar een andere fase, los van de gezamenlijke `sessie.fase`.
   * `fase: null` laat de deelnemer de groep weer volgen.
   */
  zetEigenFase(identiteit: Identiteit, deelnemerId: string, fase: Fase | null): Promise<void>;

  selecteerSignaal(identiteit: Identiteit, invoer: SignaalInvoer): Promise<void>;
  verwijderSignaalSelectie(
    identiteit: Identiteit,
    args: { deelnemerId: string; signaalId: string },
  ): Promise<void>;
  voegEigenUitdagingToe(
    identiteit: Identiteit,
    invoer: EigenUitdagingInvoer,
  ): Promise<EigenSignaalRij>;

  /*
   * De processessie. `herordenStappen` schrijft de volledige nieuwe volgorde van één proces in
   * plaats van losse nummers op te hogen: twee mensen die tegelijk een stap verplaatsen leveren
   * dan twee complete volgordes op, waarvan de laatste wint, in plaats van twee halve die elkaar
   * kruisen. Bij een poll van 2,5 seconde is dat geen theoretisch geval.
   */
  voegProcesToe(identiteit: Identiteit, invoer: NieuwProces): Promise<ProcesRij>;
  verwijderProces(identiteit: Identiteit, procesId: string): Promise<void>;
  voegStapToe(identiteit: Identiteit, invoer: NieuweStap): Promise<ProcesStapRij>;
  wijzigStap(identiteit: Identiteit, stapId: string, velden: StapVelden): Promise<void>;
  verwijderStap(identiteit: Identiteit, stapId: string): Promise<void>;
  herordenStappen(identiteit: Identiteit, procesId: string, stapIds: string[]): Promise<void>;
  /** Kopieert de stappen uit de contentbibliotheek naar dit proces, als startpunt. */
  laadStappenVoorzet(identiteit: Identiteit, procesId: string, deelnemerId: string): Promise<void>;

  /*
   * Fase 3-4 van de processessie: de diagnose en het herontwerp. `bewaarDiagnose` verwacht de
   * volledige, al gemergde scores van deze deelnemer (dezelfde afspraak als `bewaarWaardering` bij
   * `kwalitatief`: de component spreidt het bestaande object en stuurt het complete resultaat mee,
   * de opslag doet geen eigen read-before-write).
   */
  bewaarDiagnose(identiteit: Identiteit, invoer: DiagnoseInvoer): Promise<void>;
  /** Legt het gekozen spoor vast op `sessie_processen`; motivatie is verplicht bij afwijken van het advies. */
  zetSpoor(
    identiteit: Identiteit,
    procesId: string,
    spoor: SpoorKeuze,
    motivatie?: string,
  ): Promise<void>;
  voegVerbeteringToe(identiteit: Identiteit, invoer: NieuweVerbetering): Promise<ProcesVerbeteringRij>;
  wijzigVerbetering(
    identiteit: Identiteit,
    verbeteringId: string,
    velden: VerbeteringVelden,
  ): Promise<void>;
  verwijderVerbetering(identiteit: Identiteit, verbeteringId: string): Promise<void>;

  voegUsecaseToe(identiteit: Identiteit, invoer: NieuweUsecase): Promise<SessieUsecaseRij>;
  koppelSignalen(identiteit: Identiteit, usecaseId: string, signaalIds: string[]): Promise<void>;
  ontkoppelSignaal(identiteit: Identiteit, usecaseId: string, signaalId: string): Promise<void>;
  wijzigUsecase(identiteit: Identiteit, usecaseId: string, velden: UsecaseVelden): Promise<void>;
  zetUsecaseStatus(
    identiteit: Identiteit,
    usecaseId: string,
    status: UsecaseStatus,
  ): Promise<void>;
  verwijderUsecase(identiteit: Identiteit, usecaseId: string): Promise<void>;

  bewaarWaardering(identiteit: Identiteit, invoer: WaarderingInvoer): Promise<void>;

  voegBijdrageToe(identiteit: Identiteit, invoer: BijdrageInvoer): Promise<BijdrageRij>;
  markeerOpgelost(identiteit: Identiteit, bijdrageId: string, opgelost?: boolean): Promise<void>;

  bewaarAllocatie(identiteit: Identiteit, invoer: AllocatieInvoer): Promise<void>;
  bewaarBesluit(identiteit: Identiteit, invoer: BesluitInvoer): Promise<void>;

  bewaarRoadmapItem(identiteit: Identiteit, invoer: RoadmapInvoer): Promise<void>;
  verwijderRoadmapItem(identiteit: Identiteit, usecaseId: string): Promise<void>;

  meldAanwezig(identiteit: Identiteit, deelnemerId: string): Promise<void>;
};
