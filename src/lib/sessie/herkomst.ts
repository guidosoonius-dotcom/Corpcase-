import { dekking, portfolio } from "./afgeleid";
import type { Herkomst, SessieState } from "@/lib/supabase/types";

/**
 * De brug tussen de twee sessies.
 *
 * Een processessie kan volgen op een afgeronde use-casesessie. Wat hij daarvan meekrijgt is een
 * **momentopname**, geen koppeling: de facilitator bewijst met de beheercode dat hij bij die eerste
 * sessie hoort, de app leest hem één keer, en het resultaat gaat als kopie mee in de nieuwe sessie.
 *
 * Drie redenen om het zo te doen en niet met een verwijzing:
 *
 * 1. Niemand hoeft toegang te houden tot een sessie waar hij niet meer aan tafel zit. De
 *    toegangsregels in de database blijven precies zoals ze zijn — er wordt nooit vanuit de ene
 *    sessie in de andere gelezen.
 * 2. De processessie overleeft het opruimen van de eerste.
 * 3. Wat er in de eerste sessie ná dit moment nog verandert, verschuift de grond niet onder een
 *    gesprek dat al loopt.
 */

/** Wat er uit een afgeronde use-casesessie meegaat. Alleen wat als voorzet bruikbaar is. */
export function maakHerkomst(state: SessieState): Herkomst {
  const gedekt = dekking(state);

  return {
    sessie_id: state.sessie.id,
    titel: state.sessie.titel,
    afgerond_op: state.sessie.afgerond_op,
    portfolio: portfolio(state).map((beeld) => ({
      id: beeld.usecase.id,
      titel: beeld.usecase.titel,
      domein: beeld.usecase.domein,
      netto_baat_verwacht: beeld.businessCase?.netto_baat?.verwacht ?? null,
    })),
    nu_op_de_roadmap: state.roadmap
      .filter((item) => item.horizon === "nu")
      .sort((a, b) => a.volgorde - b.volgorde)
      .map((item) => state.usecases.find((u) => u.id === item.usecase_id)?.titel)
      .filter((titel): titel is string => Boolean(titel)),
    gedekte_domeinen: gedekt.domeinenGedekt,
  };
}

/**
 * Is deze momentopname de moeite waard? Een sessie waarin niets op tafel is gekomen levert geen
 * voorzet op, en dan is een lege verwijzing naar "de vorige sessie" misleidender dan geen.
 */
export function herkomstIsBruikbaar(herkomst: Herkomst): boolean {
  return herkomst.portfolio.length > 0 || herkomst.nu_op_de_roadmap.length > 0;
}
