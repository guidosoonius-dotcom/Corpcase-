"use client";

import Link from "next/link";
import { rol, rolopdrachten } from "@/lib/content";
import { beoordeelRolopdracht, portfolio, teamscore } from "@/lib/sessie/afgeleid";
import type { SessieState } from "@/lib/supabase/types";
import { Cijfer, DonkerPaneel, Etiket, Kaart, Knop, Kop } from "@/components/basis";
import { Halftoon } from "@/components/decoratie";

/**
 * Fase 6: de opbrengst, met de onthulling van de rolopdrachten.
 *
 * De onthulling is geen scorebord maar een laatste spiegel: als iemands opdracht niet is gehaald,
 * ontbreekt er iets in het portfolio dat je beter nu weet dan over een jaar.
 */
export function Opbrengst({ state }: { state: SessieState }) {
  const score = teamscore(state);
  const inPortfolio = portfolio(state);

  return (
    <div className="space-y-6">
      <Kop
        boven="Opbrengst"
        titel="Wat er ligt"
        onder="Het portfolio, de roadmap en wat jullie onderweg expliciet hebben gemaakt."
      />

      <DonkerPaneel className="p-5">
        <div aria-hidden className="absolute -right-12 -top-16 h-52 w-52 text-white/[0.07]">
            <Halftoon />
        </div>
        <div className="relative grid grid-cols-3 gap-4">
          {[
            { label: "In het portfolio", waarde: inPortfolio.length, uitgelicht: true },
            { label: "Op de roadmap", waarde: state.roadmap.length, uitgelicht: false },
            { label: "Teamscore", waarde: score.totaal, uitgelicht: false },
          ].map((item) => (
            <Cijfer
              key={item.label}
              label={item.label}
              waarde={item.waarde}
              toon={item.uitgelicht ? "op-donker" : "gedempt"}
              formaat="reusachtig"
            />
          ))}
        </div>
      </DonkerPaneel>

      <section>
        <h2 className="display text-lg text-inkt">Waar de teamscore vandaan komt</h2>
        <ul className="mt-2 space-y-1.5">
          {score.onderdelen.map((onderdeel) => (
            <li key={onderdeel.id} className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-inkt-zacht">{onderdeel.toelichting}</span>
              <span className="shrink-0 text-xs tabular-nums text-inkt-licht">
                {onderdeel.punten}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="display text-lg text-inkt">De opdrachten die niemand zag</h2>
        <p className="mt-1 text-sm leading-relaxed text-inkt-zacht">
          Elke rol had een eigen opdracht. Nu pas zichtbaar, met de vraag: is het gelukt?
        </p>

        <ul className="mt-3 space-y-2">
          {state.deelnemers.map((deelnemer) => {
            const opdracht = rolopdrachten.opdrachten.find((o) => o.id === deelnemer.rolopdracht_id);
            if (!opdracht) return null;
            const oordeel = beoordeelRolopdracht(state, opdracht.controle);

            return (
              <li key={deelnemer.id}>
                <Kaart className="p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-inkt-licht">
                        {deelnemer.naam} · {rol(deelnemer.rol_id)?.naam ?? deelnemer.rol_id}
                      </p>
                      <p className="mt-1 text-sm leading-snug text-inkt">
                        {opdracht.opdracht}
                      </p>
                    </div>
                    <Etiket toon={oordeel.gehaald ? "waarde" : "aandacht"}>
                      {oordeel.gehaald ? "gelukt" : "niet gelukt"}
                    </Etiket>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-inkt-zacht">
                    {oordeel.toelichting}
                  </p>
                </Kaart>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="niet-printen">
        <Link href={`/sessie/${state.sessie.id}/rapport`}>
          <Knop>Het volledige rapport openen</Knop>
        </Link>
        <p className="mt-1.5 text-xs text-inkt-licht">
          Met portfolio, business cases, roadmap, aannames en bronnen. Te printen of als pdf te
          bewaren.
        </p>
      </div>
    </div>
  );
}
