"use client";

import { useState } from "react";
import { FASES, FASE_LABELS, type Fase } from "@/lib/supabase/types";
import { rol, rolopdrachten } from "@/lib/content";
import type { BewaardeIdentiteit } from "@/lib/sessie/identiteit";
import type { SessieState } from "@/lib/supabase/types";
import { eigenFase, looptVoor, teamscore } from "@/lib/sessie/afgeleid";
import type { SessieHaak } from "@/lib/sessie/gebruik";
import { opslag } from "@/lib/sessie/api";
import { useTelOp } from "@/lib/animatie/telOp";
import { Etiket, Melding } from "./basis";
import { InfoIcoon, OogDichtIcoon, OogIcoon, SyncIcoon, WaarschuwingIcoon } from "./icoon";

/**
 * De vaste kop boven elk spelerscherm: waar zijn we, wie ben ik, hoe staat het team ervoor.
 *
 * De stappenrij is hier klikbaar: iedere deelnemer navigeert zelf, zonder op de facilitator te
 * wachten. `sessie.fase` blijft de gezamenlijke stand; wie zijn eigen stap niet aanraakt volgt die
 * automatisch mee (`eigen_fase` is dan null). Wie zelf doorklikt naar een latere fase dan de groep
 * ziet daaronder de waarschuwing dat hij voorloopt — geen blokkade, alleen een seintje.
 *
 * De zeven fasen staan als stippen, zonder tekst: met tekstlabels erbij paste de rij niet in één
 * regel op een telefoon, en elke fasepagina toont de naam toch al als kopregel ("FASE 1 ·
 * VERKENNEN") — een tweede keer dezelfde tekst in de balk voegt niets toe. Rol, sessietitel en de
 * rolopdracht staan om diezelfde reden niet meer continu in beeld, maar achter het avatarknopje:
 * die drie horen inhoudelijk bij elkaar ("wie ben ik hier") en worden maar af en toe geraadpleegd.
 */
export function Sessiebalk({
  state,
  identiteit,
  sessieId,
  doe,
}: {
  state: SessieState;
  identiteit: BewaardeIdentiteit;
  sessieId: string;
  doe: SessieHaak["doe"];
}) {
  const [rolpaneelZichtbaar, setRolpaneelZichtbaar] = useState(false);
  const [opdrachtZichtbaar, setOpdrachtZichtbaar] = useState(false);
  const [scoreUitlegZichtbaar, setScoreUitlegZichtbaar] = useState(false);
  const ik = state.deelnemers.find((d) => d.id === identiteit.deelnemerId);
  const mijnRol = ik ? rol(ik.rol_id) : undefined;
  const opdracht = rolopdrachten.opdrachten.find((o) => o.id === ik?.rolopdracht_id);
  const score = teamscore(state);
  // Deze balk staat boven elke fase en poll elke 2,5s mee; het optellen maakt zichtbaar wanneer
  // een medespeler net iets aan de teamscore heeft toegevoegd, in plaats van dat het getal
  // geruisloos verspringt.
  const teamscoreWeergegeven = useTelOp(score.totaal);
  const bekekenFase = ik ? eigenFase(ik, state) : state.sessie.fase;
  const voorloper = ik ? looptVoor(ik, state) : false;
  const naam = mijnRol?.naam ?? ik?.naam ?? "Deelnemer";
  const initiaal = (ik?.naam.trim().charAt(0) ?? "?").toUpperCase();

  async function naarFase(fase: Fase) {
    if (!ik) return;
    // Terug naar het tabblad van de groep zelf betekent weer meevolgen, niet vastpinnen op de
    // waarde die de groep daar op dit moment toevallig heeft.
    const nieuw = fase === state.sessie.fase ? null : fase;
    await doe(() => opslag.zetEigenFase(identiteit, ik.id, nieuw));
  }

  return (
    <header className="border-b border-rand bg-vlak">
      <div className="mx-auto w-full max-w-4xl px-4">
        <nav aria-label={`Fase, sessie ${sessieId}`} className="py-2.5">
          <ol className="flex items-center justify-center gap-1.5">
            {FASES.map((f) => (
              <li key={f}>
                <button
                  type="button"
                  onClick={() => void naarFase(f)}
                  disabled={!ik}
                  aria-current={f === bekekenFase ? "step" : undefined}
                  aria-label={FASE_LABELS[f]}
                  title={FASE_LABELS[f]}
                  className={`block h-1.5 w-8 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${stijlVoorStap(f, bekekenFase, state.sessie.fase)}`}
                />
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex items-center justify-between gap-3 border-t border-rand py-2">
          <p className="truncate text-xs text-inkt-licht">{state.sessie.titel}</p>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setScoreUitlegZichtbaar((z) => !z)}
              className="flex items-center gap-0.5"
              title="Teamscore"
              aria-label={
                scoreUitlegZichtbaar
                  ? "Verberg uitleg bij de teamscore"
                  : `Teamscore ${teamscoreWeergegeven}. Wat betekent dit?`
              }
            >
              <span className="cijfer text-lg leading-none text-accent-diep">{teamscoreWeergegeven}</span>
              <InfoIcoon className="h-3 w-3 text-inkt-licht" />
            </button>
            <button
              type="button"
              onClick={() => setRolpaneelZichtbaar((z) => !z)}
              aria-expanded={rolpaneelZichtbaar}
              aria-label={
                rolpaneelZichtbaar ? "Verberg jouw rol en opdracht" : "Toon jouw rol en opdracht"
              }
              className={`display flex h-8 w-8 items-center justify-center rounded-full text-sm text-white transition-colors ${rolpaneelZichtbaar ? "bg-accent-sterk" : "bg-houtskool"}`}
            >
              {initiaal}
            </button>
          </div>
        </div>

        {scoreUitlegZichtbaar ? (
          <p className="pb-2 text-xs leading-relaxed text-inkt-zacht">
            Meet de breedte en onderbouwing van het gesprek — geen ranking tussen jullie. De volle
            uitsplitsing staat straks bij Opbrengst.
          </p>
        ) : null}

        {ik?.eigen_fase != null ? (
          <div className="space-y-1.5 pb-2">
            {voorloper ? (
              <Melding toon="aandacht">
                <span className="flex items-start gap-1.5">
                  <WaarschuwingIcoon className="mt-0.5 h-4 w-4 shrink-0" />
                  Je loopt voor op de groep — de facilitator staat nog bij{" "}
                  {FASE_LABELS[state.sessie.fase]}.
                </span>
              </Melding>
            ) : null}
            <button
              type="button"
              onClick={() => void naarFase(state.sessie.fase)}
              className="inline-flex items-center gap-1 text-xs font-medium text-inkt-zacht hover:text-inkt hover:underline"
            >
              <SyncIcoon className="h-3.5 w-3.5" />
              Terug naar de groep
            </button>
          </div>
        ) : null}

        {rolpaneelZichtbaar ? (
          <div className="-mx-4 border-t border-houtskool-rand bg-houtskool px-4 py-4">
            <p className="display text-xl text-white">{naam}</p>
            {opdracht ? (
              <div className="mt-3 border-t border-houtskool-rand pt-3">
                <button
                  type="button"
                  onClick={() => setOpdrachtZichtbaar((z) => !z)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent-op-donker hover:underline"
                >
                  {opdrachtZichtbaar ? (
                    <OogDichtIcoon className="h-3.5 w-3.5" />
                  ) : (
                    <OogIcoon className="h-3.5 w-3.5" />
                  )}
                  {opdrachtZichtbaar
                    ? "Verberg mijn opdracht"
                    : "Toon mijn opdracht (alleen voor jou)"}
                </button>
                {opdrachtZichtbaar ? (
                  <p className="mt-1.5 rounded-kaart border-l-2 border-accent bg-houtskool-rand px-3 py-2 text-xs leading-relaxed text-white">
                    {opdracht.opdracht}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}

function stijlVoorStap(fase: Fase, bekeken: Fase, sessieFase: Fase): string {
  const index = FASES.indexOf(fase);
  const bekekenIndex = FASES.indexOf(bekeken);
  const sessieIndex = FASES.indexOf(sessieFase);

  if (fase === bekeken) return "bg-accent-sterk";
  // Waar de groep staat, ook als je daar zelf niet naar kijkt: een eigen, herkenbare tint.
  if (fase === sessieFase) return "bg-accent-zacht";
  if (index < Math.max(bekekenIndex, sessieIndex)) return "bg-rand-sterk";
  return "bg-rand hover:bg-rand-sterk";
}

export function Aanwezigen({ state }: { state: SessieState }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {state.deelnemers.map((d) => (
        <Etiket key={d.id}>
          {d.naam}
          {d.is_facilitator ? " · facilitator" : ""}
        </Etiket>
      ))}
    </div>
  );
}
