"use client";

import Link from "next/link";
import { rol, rolopdrachten } from "@/lib/content";
import { beoordeelRolopdracht, portfolio, teamscore } from "@/lib/sessie/afgeleid";
import type { SessieState } from "@/lib/supabase/types";
import { Etiket, Kaart, Knop, Kop } from "@/components/basis";

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

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[--radius-kaart] border border-[--color-rand] bg-[--color-rand] sm:grid-cols-3">
        {[
          { label: "In het portfolio", waarde: inPortfolio.length },
          { label: "Op de roadmap", waarde: state.roadmap.length },
          { label: "Teamscore", waarde: score.totaal },
        ].map((item) => (
          <div key={item.label} className="bg-[--color-vlak] p-3">
            <p className="text-xs leading-snug text-[--color-inkt-licht]">{item.label}</p>
            <p className="mt-0.5 text-xl font-semibold tabular-nums text-[--color-inkt]">
              {item.waarde}
            </p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="text-sm font-semibold text-[--color-inkt]">Waar de teamscore vandaan komt</h2>
        <ul className="mt-2 space-y-1.5">
          {score.onderdelen.map((onderdeel) => (
            <li key={onderdeel.id} className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-[--color-inkt-zacht]">{onderdeel.toelichting}</span>
              <span className="shrink-0 text-xs tabular-nums text-[--color-inkt-licht]">
                {onderdeel.punten}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-[--color-inkt]">De opdrachten die niemand zag</h2>
        <p className="mt-1 text-sm leading-relaxed text-[--color-inkt-zacht]">
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
                      <p className="text-xs text-[--color-inkt-licht]">
                        {deelnemer.naam} · {rol(deelnemer.rol_id)?.naam ?? deelnemer.rol_id}
                      </p>
                      <p className="mt-1 text-sm leading-snug text-[--color-inkt]">
                        {opdracht.opdracht}
                      </p>
                    </div>
                    <Etiket toon={oordeel.gehaald ? "waarde" : "aandacht"}>
                      {oordeel.gehaald ? "gelukt" : "niet gelukt"}
                    </Etiket>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-[--color-inkt-zacht]">
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
        <p className="mt-1.5 text-xs text-[--color-inkt-licht]">
          Met portfolio, business cases, roadmap, aannames en bronnen. Te printen of als pdf te
          bewaren.
        </p>
      </div>
    </div>
  );
}
