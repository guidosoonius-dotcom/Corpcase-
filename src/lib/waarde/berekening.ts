import type { DrivertypeId, Usecase } from "@/lib/content/schemas";

/**
 * Rekenmotor voor de waardebepaling.
 *
 * Twee ontwerpregels die overal doorwerken:
 *
 * 1. Een ontbrekende of ongeldige invoer levert nooit stilzwijgend nul op. De uitkomst wordt dan
 *    `onbekend`, met de namen van de ontbrekende velden. Een business case die stilletjes 0 euro
 *    toont, is gevaarlijker dan geen business case.
 * 2. Een uitkomst is altijd een bandbreedte (laag / verwacht / hoog). Eén hard getal suggereert een
 *    precisie die er niet is en kost geloofwaardigheid aan de bestuurstafel.
 */

export const STANDAARD_BANDBREEDTE_PCT = 30;

export type Bandbreedte = { laag: number; verwacht: number; hoog: number };

export type DriverInvoer = {
  type: DrivertypeId;
  waarden: Record<string, number | null | undefined>;
};

export type DriverUitkomst =
  | { status: "berekend"; type: DrivertypeId; jaarlijkse_baat: number }
  | { status: "onbekend"; type: DrivertypeId; ontbrekende_velden: string[] };

type Berekening = { velden: readonly string[]; bereken: (w: Record<string, number>) => number };

/**
 * De implementaties horen één-op-één bij de drivertypes in content/waarde/drivers.json.
 * `drivers.test.ts` bewaakt dat die twee niet uit elkaar lopen.
 */
export const BEREKENINGEN: Record<DrivertypeId, Berekening> = {
  tijdsbesparing: {
    velden: ["volume_per_jaar", "minuten_per_geval", "reductie_pct", "uurtarief"],
    bereken: (w) =>
      w.volume_per_jaar * (w.minuten_per_geval / 60) * (w.reductie_pct / 100) * w.uurtarief,
  },
  leegstandsreductie: {
    velden: ["mutaties_per_jaar", "leegstandsdagen_per_mutatie", "reductie_pct", "dagopbrengst"],
    bereken: (w) =>
      w.mutaties_per_jaar *
      w.leegstandsdagen_per_mutatie *
      (w.reductie_pct / 100) *
      w.dagopbrengst,
  },
  dervingsreductie: {
    velden: ["huidige_post_per_jaar", "reductie_pct"],
    bereken: (w) => w.huidige_post_per_jaar * (w.reductie_pct / 100),
  },
  vermeden_kosten: {
    velden: ["gevallen_per_jaar", "kosten_per_geval", "reductie_pct"],
    bereken: (w) => w.gevallen_per_jaar * w.kosten_per_geval * (w.reductie_pct / 100),
  },
  extra_opbrengst: {
    velden: ["extra_eenheden", "jaaropbrengst_per_eenheid"],
    bereken: (w) => w.extra_eenheden * w.jaaropbrengst_per_eenheid,
  },
};

function isBruikbaar(waarde: unknown): waarde is number {
  return typeof waarde === "number" && Number.isFinite(waarde);
}

/** Rekent één driver door, of meldt precies welke velden ontbreken. */
export function berekenDriver(invoer: DriverInvoer): DriverUitkomst {
  const berekening = BEREKENINGEN[invoer.type];
  if (!berekening) {
    return { status: "onbekend", type: invoer.type, ontbrekende_velden: ["onbekend drivertype"] };
  }

  const ontbrekend = berekening.velden.filter((veld) => !isBruikbaar(invoer.waarden[veld]));
  if (ontbrekend.length > 0) {
    return { status: "onbekend", type: invoer.type, ontbrekende_velden: ontbrekend };
  }

  const compleet = Object.fromEntries(
    berekening.velden.map((veld) => [veld, invoer.waarden[veld] as number]),
  );
  return { status: "berekend", type: invoer.type, jaarlijkse_baat: berekening.bereken(compleet) };
}

export type Kosten = { eenmalig: number; jaarlijks: number; capaciteit: number };

export type BusinessCase = {
  /** Volledig wanneer elke driver doorgerekend kon worden. */
  volledig: boolean;
  /** Per driver de uitkomst, zodat de speler ziet welke invoer nog mist. */
  drivers: DriverUitkomst[];
  ontbrekende_velden: string[];
  /** Bruto jaarlijkse baat als bandbreedte. Null zolang niets berekend kon worden. */
  bruto_baat: Bandbreedte | null;
  /** Baat minus de jaarlijkse kosten. Dit is het getal dat telt. */
  netto_baat: Bandbreedte | null;
  /** Terugverdientijd in maanden op de verwachte netto baat; null als die niet positief is. */
  terugverdientijd_maanden: number | null;
  kosten: Kosten;
};

export function bandbreedte(verwacht: number, onzekerheidPct = STANDAARD_BANDBREEDTE_PCT): Bandbreedte {
  const factor = Math.min(Math.max(onzekerheidPct, 0), 100) / 100;
  return {
    laag: verwacht * (1 - factor),
    verwacht,
    hoog: verwacht * (1 + factor),
  };
}

/**
 * Rekent een volledige business case door.
 *
 * Drivers die niet doorgerekend konden worden tellen niet mee in het bedrag, maar zetten
 * `volledig` op false en worden apart teruggegeven. De gebruiker ziet dus altijd of hij naar
 * een compleet of een gedeeltelijk beeld kijkt.
 */
export function berekenBusinessCase(
  drivers: DriverInvoer[],
  kosten: Kosten,
  onzekerheidPct = STANDAARD_BANDBREEDTE_PCT,
): BusinessCase {
  const uitkomsten = drivers.map(berekenDriver);
  const berekend = uitkomsten.filter(
    (u): u is Extract<DriverUitkomst, { status: "berekend" }> => u.status === "berekend",
  );
  const ontbrekend = uitkomsten
    .filter((u): u is Extract<DriverUitkomst, { status: "onbekend" }> => u.status === "onbekend")
    .flatMap((u) => u.ontbrekende_velden.map((veld) => `${u.type}.${veld}`));

  if (berekend.length === 0) {
    return {
      volledig: false,
      drivers: uitkomsten,
      ontbrekende_velden: ontbrekend,
      bruto_baat: null,
      netto_baat: null,
      terugverdientijd_maanden: null,
      kosten,
    };
  }

  const brutoVerwacht = berekend.reduce((som, u) => som + u.jaarlijkse_baat, 0);
  const bruto = bandbreedte(brutoVerwacht, onzekerheidPct);
  const netto: Bandbreedte = {
    laag: bruto.laag - kosten.jaarlijks,
    verwacht: bruto.verwacht - kosten.jaarlijks,
    hoog: bruto.hoog - kosten.jaarlijks,
  };

  const terugverdientijd =
    netto.verwacht > 0 ? (kosten.eenmalig / netto.verwacht) * 12 : null;

  return {
    volledig: ontbrekend.length === 0,
    drivers: uitkomsten,
    ontbrekende_velden: ontbrekend,
    bruto_baat: bruto,
    netto_baat: netto,
    terugverdientijd_maanden: terugverdientijd,
    kosten,
  };
}

/** Gemiddelde van 1-5 scores; null als er niets is ingevuld. */
export function gemiddeldeScore(scores: Record<string, number | null | undefined>): number | null {
  const waarden = Object.values(scores).filter(isBruikbaar);
  if (waarden.length === 0) return null;
  return waarden.reduce((a, b) => a + b, 0) / waarden.length;
}

export type Positie = { waarde: number; haalbaarheid: number };

/**
 * Bepaalt de positie van een use case in de waarde-haalbaarheidsmatrix, op een schaal van 1-5.
 *
 * De waarde-as combineert bewust twee bronnen: een doorgerekende euro-baat en de kwalitatieve
 * scores. Een use case zonder euro's kan zo nog steeds hoog scoren op volkshuisvestelijke waarde —
 * anders zou het spel alleen kostenbesparingen belonen.
 */
export function bepaalPositie(args: {
  businessCase?: BusinessCase | null;
  hoogsteNettoBaatInSessie?: number | null;
  kwalitatief: Record<string, number | null | undefined>;
  haalbaarheid: Record<string, number | null | undefined>;
  scorekaart?: Record<string, number | null | undefined> | null;
}): Positie | null {
  const haalbaarheid =
    gemiddeldeScore(args.haalbaarheid) ?? gemiddeldeScore(args.scorekaart ?? {}) ?? null;

  const kwalitatief = gemiddeldeScore(args.kwalitatief);
  const financieel = financieleScore(args.businessCase, args.hoogsteNettoBaatInSessie);

  const waardeDelen = [kwalitatief, financieel].filter((d): d is number => d !== null);
  const scorekaartWaarde = gemiddeldeScore({
    impact: args.scorekaart?.impact,
    urgentie: args.scorekaart?.urgentie,
    strategische_fit: args.scorekaart?.strategische_fit,
  });

  const waarde =
    waardeDelen.length > 0
      ? waardeDelen.reduce((a, b) => a + b, 0) / waardeDelen.length
      : scorekaartWaarde;

  if (waarde === null || haalbaarheid === null) return null;
  return { waarde, haalbaarheid };
}

/**
 * Vertaalt een euro-uitkomst naar de 1-5 schaal, relatief aan de grootste netto baat in de sessie.
 * Relatief, omdat een absolute schaal per corporatie anders zou moeten liggen.
 */
function financieleScore(
  businessCase: BusinessCase | null | undefined,
  hoogste: number | null | undefined,
): number | null {
  if (!businessCase?.netto_baat) return null;
  if (!isBruikbaar(hoogste) || hoogste <= 0) return null;
  const verhouding = Math.max(businessCase.netto_baat.verwacht, 0) / hoogste;
  return 1 + Math.min(verhouding, 1) * 4;
}

export type KwadrantId = "quick-wins" | "strategisch" | "vulwerk" | "vermijden";

export function bepaalKwadrant(positie: Positie, grens = 3): KwadrantId {
  const hogeWaarde = positie.waarde >= grens;
  const hogeHaalbaarheid = positie.haalbaarheid >= grens;
  if (hogeWaarde && hogeHaalbaarheid) return "quick-wins";
  if (hogeWaarde) return "strategisch";
  if (hogeHaalbaarheid) return "vulwerk";
  return "vermijden";
}

export type Budget = { geld_eur: number; verandercapaciteit_mensmaanden: number };

export type Allocatie = { usecase_id: string; geld_eur: number; capaciteit_mensmaanden: number };

export type BudgetStand = {
  besteed: Budget;
  resterend: Budget;
  overschreden: { geld: boolean; capaciteit: boolean };
};

/**
 * Houdt bij hoeveel van de investeringsruimte al vergeven is. Overschrijding wordt gerapporteerd,
 * niet stilzwijgend afgekapt: het team moet zelf zien dat het niet past en kiezen.
 */
export function berekenBudgetStand(budget: Budget, allocaties: Allocatie[]): BudgetStand {
  const geld = allocaties.reduce((som, a) => som + a.geld_eur, 0);
  const capaciteit = allocaties.reduce((som, a) => som + a.capaciteit_mensmaanden, 0);
  return {
    besteed: { geld_eur: geld, verandercapaciteit_mensmaanden: capaciteit },
    resterend: {
      geld_eur: budget.geld_eur - geld,
      verandercapaciteit_mensmaanden: budget.verandercapaciteit_mensmaanden - capaciteit,
    },
    overschreden: {
      geld: geld > budget.geld_eur,
      capaciteit: capaciteit > budget.verandercapaciteit_mensmaanden,
    },
  };
}

/** Zet een bibliotheekkaart om naar de invoer van de rekenmotor. */
export function driversUitBibliotheek(usecase: Usecase): DriverInvoer[] {
  return usecase.drivers.map((d) => ({ type: d.type, waarden: { ...d.waarden } }));
}

export function formatteerEuro(bedrag: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(bedrag);
}

export function formatteerBandbreedte(band: Bandbreedte | null): string {
  if (!band) return "onbekend";
  return `${formatteerEuro(band.laag)} – ${formatteerEuro(band.hoog)}`;
}
