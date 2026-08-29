"use client";

import { useState } from "react";
import { opslag } from "@/lib/sessie/api";
import type { BijdrageSoort, SessieState } from "@/lib/supabase/types";
import type { BewaardeIdentiteit } from "@/lib/sessie/identiteit";
import { Etiket, Knop, invoerStijl } from "./basis";

/**
 * Elkaar helpen bij één use case.
 *
 * Drie soorten bijdragen, met opzet met verschillende bedoelingen:
 * - een hulpvraag geeft toe dat je iets niet weet, en maakt dat zichtbaar voor wie het wél weet;
 * - een aanvulling beantwoordt zo'n vraag of vult de use case aan;
 * - een kanttekening maakt een aanname expliciet, zodat die in het eindrapport terechtkomt in
 *   plaats van in iemands hoofd te blijven zitten.
 */

const SOORT_LABEL: Record<BijdrageSoort, string> = {
  hulpvraag: "Hulpvraag",
  assist: "Aanvulling",
  challenge: "Kanttekening",
  opmerking: "Opmerking",
};

const SOORT_TOON: Record<BijdrageSoort, "neutraal" | "accent" | "waarde" | "aandacht"> = {
  hulpvraag: "aandacht",
  assist: "waarde",
  challenge: "accent",
  opmerking: "neutraal",
};

const PLAATSHOUDER: Record<BijdrageSoort, string> = {
  hulpvraag: "Wat weet je niet? Bijvoorbeeld: ik weet niet hoeveel meldingen dit per jaar zijn.",
  assist: "Wat weet jij dat helpt?",
  challenge: "Welke aanname zit hier onder die niet vanzelf spreekt?",
  opmerking: "Wat wil je kwijt?",
};

export function Bijdragen({
  state,
  identiteit,
  doe,
  usecaseId,
}: {
  state: SessieState;
  identiteit: BewaardeIdentiteit;
  doe: (actie: () => Promise<unknown>) => Promise<void>;
  usecaseId: string;
}) {
  const [soort, setSoort] = useState<BijdrageSoort>("hulpvraag");
  const [tekst, setTekst] = useState("");
  const [beantwoordt, setBeantwoordt] = useState<string | null>(null);

  const bijdragen = state.bijdragen.filter((b) => b.usecase_id === usecaseId);

  async function versturen() {
    if (!tekst.trim()) return;
    await doe(() =>
      opslag.voegBijdrageToe(identiteit, {
        sessieId: state.sessie.id,
        deelnemerId: identiteit.deelnemerId,
        soort,
        tekst: tekst.trim(),
        usecaseId,
        beantwoordtId: beantwoordt,
      }),
    );
    setTekst("");
    setBeantwoordt(null);
  }

  function naamVan(deelnemerId: string): string {
    return state.deelnemers.find((d) => d.id === deelnemerId)?.naam ?? "Iemand";
  }

  return (
    <div>
      <h4 className="text-xs font-semibold text-inkt">Samen scherper maken</h4>

      {bijdragen.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {bijdragen.map((b) => {
            const isOpenVraag = b.soort === "hulpvraag" && !b.opgelost;
            const vanMij = b.deelnemer_id === identiteit.deelnemerId;

            return (
              <li
                key={b.id}
                className={`rounded-kaart border bg-vlak px-3 py-2 ${
                  isOpenVraag ? "border-aandacht" : "border-rand"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Etiket toon={SOORT_TOON[b.soort]}>{SOORT_LABEL[b.soort]}</Etiket>
                  <span className="text-[11px] text-inkt-licht">
                    {naamVan(b.deelnemer_id)}
                  </span>
                  {b.opgelost ? <Etiket toon="waarde">opgelost</Etiket> : null}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-inkt-zacht">{b.tekst}</p>

                {isOpenVraag ? (
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {!vanMij ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSoort("assist");
                          setBeantwoordt(b.id);
                        }}
                        className="text-xs font-medium text-accent-diep hover:underline"
                      >
                        Hier antwoord op geven
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void doe(() => opslag.markeerOpgelost(identiteit, b.id))}
                      className="text-xs font-medium text-inkt-licht hover:underline"
                    >
                      Markeer als opgelost
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-1.5 text-xs text-inkt-licht">
          Nog niets. Weet je iets niet? Zet er een hulpvraag bij; iemand anders weet het vaak wel.
        </p>
      )}

      <div className="mt-3 space-y-2">
        <div className="flex gap-1.5">
          {(["hulpvraag", "assist", "challenge"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSoort(s);
                if (s !== "assist") setBeantwoordt(null);
              }}
              className={`flex-1 rounded-kaart border px-2 py-2 text-xs font-medium transition-colors ${
                soort === s
                  ? "border-accent-sterk bg-accent-sterk text-white"
                  : "border-rand-sterk bg-vlak text-inkt-zacht"
              }`}
            >
              {SOORT_LABEL[s]}
            </button>
          ))}
        </div>

        {beantwoordt ? (
          <p className="text-[11px] text-inkt-licht">
            Je antwoordt op een hulpvraag.{" "}
            <button
              type="button"
              onClick={() => setBeantwoordt(null)}
              className="font-medium text-accent-diep hover:underline"
            >
              Losmaken
            </button>
          </p>
        ) : null}

        <textarea
          className={`${invoerStijl} min-h-16 !text-sm`}
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          placeholder={PLAATSHOUDER[soort]}
        />
        <Knop soort="rand" onClick={versturen} disabled={!tekst.trim()}>
          Toevoegen
        </Knop>
      </div>
    </div>
  );
}
