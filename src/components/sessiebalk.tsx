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
import { OogDichtIcoon, OogIcoon, SyncIcoon, WaarschuwingIcoon } from "./icoon";

/**
 * De vaste kop boven elk spelerscherm: waar zijn we, wie ben ik, hoe staat het team ervoor.
 *
 * De fasetabs zijn hier klikbaar: iedere deelnemer navigeert zelf, zonder op de facilitator te
 * wachten. `sessie.fase` blijft de gezamenlijke stand; wie zijn eigen tabblad niet aanraakt volgt
 * die automatisch mee (`eigen_fase` is dan null). Wie zelf doorklikt naar een latere fase dan de
 * groep ziet daaronder de waarschuwing dat hij voorloopt — geen blokkade, alleen een seintje.
 *
 * De rolopdracht zit hier achter een knop en niet open in beeld: hij is privé tot de onthulling,
 * en iemand die zijn telefoon laat zien mag hem niet per ongeluk weggeven.
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
  const [opdrachtZichtbaar, setOpdrachtZichtbaar] = useState(false);
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

  async function naarFase(fase: Fase) {
    if (!ik) return;
    // Terug naar het tabblad van de groep zelf betekent weer meevolgen, niet vastpinnen op de
    // waarde die de groep daar op dit moment toevallig heeft.
    const nieuw = fase === state.sessie.fase ? null : fase;
    await doe(() => opslag.zetEigenFase(identiteit, ik.id, nieuw));
  }

  return (
    <header className="border-b border-rand bg-vlak">
      <div className="mx-auto w-full max-w-4xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-inkt-licht">{state.sessie.titel}</p>
            <p className="display truncate text-lg leading-tight text-inkt">
              {mijnRol?.naam ?? ik?.naam ?? "Deelnemer"}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-inkt-licht">Teamscore</p>
            <p className="cijfer text-3xl text-accent">{teamscoreWeergegeven}</p>
          </div>
        </div>

        <nav aria-label={`Fase, sessie ${sessieId}`}>
          <ol className="scroll-x mt-3 flex gap-1 pb-0.5">
            {FASES.map((f) => (
              <li key={f} className="shrink-0">
                <button
                  type="button"
                  onClick={() => void naarFase(f)}
                  disabled={!ik}
                  aria-current={f === bekekenFase ? "step" : undefined}
                  className={`inline-block rounded px-2 py-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed ${stijlVoorFase(f, bekekenFase, state.sessie.fase)}`}
                >
                  {FASE_LABELS[f]}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {ik?.eigen_fase != null ? (
          <div className="mt-2 space-y-1.5">
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

        {opdracht ? (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setOpdrachtZichtbaar((z) => !z)}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent-diep hover:underline"
            >
              {opdrachtZichtbaar ? (
                <OogDichtIcoon className="h-3.5 w-3.5" />
              ) : (
                <OogIcoon className="h-3.5 w-3.5" />
              )}
              {opdrachtZichtbaar ? "Verberg mijn opdracht" : "Toon mijn opdracht (alleen voor jou)"}
            </button>
            {opdrachtZichtbaar ? (
              <p className="mt-1.5 rounded-kaart border-l-2 border-accent bg-accent-zacht px-3 py-2 text-xs leading-relaxed text-accent-diep">
                {opdracht.opdracht}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}

function stijlVoorFase(fase: Fase, bekeken: Fase, sessieFase: Fase): string {
  const index = FASES.indexOf(fase);
  const bekekenIndex = FASES.indexOf(bekeken);
  const sessieIndex = FASES.indexOf(sessieFase);

  if (fase === bekeken) return "bg-accent-sterk text-white";
  // Waar de groep staat, ook als je daar zelf niet naar kijkt: een dunne rand in plaats van vulling.
  if (fase === sessieFase) return "border border-accent text-inkt-zacht";
  if (index < Math.max(bekekenIndex, sessieIndex)) return "bg-papier text-inkt-licht";
  return "text-inkt-licht hover:text-inkt";
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
