/**
 * Databasetypen, handmatig bijgehouden en één-op-één met supabase/schema.sql.
 *
 * Bewust compact gehouden in plaats van gegenereerd: het schema is klein en verandert zelden,
 * en zo blijft het leesbaar naast de queries die het gebruiken.
 */

/**
 * De app kent twee spellen. `usecases` gaat van signaal naar use case, waarde en roadmap;
 * `proces` legt daarna een concreet bedrijfsproces op tafel en verbetert of herontwerpt het.
 *
 * Ze delen de sessiemachinerie (codes, deelnemers, rollen, bijdragen) maar niet hun fasereeks.
 */
export type Spelsoort = "usecases" | "proces";

export type Fase =
  | "lobby"
  | "verkennen"
  | "identificatie"
  | "waardebepaling"
  | "prioritering"
  | "roadmap"
  | "opbrengst"
  | "proceskeuze"
  | "afpellen"
  | "diagnose"
  | "herontwerp"
  | "doorrekenen"
  | "besluit";

/**
 * De fases in speelvolgorde, per spelsoort. De facilitator schuift hier stap voor stap doorheen.
 *
 * Elke fasenaam komt in precies één reeks voor, op `lobby` na: die is gedeeld. Daardoor blijft een
 * losse fasewaarde ondubbelzinnig — je kunt aan `"afpellen"` zien bij welk spel hij hoort — en kan
 * de renderketen op het spelersscherm één platte lijst blijven in plaats van eerst de spelsoort te
 * moeten opzoeken.
 */
export const FASES_PER_SPELSOORT: Record<Spelsoort, Fase[]> = {
  usecases: [
    "lobby",
    "verkennen",
    "identificatie",
    "waardebepaling",
    "prioritering",
    "roadmap",
    "opbrengst",
  ],
  proces: [
    "lobby",
    "proceskeuze",
    "afpellen",
    "diagnose",
    "herontwerp",
    "doorrekenen",
    "besluit",
  ],
};

/**
 * De fasereeks van dit spel. Alles wat met volgorde te maken heeft — de stippenbalk, "loopt voor",
 * de knop naar de volgende fase — hangt hieraan en niet aan één globale lijst, want de twee
 * spellen hebben een eigen reeks.
 */
export function fasesVoor(spelsoort: Spelsoort): Fase[] {
  return FASES_PER_SPELSOORT[spelsoort] ?? FASES_PER_SPELSOORT.usecases;
}

/**
 * Hoort deze fase bij dit spel?
 *
 * Gebruikt om een fase uit het andere spel te weren: `eigen_fase` is vrije invoer vanuit de client,
 * en een use-casefase in een processessie zou `looptVoor` en de stippenbalk stuurloos maken.
 */
export function faseHoortBij(fase: Fase, spelsoort: Spelsoort): boolean {
  return fasesVoor(spelsoort).includes(fase);
}

export const FASE_LABELS: Record<Fase, string> = {
  lobby: "Lobby",
  verkennen: "Verkennen",
  identificatie: "Identificatie",
  waardebepaling: "Waardebepaling",
  prioritering: "Prioritering",
  roadmap: "Roadmap",
  opbrengst: "Opbrengst",
  proceskeuze: "Proceskeuze",
  afpellen: "Afpellen",
  diagnose: "Diagnose",
  herontwerp: "Herontwerp",
  doorrekenen: "Doorrekenen",
  besluit: "Besluit",
};

export type UsecaseStatus = "kandidaat" | "portfolio" | "afgevallen";
export type Waardemodus = "scorekaart" | "businesscase";
export type BijdrageSoort = "hulpvraag" | "assist" | "challenge" | "opmerking";
export type CheckBesluit = "aanpassen" | "handhaven";

/**
 * Wat een processessie meekrijgt uit een afgeronde use-casesessie: een momentopname, geen
 * koppeling. Bewust een kopie in de nieuwe sessie en geen verwijzing naar de oude, want dan hoeft
 * niemand toegang te houden tot een sessie waar hij niet meer aan tafel zit, en overleeft deze
 * sessie het opruimen van de vorige.
 *
 * Alleen wat als voorzet bruikbaar is. Geen tweede administratie van het portfolio.
 */
export type Herkomst = {
  sessie_id: string;
  titel: string;
  afgerond_op: string | null;
  /** De use cases die het portfolio haalden, met hun verwachte netto baat per jaar. */
  portfolio: { id: string; titel: string; domein: string; netto_baat_verwacht: number | null }[];
  /** Wat er op de roadmap als eerste zou starten. */
  nu_op_de_roadmap: string[];
  /** De CORA-domeinen die het team in sessie 1 geraakt heeft. */
  gedekte_domeinen: string[];
};

export type SessieRij = {
  id: string;
  titel: string;
  organisatie_id: string;
  spelsoort: Spelsoort;
  speelmodus: string;
  fase: Fase;
  /** Alleen gevuld bij een processessie die op een afgeronde use-casesessie volgt. */
  herkomst: Herkomst | null;
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

/** Een door een deelnemer zelf toegevoegde signaalkaart, los van de statische bibliotheek. */
export type EigenSignaalRij = {
  id: string;
  sessie_id: string;
  auteur_id: string;
  lens: string;
  titel: string;
  tekst: string;
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

// De processessie ------------------------------------------------------------

/** Iteratief verbeteren, opnieuw ontwerpen, of bewust laten liggen. */
export type SpoorKeuze = "iteratief" | "nieuw" | "niet-nu";

export type ProcesRij = {
  id: string;
  sessie_id: string;
  /** Verwijst naar een bedrijfsfunctie in content/, als vrije tekst. */
  functie_id: string;
  titel: string;
  aanleiding: string;
  /** Null zolang de diagnose loopt. */
  spoor: SpoorKeuze | null;
  /** Alleen gevuld als het team afwijkt van het advies. */
  spoor_motivatie: string;
  eigenaar_id: string | null;
  aangemaakt_op: string;
  bijgewerkt_op: string;
};

export type ProcesStapRij = {
  id: string;
  sessie_id: string;
  proces_id: string;
  volgorde: number;
  naam: string;
  /** Rol of afdeling; waar die wisselt tussen twee stappen ligt een overdracht. */
  uitvoerder: string;
  knelpunt: string;
  uitzondering: boolean;
  /** `huidig` is het proces zoals het loopt, `nieuw` het herontwerp ernaast. */
  soort: "huidig" | "nieuw";
  vervangt: string[];
  toegevoegd_door: string | null;
  aangemaakt_op: string;
  bijgewerkt_op: string;
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
  eigenSignalen: EigenSignaalRij[];
  usecases: SessieUsecaseRij[];
  usecaseSignalen: UsecaseSignaalRij[];
  waarderingen: WaarderingRij[];
  bijdragen: BijdrageRij[];
  allocaties: AllocatieRij[];
  besluiten: RealiteitscheckBesluitRij[];
  roadmap: RoadmapItemRij[];
  /** Leeg in een use-casesessie; gevuld in een processessie. */
  processen: ProcesRij[];
  stappen: ProcesStapRij[];
};
