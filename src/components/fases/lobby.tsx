"use client";

import { organisatie, rol, speelmodus } from "@/lib/content";
import type { SessieState } from "@/lib/supabase/types";
import type { BewaardeIdentiteit } from "@/lib/sessie/identiteit";
import { Kaart, Kop } from "@/components/basis";
import { Cirkel } from "@/components/decoratie";
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
    <div className="relative space-y-6 overflow-hidden">
      <Cirkel hoek="rechtsboven" formaat={0.45} toon="zacht" />
      <Kop
        boven="Lobby"
        titel="Klaar om te beginnen"
        onder="Zodra iedereen binnen is, opent de facilitator de eerste fase."
      />

      {mijnRol ? (
        <Kaart className="p-4">
          <h2 className="display text-lg text-inkt">Jouw bril: {mijnRol.naam}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-inkt-zacht">
            {mijnRol.lens}. De vraag die jij bewaakt: <em>{mijnRol.vraag}</em>
          </p>
        </Kaart>
      ) : null}

      <Kaart className="p-4">
        <h2 className="display text-lg text-inkt">Waar we naar kijken</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-inkt-zacht">
          {org.naam} — {org.pitch}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          {org.kengetallen.slice(0, 4).map((k) => (
            <div key={k.id}>
              <dt className="text-xs leading-snug text-inkt-licht">{k.label}</dt>
              <dd className="cijfer mt-0.5 text-2xl text-inkt">
                {k.notatie ?? k.waarde.toLocaleString("nl-NL")}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-inkt-licht">
          Deze cijfers komen uit publieke bronnen en zijn nog niet tegen het originele jaarverslag
          geverifieerd. Ze zijn er om het gesprek te starten.
        </p>
      </Kaart>

      <Kaart className="p-4">
        <h2 className="display text-lg text-inkt">
          Speelduur: {modus.naam.toLowerCase()}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-inkt-zacht">
          {modus.omschrijving}
        </p>
      </Kaart>

      <div>
        <h2 className="display text-lg text-inkt">
          Aan tafel ({state.deelnemers.length})
        </h2>
        <div className="mt-2">
          <Aanwezigen state={state} />
        </div>
      </div>
    </div>
  );
}
