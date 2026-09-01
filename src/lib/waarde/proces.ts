import { gemiddeldeScore } from "./berekening";
import type { ProcesDiagnoseRij, SpoorKeuze } from "@/lib/supabase/types";

/**
 * De diagnose van de processessie: vijf assen, waarop het team het proces scoort voordat het
 * kiest tussen iteratief verbeteren en new practice.
 *
 * Pure rekenlaag, net als `berekening.ts` — maar niet daarin ondergebracht. `berekening.ts` is de
 * gedeelde euro-rekenmotor van beide spellen (business case, budget, kwadrant); dit is
 * processessie-specifieke diagnostiek zonder euro's erin. Ze horen niet in hetzelfde bestand, wel
 * in dezelfde map: dezelfde soort pure, testbare functies over spelstate.
 */

export const DIAGNOSE_ASSEN = [
  "pijn",
  "volume",
  "variatie",
  "datakwaliteit",
  "strategisch_belang",
] as const;

export type DiagnoseAs = (typeof DIAGNOSE_ASSEN)[number];

/** Het gemiddelde per as over alle spelers die dit proces scoorden. `null` = nog niemand. */
export type DiagnoseScores = Record<DiagnoseAs, number | null>;

export type SpoorAdviesUitkomst =
  | { status: "advies"; spoor: SpoorKeuze; assen: DiagnoseAs[]; toelichting: string }
  | { status: "onbeslist"; toelichting: string }
  | { status: "onvoldoende_data"; ontbrekende_assen: DiagnoseAs[] };

/** Het gemiddelde per as, over de diagnoserijen van precies één proces. */
export function gemiddeldeDiagnoseScores(diagnoses: ProcesDiagnoseRij[]): DiagnoseScores {
  return Object.fromEntries(
    DIAGNOSE_ASSEN.map((as) => [
      as,
      gemiddeldeScore(Object.fromEntries(diagnoses.map((d) => [d.deelnemer_id, d.scores[as]]))),
    ]),
  ) as DiagnoseScores;
}

/**
 * Grens tussen "hoog" en "laag" op de 1-5 schaal: `>= 3` telt als hoog. Zelfde drempel als
 * `bepaalKwadrant`'s default in `berekening.ts` — één consequente grens door de hele app.
 */
const GRENS = 3;
const hoog = (n: number) => n >= GRENS;
const laag = (n: number) => n < GRENS;

/**
 * Adviseert een spoor op basis van de gemiddelde diagnosescores. Drie uitkomsten zijn mogelijk,
 * plus twee "geen advies"-gevallen die evenmin stilzwijgend naar één spoor worden geduwd:
 *
 * - `onvoldoende_data`: nog niet elke as is door iemand gescoord.
 * - `onbeslist`: alle assen zijn gescoord, maar geen van de drie regels slaat aan — de scores
 *   wijzen niet overtuigend één kant op. Dit spiegelt de eerste ontwerpregel uit `berekening.ts`
 *   ("een ontbrekende of ongeldige invoer levert nooit stilzwijgend nul op"): een dubbelzinnige
 *   diagnose levert hier evenmin stilzwijgend één van de drie sporen op. Een team dat bijvoorbeeld
 *   hoog scoort op pijn, volume én variatie tegelijk zou anders naar een advies geduwd worden waar
 *   het spel zelf niet achter staat.
 *
 * De drie regels zijn onderling disjunct op de assen die ze delen (`iteratief` eist lage variatie,
 * `nieuw` eist hoge variatie; `iteratief` eist hoge pijn+volume, `niet-nu` eist lage pijn+volume),
 * dus de volgorde van de `if`-branches doet er niet toe.
 */
export function bepaalSpoorAdvies(scores: DiagnoseScores): SpoorAdviesUitkomst {
  const ontbrekend = DIAGNOSE_ASSEN.filter((as) => scores[as] === null);
  if (ontbrekend.length > 0) return { status: "onvoldoende_data", ontbrekende_assen: ontbrekend };

  const s = scores as Record<DiagnoseAs, number>;

  if (hoog(s.strategisch_belang) && hoog(s.variatie) && laag(s.datakwaliteit)) {
    return {
      status: "advies",
      spoor: "nieuw",
      assen: ["strategisch_belang", "variatie", "datakwaliteit"],
      toelichting:
        "Hoog strategisch belang, veel variatie, matige datakwaliteit: kleine stapjes lossen een " +
        "fundamenteel niet meer passend proces niet op.",
    };
  }

  if (hoog(s.pijn) && hoog(s.volume) && laag(s.variatie)) {
    return {
      status: "advies",
      spoor: "iteratief",
      assen: ["pijn", "volume", "variatie"],
      toelichting:
        "Veel pijn, hoog volume, weinig variatie: het proces klopt, de uitvoering kan beter — " +
        "hier zit snelle winst.",
    };
  }

  if (laag(s.pijn) && laag(s.volume)) {
    return {
      status: "advies",
      spoor: "niet-nu",
      assen: ["pijn", "volume"],
      toelichting: "Weinig pijn, weinig volume: hier is op dit moment weinig te halen.",
    };
  }

  return {
    status: "onbeslist",
    toelichting: "De assen wijzen niet overtuigend één kant op. Kies zelf, en leg vast waarom.",
  };
}
