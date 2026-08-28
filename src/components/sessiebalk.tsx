"use client";

import { useState } from "react";
import { FASES, FASE_LABELS, type Fase } from "@/lib/supabase/types";
import { rol, rolopdrachten } from "@/lib/content";
import type { BewaardeIdentiteit } from "@/lib/sessie/identiteit";
import type { SessieState } from "@/lib/supabase/types";
import { teamscore } from "@/lib/sessie/afgeleid";
import { Etiket } from "./basis";

/**
 * De vaste kop boven elk spelerscherm: waar zijn we, wie ben ik, hoe staat het team ervoor.
 *
 * De rolopdracht zit hier achter een knop en niet open in beeld: hij is privé tot de onthulling,
 * en iemand die zijn telefoon laat zien mag hem niet per ongeluk weggeven.
 */
export function Sessiebalk({
  state,
  identiteit,
}: {
  state: SessieState;
  identiteit: BewaardeIdentiteit;
}) {
  const [opdrachtZichtbaar, setOpdrachtZichtbaar] = useState(false);
  const ik = state.deelnemers.find((d) => d.id === identiteit.deelnemerId);
  const mijnRol = ik ? rol(ik.rol_id) : undefined;
  const opdracht = rolopdrachten.opdrachten.find((o) => o.id === ik?.rolopdracht_id);
  const score = teamscore(state);

  return (
    <header className="border-b border-rand bg-vlak">
      <div className="mx-auto w-full max-w-4xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-inkt-licht">{state.sessie.titel}</p>
            <p className="truncate text-sm font-semibold text-inkt">
              {mijnRol?.naam ?? ik?.naam ?? "Deelnemer"}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-inkt-licht">Teamscore</p>
            <p className="text-sm font-semibold tabular-nums text-accent">
              {score.totaal}
            </p>
          </div>
        </div>

        <ol className="scroll-x mt-3 flex gap-1 pb-0.5">
          {FASES.map((f) => (
            <li key={f} className="shrink-0">
              <span
                className={`inline-block rounded px-2 py-1 text-[11px] font-medium ${stijlVoorFase(f, state.sessie.fase)}`}
              >
                {FASE_LABELS[f]}
              </span>
            </li>
          ))}
        </ol>

        {opdracht ? (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setOpdrachtZichtbaar((z) => !z)}
              className="text-xs font-medium text-accent hover:underline"
            >
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

function stijlVoorFase(fase: Fase, huidig: Fase): string {
  const index = FASES.indexOf(fase);
  const huidigIndex = FASES.indexOf(huidig);
  if (index === huidigIndex) return "bg-accent text-white";
  if (index < huidigIndex) return "bg-papier text-inkt-licht";
  return "text-inkt-licht";
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
