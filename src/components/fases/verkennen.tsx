"use client";

import { useMemo, useState } from "react";
import { alleSignalen, rol, speelmodus, type SignaalKaart } from "@/lib/content";
import { opslag } from "@/lib/sessie/api";
import type { SessieState } from "@/lib/supabase/types";
import type { BewaardeIdentiteit } from "@/lib/sessie/identiteit";
import { Etiket, Hoofdregel, Kaart, Knop, Kop, Melding } from "@/components/basis";

const PER_PORTIE = 12;

const LENS_LABELS: Record<SignaalKaart["lens"], string> = {
  jaarverslag: "Jaarverslag",
  huurder: "Huurder",
  uitdaging: "Uitdaging",
  domein: "Domein",
};

/**
 * Fase 1: door welke ogen kijk je?
 *
 * De speler markeert wat hij herkent. Dat is opzettelijk geen brainstorm over oplossingen: eerst
 * vaststellen wat er speelt, met een bron erbij, zodat de use cases straks ergens uit voortkomen
 * in plaats van uit de lucht te vallen.
 */
export function Verkennen({
  state,
  identiteit,
  doe,
}: {
  state: SessieState;
  identiteit: BewaardeIdentiteit;
  doe: (actie: () => Promise<unknown>) => Promise<void>;
}) {
  const [lens, setLens] = useState<SignaalKaart["lens"] | "alle">("alle");
  // Er zijn ruim veertig kaarten. Alles tegelijk tonen is op een telefoon een scrollmarathon
  // waarin niemand nog kiest; per portie van twaalf blijft het een gesprek.
  const [portie, setPortie] = useState(1);
  const modus = speelmodus(state.sessie.speelmodus);
  const ik = state.deelnemers.find((d) => d.id === identiteit.deelnemerId);
  const mijnRol = ik ? rol(ik.rol_id) : undefined;

  const signalen = useMemo(
    () => alleSignalen(state.sessie.organisatie_id),
    [state.sessie.organisatie_id],
  );

  const mijnSelecties = state.selecties.filter((s) => s.deelnemer_id === identiteit.deelnemerId);
  const gekozen = new Set(mijnSelecties.map((s) => s.signaal_id));

  /**
   * De kaarten die bij jouw rol horen komen bovenaan. Niet gefilterd: iedereen mag overal naar
   * kijken, maar je begint bij wat jij het beste kunt beoordelen.
   */
  const gesorteerd = useMemo(() => {
    const relevant = new Set(mijnRol?.kijkt_naar ?? []);
    const zichtbaar = lens === "alle" ? signalen : signalen.filter((s) => s.lens === lens);
    return [...zichtbaar].sort((a, b) => {
      const scoreA = a.domeinen?.some((d) => relevant.has(d)) ? 0 : 1;
      const scoreB = b.domeinen?.some((d) => relevant.has(d)) ? 0 : 1;
      return scoreA - scoreB;
    });
  }, [signalen, lens, mijnRol]);

  async function wissel(signaal: SignaalKaart) {
    if (gekozen.has(signaal.id)) {
      await doe(() =>
        opslag.verwijderSignaalSelectie(identiteit, {
          deelnemerId: identiteit.deelnemerId,
          signaalId: signaal.id,
        }),
      );
      return;
    }
    await doe(() =>
      opslag.selecteerSignaal(identiteit, {
        sessieId: state.sessie.id,
        deelnemerId: identiteit.deelnemerId,
        signaalId: signaal.id,
        herkenning: 3,
      }),
    );
  }

  async function zetHerkenning(signaalId: string, herkenning: number) {
    await doe(() =>
      opslag.selecteerSignaal(identiteit, {
        sessieId: state.sessie.id,
        deelnemerId: identiteit.deelnemerId,
        signaalId,
        herkenning,
      }),
    );
  }

  // Al gekozen kaarten blijven altijd in beeld, ook als ze buiten de huidige portie vallen.
  const zichtbaar = gesorteerd.filter(
    (signaal, index) => index < portie * PER_PORTIE || gekozen.has(signaal.id),
  );

  const genoeg = mijnSelecties.length >= modus.min_signalen_per_speler;

  return (
    <div className="space-y-5">
      <Hoofdregel links={state.sessie.titel} rechts="Fase 1 · Verkennen" />
      <Kop
        boven="Fase 1 · Verkennen"
        titel="Wat herken je?"
        onder="Markeer wat je in je eigen organisatie terugziet. Kies liever een paar dingen die echt schuren dan alles wat waar is."
      />

      <div className={genoeg ? "" : "niet-printen"}>
        {genoeg ? (
          <Melding toon="accent">
            Je hebt er {mijnSelecties.length} gemarkeerd. Genoeg om verder te kunnen; meer mag.
          </Melding>
        ) : (
          <Melding>
            Kies er minstens {modus.min_signalen_per_speler}. Je hebt er nu {mijnSelecties.length}.
          </Melding>
        )}
      </div>

      <div className="scroll-x flex gap-1.5 pb-1">
        {(["alle", "jaarverslag", "huurder", "uitdaging", "domein"] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => {
              setLens(l);
              setPortie(1);
            }}
            className={`shrink-0 rounded-kaart border px-3 py-1.5 text-xs font-medium transition-colors ${
              lens === l
                ? "border-accent-sterk bg-accent-sterk text-white"
                : "border-rand-sterk bg-vlak text-inkt-zacht"
            }`}
          >
            {l === "alle" ? "Alles" : LENS_LABELS[l]}
          </button>
        ))}
      </div>

      <ul className="space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
        {zichtbaar.map((signaal) => {
          const selectie = mijnSelecties.find((s) => s.signaal_id === signaal.id);
          const isGekozen = Boolean(selectie);
          const anderen = state.selecties.filter(
            (s) => s.signaal_id === signaal.id && s.deelnemer_id !== identiteit.deelnemerId,
          ).length;

          return (
            <li key={signaal.id}>
              <Kaart aandacht={isGekozen} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => void wissel(signaal)}
                  className="block w-full px-4 py-3 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-medium leading-snug text-inkt">
                      {signaal.titel}
                    </span>
                    <span className="mt-0.5 shrink-0">
                      <Etiket toon={isGekozen ? "accent" : "neutraal"}>
                        {LENS_LABELS[signaal.lens]}
                      </Etiket>
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-inkt-zacht">
                    {signaal.tekst}
                  </p>
                  {signaal.detail?.frustraties ? (
                    <ul className="mt-2 space-y-0.5">
                      {signaal.detail.frustraties.map((f) => (
                        <li key={f} className="text-xs leading-relaxed text-inkt-licht">
                          — {f}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {signaal.bron ? (
                      <span className="text-[11px] text-inkt-licht">
                        Bron: {signaal.bron}
                        {signaal.geverifieerd === false ? " (nog te verifiëren)" : ""}
                      </span>
                    ) : null}
                    {anderen > 0 ? (
                      <Etiket toon="waarde">
                        {anderen} {anderen === 1 ? "collega herkent dit ook" : "collega's herkennen dit ook"}
                      </Etiket>
                    ) : null}
                  </div>
                </button>

                {isGekozen ? (
                  <div className="border-t border-rand bg-papier px-4 py-2.5">
                    <p className="text-xs text-inkt-zacht">Hoe hard speelt dit bij ons?</p>
                    <div className="mt-1.5 flex gap-1.5">
                      {[
                        { n: 1, label: "Nauwelijks" },
                        { n: 3, label: "Merkbaar" },
                        { n: 5, label: "Urgent" },
                      ].map((optie) => (
                        <Knop
                          key={optie.n}
                          soort={selectie?.herkenning === optie.n ? "primair" : "rand"}
                          onClick={() => void zetHerkenning(signaal.id, optie.n)}
                          className="flex-1 !px-2 !py-2 !text-xs"
                        >
                          {optie.label}
                        </Knop>
                      ))}
                    </div>
                  </div>
                ) : null}
              </Kaart>
            </li>
          );
        })}
      </ul>

      {zichtbaar.length < gesorteerd.length ? (
        <Knop soort="rand" onClick={() => setPortie((p) => p + 1)} className="w-full">
          Nog {gesorteerd.length - zichtbaar.length} kaarten tonen
        </Knop>
      ) : null}
    </div>
  );
}
