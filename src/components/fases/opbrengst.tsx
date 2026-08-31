"use client";

import Link from "next/link";
import { rolNaam, rolopdrachten } from "@/lib/content";
import { beoordeelRolopdracht, portfolio, teamscore } from "@/lib/sessie/afgeleid";
import { formatteerEuro } from "@/lib/waarde/berekening";
import type { SessieState } from "@/lib/supabase/types";
import { Cijfer, DonkerPaneel, Etiket, Hoofdregel, Kaart, Knop, Kop } from "@/components/basis";
import { Cirkel, Halftoon } from "@/components/decoratie";

/**
 * Fase 6: de opbrengst, met de onthulling van de rolopdrachten.
 *
 * De onthulling is geen scorebord maar een laatste spiegel: als iemands opdracht niet is gehaald,
 * ontbreekt er iets in het portfolio dat je beter nu weet dan over een jaar.
 */
export function Opbrengst({ state }: { state: SessieState }) {
  const score = teamscore(state);
  const inPortfolio = portfolio(state);

  // Alleen use cases die daadwerkelijk zijn doorgerekend tellen mee; een negatief totaal is een
  // bevinding en wordt getoond, niet verstopt.
  const doorgerekend = inPortfolio.filter((b) => b.businessCase?.netto_baat);
  const heeftDoorrekening = doorgerekend.length > 0;
  const totaleBaat = doorgerekend.reduce(
    (som, b) => som + (b.businessCase!.netto_baat!.verwacht ?? 0),
    0,
  );
  const eersteHorizon = state.roadmap.filter((r) => r.horizon === "nu");

  return (
    <div className="relative space-y-6">
      {/*
       * Hier de zachte tint en niet vol koraal: de onderregel van de kop loopt over de volle
       * breedte door en viel op een telefoon dwars over de cirkel. Op de tint blijft die regel
       * leesbaar (inkt-zacht haalt daar 6,7); op vol koraal haalde hij 4,4. Het koraal van dit
       * scherm zit in het cijfer op het donkere paneel.
       */}
      <Cirkel hoek="rechtsboven" formaat={0.42} toon="zacht" vanBoven={44} />

      <Hoofdregel links={state.sessie.titel} rechts="Opbrengst" />
      <Kop
        boven="Opbrengst"
        titel="Wat er ligt"
        onder="Het portfolio, de roadmap en wat jullie onderweg expliciet hebben gemaakt."
      />

      <DonkerPaneel bloedt="links" className="p-5 pb-12">
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

      {/*
        De lichte kaart verspringt de andere kant op en valt over de onderrand van het paneel.
        Het paneel reserveert daar ruimte voor, zodat de cijfers vrij blijven.
      */}
      <Kaart className="-mt-8 ml-10 p-[18px]">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-inkt-licht">
          Verwachte netto waarde
        </span>
        <p
          className={`cijfer mt-2 text-3xl ${
            totaleBaat >= 0 ? "text-waarde" : "text-risico"
          }`}
        >
          {heeftDoorrekening ? formatteerEuro(totaleBaat) : "niet doorgerekend"}
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-inkt-licht">
          {heeftDoorrekening
            ? `per jaar, met een onzekerheid van ${state.sessie.onzekerheid_pct}%. Geen begroting.`
            : "Er is nog geen enkele use case volledig doorgerekend."}
        </p>
      </Kaart>

      {eersteHorizon.length > 0 ? (
        <section>
          <h2 className="display text-lg text-inkt">Wat er als eerste start</h2>
          <ul className="mt-2.5">
            {eersteHorizon.map((item, index) => {
              const beeld = inPortfolio.find((b) => b.usecase.id === item.usecase_id);
              if (!beeld) return null;
              return (
                <li
                  key={item.usecase_id}
                  className={`flex items-baseline justify-between gap-4 py-3 ${
                    index < eersteHorizon.length - 1 ? "border-b border-rand" : ""
                  }`}
                >
                  <span className="text-sm leading-snug text-inkt">{beeld.usecase.titel}</span>
                  <span className="shrink-0 text-[11px] text-inkt-zacht">Nu</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="display text-lg text-inkt">Waar de teamscore vandaan komt</h2>
        <p className="mt-1 text-sm leading-relaxed text-inkt-zacht">
          Geen ranking tussen spelers: elk onderdeel meet iets anders over hoe breed en
          onderbouwd het gesprek was.
        </p>
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
                        {deelnemer.naam} · {rolNaam(deelnemer.rol_id)}
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
