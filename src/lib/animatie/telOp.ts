"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Telt zichtbaar op (of af) naar een nieuwe waarde, in plaats van in één keer te verspringen.
 *
 * Voor kengetallen die tijdens een sessie live meebewegen — de teamscore, wat er nog in het
 * budget past — maakt dat voelbaar dát er iets gebeurde, niet alleen dát er iets veranderd is.
 *
 * Rondt af op hele getallen: elk kengetal dat hierdoorheen gaat is er ook al een (percentages,
 * tellers, euro's worden elders al vooraf afgerond).
 *
 * Regelt zelf `prefers-reduced-motion`: de globale CSS-regel in globals.css vangt alleen
 * CSS-transities en -animaties af, geen requestAnimationFrame-lussen zoals deze.
 */
export function useTelOp(doel: number, duurMs = 700): number {
  const [weergegeven, setWeergegeven] = useState(doel);
  // Houdt de daadwerkelijk getoonde waarde bij, ook halverwege een animatie: zo pikt een nieuwe
  // waarde die tijdens het tellen binnenkomt de draad op waar het beeld op dat moment staat, in
  // plaats van terug te springen naar het startpunt van de vorige animatie.
  const weergegevenRef = useRef(doel);

  useEffect(() => {
    if (weergegevenRef.current === doel) return;

    const verminderdeBeweging =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (verminderdeBeweging) {
      // Ook hier via requestAnimationFrame in plaats van setState rechtstreeks in de effectbody:
      // dat voorkomt cascaderende renders. Eén frame vertraging is niet waarneembaar.
      const meteen = requestAnimationFrame(() => {
        weergegevenRef.current = doel;
        setWeergegeven(doel);
      });
      return () => cancelAnimationFrame(meteen);
    }

    const start = weergegevenRef.current;
    const verschil = doel - start;
    const begin = performance.now();
    let frame = 0;

    function stap(nu: number) {
      const voortgang = Math.min((nu - begin) / duurMs, 1);
      // Ease-out: snel op gang, rustig uitlopend — past bij een teller die "aankomt" op zijn
      // nieuwe waarde in plaats van een lineaire mechanische telling.
      const geëaset = 1 - Math.pow(1 - voortgang, 3);
      const waarde = Math.round(start + verschil * geëaset);
      weergegevenRef.current = waarde;
      setWeergegeven(waarde);
      if (voortgang < 1) frame = requestAnimationFrame(stap);
    }

    frame = requestAnimationFrame(stap);
    return () => cancelAnimationFrame(frame);
  }, [doel, duurMs]);

  return weergegeven;
}
