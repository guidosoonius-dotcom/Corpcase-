"use client";

import { useMemo, useState } from "react";
import { bedrijfsfuncties, domein, procesmodus } from "@/lib/content";
import { Etiket, Hoofdregel, Kaart, Knop, Kop, Melding, PijlActie, Veld, invoerStijl } from "@/components/basis";
import { opslag } from "@/lib/sessie/api";
import type { BewaardeIdentiteit } from "@/lib/sessie/identiteit";
import type { SessieState } from "@/lib/supabase/types";

/**
 * Fase 1 van de processessie: welk proces gaat er op tafel?
 *
 * De keuze komt uit het CORA-functiemodel, zodat het gesprek niet begint bij "waar hebben we
 * eigenlijk last van" maar bij een benoemd proces dat de hele sector herkent. Wie een sessie 1
 * heeft gespeeld ziet daarbij welke functies raken aan wat daar al op tafel lag — als markering,
 * niet als voorselectie: het team kiest zelf.
 */
export function Proceskeuze({
  state,
  identiteit,
  doe,
}: {
  state: SessieState;
  identiteit: BewaardeIdentiteit;
  doe: (actie: () => Promise<unknown>) => Promise<void>;
}) {
  const modus = procesmodus(state.sessie.speelmodus);
  const [zoek, setZoek] = useState("");
  const [aanleiding, setAanleiding] = useState<Record<string, string>>({});

  const gekozenFunctieIds = new Set(state.processen.map((p) => p.functie_id));
  const vol = state.processen.length >= modus.max_processen;

  /**
   * De domeinen waar sessie 1 op uitkwam. Een functie in zo'n domein krijgt een markering: daar
   * heeft dit team al eens iets over gezegd, dus daar ligt waarschijnlijk ook het proces waar hun
   * use cases op landen.
   */
  const uitVorigeSessie = useMemo(
    () => new Set(state.sessie.herkomst?.gedekte_domeinen ?? []),
    [state.sessie.herkomst],
  );

  const gevonden = useMemo(() => {
    const term = zoek.trim().toLowerCase();
    const lijst = bedrijfsfuncties.functies.filter(
      (f) =>
        !term ||
        f.naam.toLowerCase().includes(term) ||
        f.groep.toLowerCase().includes(term),
    );
    // Wat aansluit op de vorige sessie bovenaan, de rest daaronder in modelvolgorde.
    return [...lijst].sort((a, b) => {
      const aRaakt = uitVorigeSessie.has(a.domein) ? 0 : 1;
      const bRaakt = uitVorigeSessie.has(b.domein) ? 0 : 1;
      return aRaakt - bRaakt;
    });
  }, [zoek, uitVorigeSessie]);

  async function kies(functieId: string, titel: string) {
    await doe(() =>
      opslag.voegProcesToe(identiteit, {
        sessieId: state.sessie.id,
        functieId,
        titel,
        aanleiding: aanleiding[functieId]?.trim() ?? "",
      }),
    );
    setAanleiding((huidig) => ({ ...huidig, [functieId]: "" }));
  }

  return (
    <div className="space-y-5">
      <Hoofdregel links={state.sessie.titel} rechts="Fase 1 · Proceskeuze" />
      <Kop
        boven="Fase 1 · Proceskeuze"
        titel="Welk proces leggen we op tafel?"
        onder="Kies een bedrijfsfunctie uit het CORA-model. Niet het proces waar het meeste over geklaagd wordt, maar het proces waar jullie iets aan kunnen veranderen."
      />

      {state.sessie.herkomst ? (
        <Melding>
          Deze sessie volgt op <strong>{state.sessie.herkomst.titel}</strong>. Functies in de
          domeinen die daar aan bod kwamen staan bovenaan en zijn gemarkeerd.
        </Melding>
      ) : null}

      {state.processen.length > 0 ? (
        <section>
          <h2 className="display text-lg text-inkt">Op tafel</h2>
          <ul className="mt-2 space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {state.processen.map((proces) => (
              <li key={proces.id}>
                <Kaart className="p-3">
                  <p className="text-sm font-medium text-inkt">{proces.titel}</p>
                  {proces.aanleiding ? (
                    <p className="mt-1 text-xs leading-relaxed text-inkt-zacht">
                      {proces.aanleiding}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void doe(() => opslag.verwijderProces(identiteit, proces.id))}
                    className="mt-2 text-xs font-medium text-accent-diep hover:underline"
                  >
                    Van tafel halen
                  </button>
                </Kaart>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {vol ? (
        <Melding>
          Jullie hebben {state.processen.length}{" "}
          {state.processen.length === 1 ? "proces" : "processen"} op tafel, het maximum voor deze
          speelduur. Haal er een weg om ruimte te maken, of ga door naar het afpellen.
        </Melding>
      ) : null}

      <section>
        <h2 className="display text-lg text-inkt">Bedrijfsfuncties</h2>
        <div className="mt-2">
          <input
            className={invoerStijl}
            value={zoek}
            onChange={(e) => setZoek(e.target.value)}
            placeholder="Zoeken in de 61 functies…"
            aria-label="Zoeken in de bedrijfsfuncties"
          />
        </div>

        <ul className="mt-3 space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
          {gevonden.slice(0, 24).map((functie) => {
            const alGekozen = gekozenFunctieIds.has(functie.id);
            const raaktVorige = uitVorigeSessie.has(functie.domein);
            return (
              <li key={functie.id}>
                <Kaart className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug text-inkt">{functie.naam}</p>
                      {/*
                       * Groep en domein vallen soms samen ("Vastgoedonderhoud · Vastgoedonderhoud").
                       * Dan één keer noemen; twee keer hetzelfde woord leest als een fout.
                       */}
                      <p className="mt-0.5 text-xs text-inkt-licht">
                        {[functie.groep, domein(functie.domein)?.naam ?? functie.domein]
                          .filter((tekst, index, alles) => alles.indexOf(tekst) === index)
                          .join(" · ")}
                      </p>
                    </div>
                    <Etiket>{functie.soort}</Etiket>
                  </div>

                  {raaktVorige ? (
                    <p className="mt-1.5 text-xs font-medium text-accent-diep">
                      Raakt aan waar jullie het in de vorige sessie over hadden
                    </p>
                  ) : null}

                  {alGekozen ? (
                    <p className="mt-2 text-xs text-inkt-licht">Staat al op tafel.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      <Veld label="Waarom dit proces?" hint="Eén zin. Wat is de aanleiding?">
                        <input
                          className={`${invoerStijl} !py-1.5 !text-sm`}
                          value={aanleiding[functie.id] ?? ""}
                          onChange={(e) =>
                            setAanleiding((h) => ({ ...h, [functie.id]: e.target.value }))
                          }
                          placeholder="Optioneel"
                        />
                      </Veld>
                      <Knop
                        soort="rand"
                        disabled={vol}
                        className="!px-3 !py-2 !text-xs"
                        onClick={() => void kies(functie.id, functie.naam)}
                      >
                        Op tafel leggen
                      </Knop>
                    </div>
                  )}
                </Kaart>
              </li>
            );
          })}
        </ul>

        {gevonden.length > 24 ? (
          <p className="mt-2 text-xs text-inkt-licht">
            Nog {gevonden.length - 24} functies. Zoek om ze te vinden.
          </p>
        ) : null}
      </section>

      <PijlActie
        label="Volgende"
        tekst={
          state.processen.length === 0
            ? "Leg eerst een proces op tafel"
            : "Pel het proces af tot stappen"
        }
      />
    </div>
  );
}
