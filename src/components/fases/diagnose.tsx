"use client";

import { useState } from "react";
import { spoor as spoorContent, procesmodi } from "@/lib/content";
import { DIAGNOSE_ASSEN, bepaalSpoorAdvies, gemiddeldeDiagnoseScores, type DiagnoseAs } from "@/lib/waarde/proces";
import { ProcesTabs } from "@/components/processtrook";
import {
  DonkerPaneel,
  Etiket,
  Hoofdregel,
  Kaart,
  Knop,
  Kop,
  Leeg,
  Melding,
  PijlActie,
  Schaal,
  invoerStijl,
} from "@/components/basis";
import { opslag } from "@/lib/sessie/api";
import type { BewaardeIdentiteit } from "@/lib/sessie/identiteit";
import type { SessieState, SpoorKeuze } from "@/lib/supabase/types";

/**
 * Fase 3 van de processessie: de diagnose en het spooradvies.
 *
 * Elke speler scoort het proces op vijf assen; het gemiddelde voedt een advies (iteratief,
 * new practice, of niet nu) met de assen die de doorslag gaven erbij. Het team bevestigt zelf een
 * spoor — het advies wordt nooit stilzwijgend het antwoord van het team, precies zoals de
 * roadmap-voorzet in de use-casesessie dat ook niet is.
 */

/** Ook gebruikt door het procesrapport, om dezelfde asnamen te tonen bij het diagnoseresultaat. */
export const ASSEN_TEKST: Record<DiagnoseAs, { naam: string; vraag: string }> = {
  pijn: { naam: "Pijn", vraag: "Hoeveel last heeft de organisatie hier vandaag van?" },
  volume: { naam: "Volume", vraag: "Hoe vaak komt dit voor?" },
  variatie: { naam: "Variatie", vraag: "Hoeveel van de gevallen wijken af van de hoofdlijn?" },
  datakwaliteit: {
    naam: "Datakwaliteit",
    vraag: "Kloppen de gegevens, en ondersteunt het systeem het proces?",
  },
  strategisch_belang: {
    naam: "Strategisch belang",
    vraag: "Hoe belangrijk is dit voor waar de organisatie naartoe wil?",
  },
};

export function Diagnose({
  state,
  identiteit,
  doe,
}: {
  state: SessieState;
  identiteit: BewaardeIdentiteit;
  doe: (actie: () => Promise<unknown>) => Promise<void>;
}) {
  const [actiefId, setActiefId] = useState<string | null>(null);
  const [motivatie, setMotivatie] = useState("");

  const actief = state.processen.find((p) => p.id === actiefId) ?? state.processen[0] ?? null;

  if (!actief) {
    return (
      <div className="space-y-5">
        <Hoofdregel links={state.sessie.titel} rechts="Fase 3 · Diagnose" />
        <Kop boven="Fase 3 · Diagnose" titel="Er ligt nog geen proces op tafel" />
        <Leeg>Ga terug naar de proceskeuze en leg eerst een proces op tafel.</Leeg>
      </div>
    );
  }

  const diagnosesVanProces = state.diagnoses.filter((d) => d.proces_id === actief.id);
  const eigenDiagnose = diagnosesVanProces.find((d) => d.deelnemer_id === identiteit.deelnemerId);
  const gescoord = diagnosesVanProces.length;
  const scores = gemiddeldeDiagnoseScores(diagnosesVanProces);
  const advies = bepaalSpoorAdvies(scores);

  async function scoor(as: DiagnoseAs, waarde: number) {
    if (!actief) return;
    await doe(() =>
      opslag.bewaarDiagnose(identiteit, {
        sessieId: state.sessie.id,
        procesId: actief.id,
        deelnemerId: identiteit.deelnemerId,
        // De rest van de assen blijft staan: dit is een merge in de component, niet in de opslag —
        // zelfde afspraak als bewaarWaardering bij kwalitatief.
        scores: { ...(eigenDiagnose?.scores ?? {}), [as]: waarde },
      }),
    );
  }

  async function bevestigSpoor(gekozen: SpoorKeuze) {
    if (!actief) return;
    await doe(() =>
      opslag.zetSpoor(identiteit, actief.id, gekozen, motivatie.trim()),
    );
    setMotivatie("");
  }

  const afwijking =
    actief.spoor && advies.status === "advies" && actief.spoor !== advies.spoor;

  return (
    <div className="space-y-5">
      <Hoofdregel links={state.sessie.titel} rechts="Fase 3 · Diagnose" />
      <Kop
        boven="Fase 3 · Diagnose"
        titel="Wat is hier aan de hand?"
        onder="Scoor elk voor jezelf. Het gemiddelde bepaalt het advies — niet één mening."
      />

      <ProcesTabs
        processen={state.processen}
        actiefId={actief.id}
        onKies={(id) => {
          setActiefId(id);
          setMotivatie("");
        }}
      />

      <Kaart className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-inkt-licht">
          Het proces
        </p>
        <p className="display mt-1 text-xl text-inkt">{actief.titel}</p>
        <p className="mt-2 text-sm text-inkt-zacht">
          {gescoord} van {state.deelnemers.length} aan tafel heeft dit gescoord.
        </p>
      </Kaart>

      <div className="space-y-4">
        {DIAGNOSE_ASSEN.map((as) => (
          <div key={as}>
            <p className="text-sm font-medium text-inkt">{ASSEN_TEKST[as].naam}</p>
            <p className="mt-0.5 text-xs leading-snug text-inkt-licht">{ASSEN_TEKST[as].vraag}</p>
            <div className="mt-1.5">
              <Schaal waarde={eigenDiagnose?.scores[as] ?? null} onKies={(n) => void scoor(as, n)} />
            </div>
          </div>
        ))}
      </div>

      <DonkerPaneel className="p-5">
        <p className="text-sm text-houtskool-zacht">Advies</p>
        {advies.status === "advies" ? (
          <>
            <p className="cijfer mt-2 text-3xl text-accent-op-donker">{spoorContent(advies.spoor)?.naam}</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {advies.assen.map((as) => (
                <Etiket key={as} toon="waarde">
                  {ASSEN_TEKST[as].naam}
                </Etiket>
              ))}
            </div>
            <p className="mt-2.5 text-sm leading-relaxed text-houtskool-zacht">{advies.toelichting}</p>
          </>
        ) : (
          <>
            <p className="mt-2 text-lg font-medium leading-snug text-white">
              {advies.status === "onvoldoende_data" ? "Nog niet genoeg scores" : "Geen duidelijk advies"}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-houtskool-zacht">
              {advies.status === "onvoldoende_data"
                ? `Nog niet iedereen scoorde op ${advies.ontbrekende_assen
                    .map((as) => ASSEN_TEKST[as].naam.toLowerCase())
                    .join(", ")}.`
                : advies.toelichting}
            </p>
          </>
        )}

        <div className="mt-4 border-t border-houtskool-rand pt-4">
          <p className="text-xs font-medium text-houtskool-zacht">
            {actief.spoor
              ? `Vastgelegd: ${spoorContent(actief.spoor)?.naam}`
              : "Nog geen spoor vastgelegd"}
          </p>

          {afwijking || advies.status !== "advies" ? (
            <Melding toon="aandacht">
              <span className="block text-xs leading-relaxed">
                {afwijking
                  ? "Dit spoor wijkt af van het advies. Leg vast waarom — dat komt in het rapport."
                  : "Er is geen eenduidig advies. Leg vast waarom jullie dit spoor kiezen."}
              </span>
            </Melding>
          ) : null}

          <textarea
            className={`${invoerStijl} mt-3 min-h-16 !bg-houtskool-rand !text-sm !text-white placeholder:!text-houtskool-zacht`}
            value={motivatie || actief.spoor_motivatie}
            onChange={(e) => setMotivatie(e.target.value)}
            placeholder="Motivatie (verplicht bij afwijken van het advies)"
          />

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {procesmodi.sporen.map((keuze) => (
              <Knop
                key={keuze.id}
                soort={actief.spoor === keuze.id ? "primair" : "rand"}
                className="!px-3 !py-2 !text-xs"
                onClick={() => void bevestigSpoor(keuze.id)}
              >
                {keuze.naam}
              </Knop>
            ))}
          </div>
        </div>
      </DonkerPaneel>

      <PijlActie
        label="Volgende"
        tekst={
          actief.spoor === "niet-nu"
            ? "Dit proces wordt bewust niet herontworpen"
            : actief.spoor
              ? "Ontwerp het proces opnieuw of verbeter het stap voor stap"
              : "Leg eerst een spoor vast"
        }
      />
    </div>
  );
}
