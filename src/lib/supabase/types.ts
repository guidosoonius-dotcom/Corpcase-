/**
 * Databasetypen, handmatig bijgehouden en één-op-één met supabase/schema.sql.
 *
 * Bewust compact gehouden in plaats van gegenereerd: het schema is klein en verandert zelden,
 * en zo blijft het leesbaar naast de queries die het gebruiken.
 */

export type Fase =
  | "lobby"
  | "verkennen"
  | "identificatie"
  | "waardebepaling"
  | "prioritering"
  | "roadmap"
  | "opbrengst";

/** De fases in speelvolgorde. De facilitator schuift hier stap voor stap doorheen. */
export const FASES: Fase[] = [
  "lobby",
  "verkennen",
  "identificatie",
  "waardebepaling",
  "prioritering",
  "roadmap",
  "opbrengst",
];

export const FASE_LABELS: Record<Fase, string> = {
  lobby: "Lobby",
  verkennen: "Verkennen",
  identificatie: "Identificatie",
  waardebepaling: "Waardebepaling",
  prioritering: "Prioritering",
  roadmap: "Roadmap",
  opbrengst: "Opbrengst",
};

export type UsecaseStatus = "kandidaat" | "portfolio" | "afgevallen";
export type Waardemodus = "scorekaart" | "businesscase";
export type BijdrageSoort = "hulpvraag" | "assist" | "challenge" | "opmerking";
export type CheckBesluit = "aanpassen" | "handhaven";

export type SessieRij = {
  id: string;
  titel: string;
  organisatie_id: string;
  speelmodus: string;
  fase: Fase;
  join_code: string;
  /**
   * `null` betekent hier niet "geen beheercode", maar "niet aan jou getoond": elke plek die deze
   * rij aflevert aan wie geen facilitator is, maskeert dit veld. De echte waarde reist alleen in
   * `Identiteit.beheerCode`, nooit hierin — anders zou elke deelnemer hem op elke poll van
   * `haalState` meekrijgen, en zou wie de sessiecode kent (die je juist wél rondstuurt) zich zo
   * tot facilitator kunnen bevorderen.
   */
  beheer_code: string | null;
  budget_geld: number;
  budget_capaciteit: number;
  uitgangspunten: Record<string, number>;
  onzekerheid_pct: number;
  fase_deadline: string | null;
  aangemaakt_op: string;
  bijgewerkt_op: string;
  afgerond_op: string | null;
};

export type DeelnemerRij = {
  id: string;
  sessie_id: string;
  naam: string;
  /** Null voor een facilitator die alleen begeleidt, zonder zelf een rol te spelen. */
  rol_id: string | null;
  rolopdracht_id: string | null;
  token: string;
  is_facilitator: boolean;
  laatst_gezien_op: string;
  aangemaakt_op: string;
  /**
   * De fase die deze deelnemer zelf bekijkt, los van `sessies.fase`.
   *
   * `null` betekent: volgt de groep automatisch mee, wat de facilitator ook instelt. Een waarde
   * betekent: is zelf naar een andere fase genavigeerd en ontkoppeld van de groep.
   */
  eigen_fase: Fase | null;
};

export type SignaalSelectieRij = {
  id: string;
  sessie_id: string;
  deelnemer_id: string;
  signaal_id: string;
  herkenning: number;
  notitie: string | null;
  aangemaakt_op: string;
};

export type SessieUsecaseRij = {
  id: string;
  sessie_id: string;
  bibliotheek_id: string | null;
  titel: string;
  probleem: string;
  oplossingsrichting: string;
  domein: string;
  benodigde_data: string[];
  aandachtspunten: string[];
  eigenaar_id: string | null;
  status: UsecaseStatus;
  aangemaakt_op: string;
  bijgewerkt_op: string;
};

export type UsecaseSignaalRij = { usecase_id: string; signaal_id: string };

export type WaarderingRij = {
  usecase_id: string;
  sessie_id: string;
  modus: Waardemodus;
  scorekaart: Record<string, number>;
  drivers: { type: string; waarden: Record<string, number | null> }[];
  kwalitatief: Record<string, number>;
  haalbaarheid: Record<string, number>;
  kosten: { eenmalig: number; jaarlijks: number; capaciteit: number };
  bijgewerkt_door: string | null;
  bijgewerkt_op: string;
};

export type BijdrageRij = {
  id: string;
  sessie_id: string;
  usecase_id: string | null;
  deelnemer_id: string;
  soort: BijdrageSoort;
  tekst: string;
  beantwoordt_id: string | null;
  opgelost: boolean;
  aangemaakt_op: string;
};

export type AllocatieRij = {
  usecase_id: string;
  sessie_id: string;
  geld_eur: number;
  capaciteit_mensmaanden: number;
  bijgewerkt_op: string;
};

export type RealiteitscheckBesluitRij = {
  id: string;
  sessie_id: string;
  check_id: string;
  besluit: CheckBesluit;
  motivatie: string;
  aangemaakt_op: string;
};

export type RoadmapItemRij = {
  usecase_id: string;
  sessie_id: string;
  horizon: string;
  volgorde: number;
  randvoorwaarden: string;
  afhankelijk_van: string[];
  bijgewerkt_op: string;
};

/** Alles wat één sessie op enig moment is. De basis voor elke view. */
export type SessieState = {
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
