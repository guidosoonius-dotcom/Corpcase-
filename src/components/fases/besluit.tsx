"use client";

import Link from "next/link";
import { useMemo } from "react";
import { praktijktoetsen, procesmodus } from "@/lib/content";
import { opslag } from "@/lib/sessie/api";
import { businessCaseVanVerbetering, teamscore } from "@/lib/sessie/afgeleid";
import { formatteerEuro } from "@/lib/waarde/berekening";
import {
  BesluitKaart,
  Cijfer,
  DonkerPaneel,
  Hoofdregel,
  Kaart,
  Knop,
  Kop,
  Melding,
  invoerStijl,
} from "@/components/basis";
import { Halftoon } from "@/components/decoratie";
import type { BewaardeIdentiteit } from "@/lib/sessie/identiteit";
import type { SessieState } from "@/lib/supabase/types";

/**
 * Fase 6 van de processessie, en meteen de laatste: de praktijktoets, een eigenaar en een
 * meetmoment per verbetering, en de oogst. De processessie heeft geen aparte opbrengst-fase zoals
 * de use-casesessie — dit scherm is dus tegelijk het besluit én de samenvatting.
 */
export function Besluit({
  state,
  identiteit,
  doe,
}: {
  state: SessieState;
  identiteit: BewaardeIdentiteit;
  doe: (actie: () => Promise<unknown>) => Promise<void>;
}) {
  const modus = procesmodus(state.sessie.speelmodus);
  const score = teamscore(state);

  // Zelfde geseede selectie als de realiteitschecks in de use-casesessie: bij een herstart krijg
  // je dezelfde praktijktoetsen, zodat een sessie die halverwege wordt hervat niet ineens andere
  // vragen stelt.
  const gekozenChecks = useMemo(() => {
    const zaad = [...state.sessie.id].reduce((som, teken) => som + teken.charCodeAt(0), 0);
    const gesorteerd = [...praktijktoetsen.checks].sort((a, b) => a.id.localeCompare(b.id));
    return Array.from(
      { length: modus.aantal_praktijktoetsen },
      (_, i) => gesorteerd[(zaad + i * 3) % gesorteerd.length],
    );
  }, [state.sessie.id, modus.aantal_praktijktoetsen]);

  const doorgerekend = state.verbeteringen.filter(
    (v) => businessCaseVanVerbetering(v, state.sessie.onzekerheid_pct)?.volledig,
  );
  const zonderEigenaar = doorgerekend.filter((v) => !v.eigenaar_id);
  const totaleBaat = doorgerekend.reduce(
    (som, v) =>
      som +
      (businessCaseVanVerbetering(v, state.sessie.onzekerheid_pct)?.netto_baat?.verwacht ?? 0),
    0,
  );

  return (
    <div className="relative space-y-6">
      <Hoofdregel links={state.sessie.titel} rechts="Fase 6 · Besluit" />
      <Kop
        boven="Fase 6 · Besluit"
        titel="Houdt dit stand?"
        onder="De praktijktoets, een eigenaar per verbetering, en een moment om terug te komen."
      />

      {gekozenChecks.length > 0 ? (
        <section>
          <h2 className="display text-lg text-inkt">Praktijktoets</h2>
          <p className="mt-1 text-sm leading-relaxed text-inkt-zacht">
            Houdt het herontwerp stand als het tegenzit? Aanpassen mag, handhaven ook — alleen niet
            beslissen is geen optie.
          </p>
          <ul className="mt-3 space-y-2.5">
            {gekozenChecks.map((check) => {
              const bestaand = state.besluiten.find((b) => b.check_id === check.id);
              return (
                <li key={check.id}>
                  <BesluitKaart
                    titel={check.titel}
                    scenario={check.scenario}
                    bestaand={bestaand}
                    paslabel="We passen het ontwerp aan"
                    handhaaflabel="We handhaven, en dit is waarom"
                    onBeslis={(besluit, motivatie) =>
                      void doe(() =>
                        opslag.bewaarBesluit(identiteit, {
                          sessieId: state.sessie.id,
                          checkId: check.id,
                          besluit,
                          motivatie,
                        }),
                      )
                    }
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="display text-lg text-inkt">Eigenaar en meetmoment</h2>
        <p className="mt-1 text-sm leading-relaxed text-inkt-zacht">
          Wie pakt dit op, en wanneer gaan jullie na of het werkte?
        </p>

        {modus.eigenaar_verplicht && zonderEigenaar.length > 0 ? (
          <div className="mt-2">
            <Melding toon="aandacht">
              {zonderEigenaar.length} doorgerekende{" "}
              {zonderEigenaar.length === 1 ? "verbetering" : "verbeteringen"} nog zonder eigenaar.
            </Melding>
          </div>
        ) : null}

        <div className="mt-3 space-y-4">
          {state.processen.map((proces) => {
            const verbeteringen = state.verbeteringen.filter((v) => v.proces_id === proces.id);
            if (verbeteringen.length === 0) return null;

            return (
              <div key={proces.id}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-inkt-licht">
                  {proces.titel}
                </p>
                <ul className="mt-2 space-y-2">
                  {verbeteringen.map((v) => (
                    <li key={v.id}>
                      <Kaart className="p-3">
                        <p className="text-sm font-medium leading-snug text-inkt">{v.titel}</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <label className="block">
                            <span className="block text-[11px] text-inkt-zacht">Eigenaar</span>
                            <select
                              className={`${invoerStijl} mt-1 !py-2 !text-sm`}
                              value={v.eigenaar_id ?? ""}
                              onChange={(e) =>
                                void doe(() =>
                                  opslag.wijzigVerbetering(identiteit, v.id, {
                                    eigenaar_id: e.target.value || null,
                                  }),
                                )
                              }
                            >
                              <option value="">Nog niemand</option>
                              {state.deelnemers.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.naam}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="block">
                            <span className="block text-[11px] text-inkt-zacht">Meetmoment</span>
                            <input
                              type="date"
                              className={`${invoerStijl} mt-1 !py-2 !text-sm`}
                              value={v.meetmoment ?? ""}
                              onChange={(e) =>
                                void doe(() =>
                                  opslag.wijzigVerbetering(identiteit, v.id, {
                                    meetmoment: e.target.value || null,
                                  }),
                                )
                              }
                            />
                          </label>
                        </div>
                      </Kaart>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <DonkerPaneel bloedt="links" className="p-5 pb-12">
        <div aria-hidden className="absolute -right-12 -top-16 h-52 w-52 text-white/[0.07]">
          <Halftoon />
        </div>
        <div className="relative grid grid-cols-2 gap-4">
          <Cijfer
            label="Verbeteringen"
            waarde={state.verbeteringen.length}
            toon="op-donker"
            formaat="reusachtig"
          />
          <Cijfer label="Teamscore" waarde={score.totaal} toon="gedempt" formaat="reusachtig" />
        </div>
      </DonkerPaneel>

      <Kaart className="-mt-8 ml-10 p-[18px]">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-inkt-licht">
          Verwachte netto besparing
        </span>
        <p className={`cijfer mt-2 text-3xl ${totaleBaat >= 0 ? "text-waarde" : "text-risico"}`}>
          {doorgerekend.length > 0 ? formatteerEuro(totaleBaat) : "niet doorgerekend"}
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-inkt-licht">
          {doorgerekend.length > 0
            ? `per jaar, met een onzekerheid van ${state.sessie.onzekerheid_pct}%. Geen begroting.`
            : "Er is nog geen enkele verbetering volledig doorgerekend."}
        </p>
      </Kaart>

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

      <div className="niet-printen">
        <Link href={`/sessie/${state.sessie.id}/rapport`}>
          <Knop>Het volledige rapport openen</Knop>
        </Link>
        <p className="mt-1.5 text-xs text-inkt-licht">
          Met de plaat, de diagnose, de verbeteringen en de praktijktoetsen. Te printen of als pdf
          te bewaren.
        </p>
      </div>
    </div>
  );
}
