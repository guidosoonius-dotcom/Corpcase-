"use client";

import { useState } from "react";
import { organisatie, rol, rolopdrachtVoorRol, speelmodus } from "@/lib/content";
import type { SessieState } from "@/lib/supabase/types";
import type { BewaardeIdentiteit } from "@/lib/sessie/identiteit";
import { DonkerPaneel, Hoofdregel, Kaart, PijlActie } from "@/components/basis";
import { Cirkel, Halftoon, RasterCirkel } from "@/components/decoratie";
import { Aanwezigen } from "@/components/sessiebalk";
import { OogDichtIcoon, OogIcoon, RolIcoon } from "@/components/icoon";

/**
 * Fase 0: de lobby.
 *
 * Het scherm met de minste inhoud en daarom de plek waar de vormtaal het meest te zeggen heeft:
 * cirkels achter de kaarten, een lichte kaart met de kengetallen, en daaroverheen de houtskoolkaart
 * met de rol waarmee je meedoet.
 */
export function Lobby({
  state,
  identiteit,
}: {
  state: SessieState;
  identiteit: BewaardeIdentiteit;
}) {
  const [opdrachtZichtbaar, setOpdrachtZichtbaar] = useState(false);
  const org = organisatie(state.sessie.organisatie_id);
  const modus = speelmodus(state.sessie.speelmodus);
  const ik = state.deelnemers.find((d) => d.id === identiteit.deelnemerId);
  const mijnRol = ik ? rol(ik.rol_id) : undefined;
  const opdracht = ik ? rolopdrachtVoorRol(ik.rol_id) : undefined;

  return (
    <div className="relative">
      {/*
        Rechtsboven een uitgesneden foto op de plek waar eerder het volle koraal stond — zelfde
        formaat en dezelfde vanBoven-marge onder de kopregel. Linksboven blijft de zachte tint,
        die ook achter tekst leesbaar is.
      */}
      <Cirkel
        hoek="rechtsboven"
        formaat={0.58}
        vanBoven={44}
        afbeelding={{ src: "/illustraties/lobby.jpg", verschuifX: -8, verschuifY: 6 }}
      />
      <Cirkel hoek="linksboven" formaat={0.36} toon="zacht" vanBoven={44} />

      <Hoofdregel links={state.sessie.titel} rechts="Lobby" />

      <div className="relative mt-14">
        <RasterCirkel formaat={110} className="absolute -left-4 top-4 -z-10" />
        <h1 className="display text-4xl leading-[1.06] text-inkt sm:text-5xl">
          Klaar om
          <br />
          te beginnen
        </h1>
        <p className="mt-3.5 max-w-[16rem] text-sm leading-relaxed text-inkt-zacht">
          Zodra iedereen binnen is, opent de facilitator de eerste fase.
        </p>
      </div>

      <Kaart onderruimte className="mt-8 p-[18px]">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-inkt-licht">
          Waar we naar kijken
        </span>
        <p className="display mt-2 text-xl leading-snug text-inkt">{org.naam}</p>
        <dl className="mt-4 grid grid-cols-2 gap-4">
          {org.kengetallen.slice(0, 2).map((k) => (
            <div key={k.id}>
              <dt className="text-[10px] leading-snug text-inkt-licht">{k.label}</dt>
              <dd className="cijfer mt-1 text-2xl text-inkt">
                {k.notatie ?? k.waarde.toLocaleString("nl-NL")}
              </dd>
            </div>
          ))}
        </dl>
      </Kaart>

      {mijnRol ? (
        <DonkerPaneel overlapt bloedt="rechts" className="ml-10 p-5">
          <div aria-hidden className="absolute -right-4 top-0 h-full w-32 text-white/[0.07]">
            <Halftoon />
          </div>
          <div className="relative">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-houtskool-zacht">
              Jouw bril
            </span>
            <p className="display mt-2 flex items-center gap-2 text-2xl leading-[1.18] text-white">
              <RolIcoon rolId={mijnRol.id} className="h-5 w-5 shrink-0 text-accent-op-donker" />
              {mijnRol.naam}
            </p>
            <p className="mt-3 max-w-[15rem] text-xs leading-relaxed text-houtskool-zacht">
              {mijnRol.lens}. De vraag die jij bewaakt: {mijnRol.vraag.toLowerCase()}
            </p>
            {opdracht ? (
              <div className="mt-4 border-t border-houtskool-rand pt-3">
                <button
                  type="button"
                  onClick={() => setOpdrachtZichtbaar((z) => !z)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-op-donker hover:underline"
                >
                  {opdrachtZichtbaar ? (
                    <OogDichtIcoon className="h-3.5 w-3.5" />
                  ) : (
                    <OogIcoon className="h-3.5 w-3.5" />
                  )}
                  {opdrachtZichtbaar
                    ? "Verberg je privé-opdracht"
                    : "Je privé-opdracht staat klaar — alleen voor jou"}
                </button>
                {opdrachtZichtbaar ? (
                  <p className="mt-1.5 rounded-kaart border-l-2 border-accent bg-houtskool-rand px-3 py-2 text-xs leading-relaxed text-white">
                    {opdracht.opdracht}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </DonkerPaneel>
      ) : null}

      <section className="mt-8">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-inkt-licht">
          Aan tafel ({state.deelnemers.length})
        </h2>
        <div className="mt-2.5">
          <Aanwezigen state={state} />
        </div>
      </section>

      <PijlActie
        label={`Speelduur: ${modus.naam.toLowerCase()}`}
        tekst="Wachten op de facilitator"
      />
    </div>
  );
}
