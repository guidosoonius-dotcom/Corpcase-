import type { Identiteit } from "@/lib/supabase/client";
import type {
  BijdrageRij,
  BijdrageSoort,
  CheckBesluit,
  DeelnemerRij,
  Fase,
  SessieRij,
  SessieState,
  SessieUsecaseRij,
  UsecaseStatus,
  Waardemodus,
} from "@/lib/supabase/types";

export type { Identiteit };

export class SessieFout extends Error {}

export type NieuweSessie = {
  titel: string;
  organisatieId: string;
  speelmodusId: string;
  facilitatorNaam: string;
  /** Null als de facilitator ervoor kiest alleen te begeleiden, zonder zelf een rol te spelen. */
  facilitatorRolId: string | null;
  budgetGeld?: number;
  budgetCapaciteit?: number;
};

export type Toegang = {
  sessie: SessieRij;
  deelnemer: DeelnemerRij;
  identiteit: Identiteit;
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
