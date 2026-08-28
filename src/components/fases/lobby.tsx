"use client";

import { organisatie, rol, speelmodus } from "@/lib/content";
import type { SessieState } from "@/lib/supabase/types";
import type { BewaardeIdentiteit } from "@/lib/sessie/identiteit";
import { Kaart, Kop } from "@/components/basis";
import { Aanwezigen } from "@/components/sessiebalk";

export function Lobby({
  state,
  identiteit,
}: {
  state: SessieState;
  identiteit: BewaardeIdentiteit;
}) {
  const org = organisatie(state.sessie.organisatie_id);
  const modus = speelmodus(state.sessie.speelmodus);
  const ik = state.deelnemers.find((d) => d.id === identiteit.deelnemerId);
  const mijnRol = ik ? rol(ik.rol_id) : undefined;

  return (
    <div className="space-y-6">
      <Kop
        boven="Lobby"
        titel="Klaar om te beginnen"
        onder="Zodra iedereen binnen is, opent de facilitator de eerste fase."
      />

      {mijnRol ? (
        <Kaart className="p-4">
          <h2 className="text-sm font-semibold text-[--color-inkt]">Jouw bril: {mijnRol.naam}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[--color-inkt-zacht]">
            {mijnRol.lens}. De vraag die jij bewaakt: <em>{mijnRol.vraag}</em>
          </p>
        </Kaart>
      ) : null}

      <Kaart className="p-4">
        <h2 className="text-sm font-semibold text-[--color-inkt]">Waar we naar kijken</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[--color-inkt-zacht]">
          {org.naam} — {org.pitch}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          {org.kengetallen.slice(0, 4).map((k) => (
            <div key={k.id}>
              <dt className="text-xs leading-snug text-[--color-inkt-licht]">{k.label}</dt>
              <dd className="text-sm font-semibold tabular-nums text-[--color-inkt]">
                {k.notatie ?? k.waarde.toLocaleString("nl-NL")}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-[--color-inkt-licht]">
          Deze cijfers komen uit publieke bronnen en zijn nog niet tegen het originele jaarverslag
          geverifieerd. Ze zijn er om het gesprek te starten.
        </p>
      </Kaart>

      <Kaart className="p-4">
        <h2 className="text-sm font-semibold text-[--color-inkt]">
          Speelduur: {modus.naam.toLowerCase()}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[--color-inkt-zacht]">
          {modus.omschrijving}
        </p>
      </Kaart>

      <div>
        <h2 className="text-sm font-semibold text-[--color-inkt]">
          Aan tafel ({state.deelnemers.length})
        </h2>
        <div className="mt-2">
          <Aanwezigen state={state} />
        </div>
      </div>
    </div>
  );
}
