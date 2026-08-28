"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { opslag } from "./api";
import { leesIdentiteit, type BewaardeIdentiteit } from "./identiteit";
import type { SessieState } from "@/lib/supabase/types";

/**
 * Houdt de sessiestate actueel voor alle schermen.
 *
 * Bewust pollen in plaats van een realtime abonnement. Het toegangsmodel werkt met headers, en
 * die bereiken de realtime-laag niet; bovendien is een sessie klein en zit een werksessie in
 * dezelfde ruimte, waar twee seconden vertraging niemand opvalt. Na je eigen actie wordt direct
 * ververst, dus je eigen invoer voelt onmiddellijk.
 */

const POLL_INTERVAL_MS = 2500;

export type SessieHaak = {
  state: SessieState | null;
  identiteit: BewaardeIdentiteit | null;
  laden: boolean;
  fout: string | null;
  ververs: () => Promise<void>;
  /** Voert een actie uit en ververst daarna meteen, zodat de UI niet op de poll hoeft te wachten. */
  doe: (actie: () => Promise<unknown>) => Promise<void>;
};

export function useSessie(sessieId: string): SessieHaak {
  const [state, setState] = useState<SessieState | null>(null);
  const [identiteit, setIdentiteit] = useState<BewaardeIdentiteit | null>(null);
  const [laden, setLaden] = useState(true);
  const [fout, setFout] = useState<string | null>(null);
  const bezig = useRef(false);

  const ververs = useCallback(async () => {
    // De identiteit staat in localStorage en is er tijdens server-rendering nog niet; daarom
    // wordt hij hier gelezen in plaats van in een effect.
    const huidige = leesIdentiteit(sessieId);
    setIdentiteit(huidige);

    if (!huidige) {
      setLaden(false);
      return;
    }
    // Overlappende verzoeken leveren alleen maar oudere antwoorden op die nieuwere overschrijven.
    if (bezig.current) return;
    bezig.current = true;
    try {
      const nieuw = await opslag.haalState(huidige, sessieId);
      setState(nieuw);
      setFout(null);
    } catch (probleem) {
      setFout(probleem instanceof Error ? probleem.message : "Onbekende fout");
    } finally {
      bezig.current = false;
      setLaden(false);
    }
  }, [sessieId]);

  useEffect(() => {
    let actief = true;
    // Niet meteen in de effectbody: dat zou synchroon state zetten en een extra render kosten.
    const eerste = window.setTimeout(() => {
      if (actief) void ververs();
    }, 0);
    const timer = window.setInterval(() => void ververs(), POLL_INTERVAL_MS);

    return () => {
      actief = false;
      window.clearTimeout(eerste);
      window.clearInterval(timer);
    };
  }, [ververs]);

  // Terug uit de achtergrond op een telefoon: meteen bijwerken in plaats van tot de volgende poll wachten.
  useEffect(() => {
    function bijZichtbaar() {
      if (document.visibilityState === "visible") void ververs();
    }
    document.addEventListener("visibilitychange", bijZichtbaar);
    return () => document.removeEventListener("visibilitychange", bijZichtbaar);
  }, [ververs]);

  const doe = useCallback(
    async (actie: () => Promise<unknown>) => {
      try {
        await actie();
        setFout(null);
      } catch (probleem) {
        setFout(probleem instanceof Error ? probleem.message : "Onbekende fout");
      } finally {
        await ververs();
      }
    },
    [ververs],
  );

  return { state, identiteit, laden, fout, ververs, doe };
}

/** Meldt periodiek dat je er nog bent, voor de aanwezigheidsweergave bij de facilitator. */
export function useAanwezigheid(
  sessieId: string,
  identiteit: BewaardeIdentiteit | null,
): void {
  useEffect(() => {
    if (!identiteit) return;
    const melden = () => void opslag.meldAanwezig(identiteit, identiteit.deelnemerId).catch(() => {});
    melden();
    const timer = window.setInterval(melden, 30000);
    return () => window.clearInterval(timer);
  }, [sessieId, identiteit]);
}
