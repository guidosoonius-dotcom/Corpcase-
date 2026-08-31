"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { FASES, FASE_LABELS, type Fase } from "@/lib/supabase/types";
import { rolNaam, speelmodus } from "@/lib/content";
import { opslag } from "@/lib/sessie/api";
import { useAanwezigheid, useSessie } from "@/lib/sessie/gebruik";
import {
  aanwezig,
  alleBeelden,
  budgetStand,
  dekking,
  eigenFase,
  looptVoor,
  openHulpvragen,
  teamscore,
} from "@/lib/sessie/afgeleid";
import { Etiket, Kaart, Knop, Kop, Leeg, Melding } from "@/components/basis";
import { Thema } from "@/components/thema";
import { organisatie } from "@/lib/content";
import { KopieerIcoon, OogDichtIcoon, OogIcoon, WaarschuwingIcoon } from "@/components/icoon";

/**
 * Het scherm van de facilitator.
 *
 * Hij heeft twee dingen nodig die een speler niet heeft: de codes om mensen binnen te krijgen, en
 * zicht op waar het vastloopt — wie is er nog niet, wie heeft nog niets ingevuld, welke hulpvraag
 * blijft liggen. Pas daarna de knop naar de volgende fase.
 */
export default function BeheerPagina() {
  const parameters = useParams<{ id: string }>();
  const sessieId = parameters.id;
  const { state, identiteit, laden, fout, doe } = useSessie(sessieId);
  useAanwezigheid(sessieId, identiteit);
  const [gekopieerd, setGekopieerd] = useState(false);
  const [beheercodeZichtbaar, setBeheercodeZichtbaar] = useState(false);
  const [beheercodeGekopieerd, setBeheercodeGekopieerd] = useState(false);

  if (laden) return <main className="p-8 text-sm text-inkt-licht">Laden…</main>;

  if (!state || !identiteit) {
    return (
      <main className="mx-auto w-full max-w-md px-5 py-12">
        <Melding toon="risico">
          {fout ?? "Deze browser heeft geen toegang tot het beheer van deze sessie."}
        </Melding>
      </main>
    );
  }

  const eigenDeelnemer = state.deelnemers.find((d) => d.id === identiteit.deelnemerId);
  const ikBenFacilitator = eigenDeelnemer?.is_facilitator ?? false;
  // Wie alleen begeleidt heeft geen rol en dus ook geen eigen speelbord — de link ernaartoe heet
  // dan anders, zodat duidelijk is dat het om meekijken gaat en niet om meespelen.
  const ikSpeelMee = eigenDeelnemer?.rol_id != null;

  const modus = speelmodus(state.sessie.speelmodus);
  const beelden = alleBeelden(state);
  const score = teamscore(state);
  const gedekt = dekking(state);
  const vragen = openHulpvragen(state);
  const online = aanwezig(state);
  const stand = budgetStand(state);
  const huidigeIndex = FASES.indexOf(state.sessie.fase);

  async function naarFase(fase: Fase) {
    await doe(() => opslag.zetFase(identiteit!, sessieId, fase));
  }

  async function kopieerUitnodiging() {
    const link = `${window.location.origin}/deelnemen?code=${state!.sessie.join_code}`;
    try {
      await navigator.clipboard.writeText(
        `Doe mee aan de sessie "${state!.sessie.titel}".\nCode: ${state!.sessie.join_code}\n${link}`,
      );
      setGekopieerd(true);
      window.setTimeout(() => setGekopieerd(false), 2500);
    } catch {
      setGekopieerd(false);
    }
  }

  async function kopieerBeheercode() {
    if (!identiteit!.beheerCode) return;
    try {
      await navigator.clipboard.writeText(identiteit!.beheerCode);
      setBeheercodeGekopieerd(true);
      window.setTimeout(() => setBeheercodeGekopieerd(false), 2500);
    } catch {
      setBeheercodeGekopieerd(false);
    }
  }

  return (
    <Thema accent={organisatie(state.sessie.organisatie_id).thema.accent} className="flex-1">
    <main className="mx-auto w-full max-w-4xl px-4 py-6">
      <Kop
        boven="Facilitator"
        titel={state.sessie.titel}
        onder={`${modus.naam} · ${state.deelnemers.length} ${
          state.deelnemers.length === 1 ? "deelnemer" : "deelnemers"
        } · teamscore ${score.totaal}`}
        rechts={
          <div className="flex gap-2">
            <Link href={`/sessie/${sessieId}/scherm`} target="_blank">
              <Knop soort="rand">Beamer</Knop>
            </Link>
            <Link href={`/sessie/${sessieId}`}>
              <Knop soort="rand">{ikSpeelMee ? "Mijn spelerscherm" : "Sessie live volgen"}</Knop>
            </Link>
          </div>
        }
      />

      {!ikBenFacilitator ? (
        <div className="mt-4">
          <Melding>
            Je kijkt mee, maar het verzetten van de fase werkt alleen bij de facilitator.
          </Melding>
        </div>
      ) : null}

      {fout ? (
        <div className="mt-4">
          <Melding toon="risico">{fout}</Melding>
        </div>
      ) : null}

      <section className="mt-6">
        <Kaart className="p-4">
          <h2 className="display text-lg text-inkt">Meedoen</h2>
          <p
            /*
             * Bewust niet in de display-letter: deze code wordt overgetypt, en de hoge contrasten
             * van een serif maken letters juist dubbelzinnig. Ruime letterafstand, tabulaire
             * cijfers, en het alfabet zelf bevat al geen verwarrende tekens.
             */
            className="mt-3 font-mono text-4xl font-semibold tracking-[0.18em] text-accent-diep sm:text-5xl"
            /* Letter voor letter, anders leest een schermlezer de code als een woord voor. */
            aria-label={`Sessiecode ${state.sessie.join_code.split("").join(" ")}`}
          >
            {state.sessie.join_code}
          </p>
          <p className="mt-2 text-xs text-inkt-licht">
            Deelnemers gaan naar deze site en kiezen &lsquo;Deelnemen met een code&rsquo;.
          </p>
          <div className="mt-3">
            <Knop soort="rand" onClick={kopieerUitnodiging}>
              {gekopieerd ? null : <KopieerIcoon className="h-4 w-4" />}
              {gekopieerd ? "Gekopieerd" : "Uitnodiging kopiëren"}
            </Knop>
          </div>
        </Kaart>
      </section>

      {ikBenFacilitator ? (
        <section className="mt-6">
          <Kaart className="p-4">
            <h2 className="display text-lg text-inkt">Beheertoegang</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-inkt-zacht">
              Hiermee kom je als facilitator terug binnen — op een ander apparaat, een nieuwe
              browser, of als je het aan een collega overdraagt. Anders dan de sessiecode: wie
              deze heeft, kan de fase verzetten en de sessie verwijderen. Deel hem dus niet in het
              groepsberichtje.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBeheercodeZichtbaar((z) => !z)}
                className="inline-flex items-center gap-1 text-xs font-medium text-accent-diep hover:underline"
              >
                {beheercodeZichtbaar ? (
                  <OogDichtIcoon className="h-3.5 w-3.5" />
                ) : (
                  <OogIcoon className="h-3.5 w-3.5" />
                )}
                {beheercodeZichtbaar ? "Verberg de beheercode" : "Toon de beheercode"}
              </button>
            </div>
            {beheercodeZichtbaar ? (
              identiteit.beheerCode ? (
                <>
                  <p
                    className="mt-2 font-mono text-xl font-semibold tracking-[0.14em] text-accent-diep"
                    aria-label={`Beheercode ${identiteit.beheerCode.split("").join(" ")}`}
                  >
                    {identiteit.beheerCode}
                  </p>
                  <p className="mt-1 text-xs text-inkt-licht">
                    Inloggen kan op <code>/facilitator</code>.
                  </p>
                  <div className="mt-3">
                    <Knop soort="rand" onClick={kopieerBeheercode}>
                      {beheercodeGekopieerd ? null : <KopieerIcoon className="h-4 w-4" />}
                      {beheercodeGekopieerd ? "Gekopieerd" : "Beheercode kopiëren"}
                    </Knop>
                  </div>
                </>
              ) : (
                <p className="mt-2 text-xs text-inkt-licht">
                  Deze browser kent de beheercode niet meer. Log opnieuw in via{" "}
                  <code>/facilitator</code> met de code die je bij het starten kreeg.
                </p>
              )
            ) : null}
          </Kaart>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="display text-lg text-inkt">Fase</h2>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {FASES.map((fase, index) => {
            const actief = fase === state.sessie.fase;
            return (
              <Knop
                key={fase}
                soort={actief ? "primair" : "rand"}
                onClick={() => void naarFase(fase)}
                disabled={!ikBenFacilitator}
                className="justify-start"
              >
                {/*
                 * Op de actieve fase staat de knop in het accent, en daarop verdwijnt inkt-licht
                 * volledig (1,6). Het volgnummer wordt daar dus wit, net als het label.
                 */}
                <span className={`tabular-nums ${actief ? "text-white" : "text-inkt-licht"}`}>
                  {index}
                </span>
                {FASE_LABELS[fase]}
              </Knop>
            );
          })}
        </div>
        {huidigeIndex < FASES.length - 1 && ikBenFacilitator ? (
          <div className="mt-3">
            <Knop onClick={() => void naarFase(FASES[huidigeIndex + 1])}>
              Volgende fase: {FASE_LABELS[FASES[huidigeIndex + 1]]}
            </Knop>
          </div>
        ) : null}
      </section>

      <section className="mt-6">
        <h2 className="display text-lg text-inkt">Wie is er</h2>
        <ul className="mt-2 space-y-1.5">
          {state.deelnemers.map((deelnemer) => {
            const selecties = state.selecties.filter((s) => s.deelnemer_id === deelnemer.id).length;
            const ingebracht = state.usecases.filter((u) => u.eigenaar_id === deelnemer.id).length;
            const isOnline = online.some((d) => d.id === deelnemer.id);
            // Alleen een fase-etiket tonen als iemand van de groep is afgeweken; wie gewoon
            // meevolgt (het gangbare geval) hoeft daar geen aparte badge voor te krijgen.
            const afgeweken = deelnemer.eigen_fase != null;
            const voorop = afgeweken && looptVoor(deelnemer, state);

            return (
              <li
                key={deelnemer.id}
                className="flex flex-col gap-2 rounded-kaart border border-rand bg-vlak px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-inkt">
                    {deelnemer.naam}
                  </p>
                  <p className="text-xs text-inkt-licht">
                    {rolNaam(deelnemer.rol_id)}
                  </p>
                </div>
                {/*
                 * Op smalle schermen krijgen de badges hun eigen regel: het vierde etiket (de
                 * fase-afwijking) paste er niet meer naast de naam bij, en `shrink-0` op een
                 * krappe kolom duwde de rolnaam toen woord voor woord uit elkaar.
                 */}
                <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0 sm:justify-end">
                  <Etiket>{selecties} signalen</Etiket>
                  <Etiket>{ingebracht} use cases</Etiket>
                  {afgeweken ? (
                    <Etiket toon={voorop ? "aandacht" : "neutraal"}>
                      {voorop ? (
                        <WaarschuwingIcoon className="mr-0.5 inline h-3 w-3 -translate-y-px" />
                      ) : null}
                      bij {FASE_LABELS[eigenFase(deelnemer, state)]}
                    </Etiket>
                  ) : null}
                  <Etiket toon={isOnline ? "waarde" : "neutraal"}>
                    {isOnline ? "actief" : "stil"}
                  </Etiket>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="display text-lg text-inkt">Waar het hapert</h2>
        <div className="mt-2 space-y-2">
          {gedekt.domeinenOngedekt.length > 6 ? (
            <Melding>
              Het gesprek is nog smal: {gedekt.domeinenGedekt.length} van de{" "}
              {gedekt.domeinenGedekt.length + gedekt.domeinenOngedekt.length} domeinen geraakt.
            </Melding>
          ) : null}

          {gedekt.personasGemist.length > 0 ? (
            <Melding>
              {gedekt.personasGemist.length} van de huurderstypen komen nog nergens in terug.
            </Melding>
          ) : null}

          {beelden.filter((b) => b.volledigheid < 1).length > 0 &&
          state.sessie.fase === "waardebepaling" ? (
            <Melding>
              {beelden.filter((b) => b.volledigheid < 1).length === 1
                ? "Eén use case is nog niet volledig gewaardeerd."
                : `${beelden.filter((b) => b.volledigheid < 1).length} use cases zijn nog niet volledig gewaardeerd.`}
            </Melding>
          ) : null}

          {stand.overschreden.geld || stand.overschreden.capaciteit ? (
            <Melding toon="risico">
              Het budget is overschreden. Goed moment om te vragen wat er dan afvalt.
            </Melding>
          ) : null}

          {vragen.length > 0 ? (
            <Kaart className="p-3.5">
              <h3 className="text-xs font-semibold text-inkt">
                Open hulpvragen ({vragen.length})
              </h3>
              <ul className="mt-1.5 space-y-1.5">
                {vragen.map(({ bijdrage, vrager, usecase }) => (
                  <li key={bijdrage.id} className="text-xs leading-relaxed text-inkt-zacht">
                    <span className="font-medium text-inkt">
                      {vrager?.naam ?? "Iemand"}
                    </span>{" "}
                    bij {usecase?.titel ?? "een use case"}: {bijdrage.tekst}
                  </li>
                ))}
              </ul>
            </Kaart>
          ) : null}

          {gedekt.domeinenOngedekt.length <= 6 &&
          gedekt.personasGemist.length === 0 &&
          vragen.length === 0 &&
          !stand.overschreden.geld ? (
            <Leeg>Niets dat om aandacht vraagt.</Leeg>
          ) : null}
        </div>
      </section>
    </main>
    </Thema>
  );
}
