"use client";

import { speelmodi, speelmodus } from "@/lib/content";
import { opslag } from "@/lib/sessie/api";
import { portfolio, alleBeelden, type UsecaseBeeld } from "@/lib/sessie/afgeleid";
import { formatteerBandbreedte } from "@/lib/waarde/berekening";
import type { SessieState } from "@/lib/supabase/types";
import type { BewaardeIdentiteit } from "@/lib/sessie/identiteit";
import { Etiket, Hoofdregel, Kaart, Knop, Kop, Leeg, Melding, invoerStijl } from "@/components/basis";

/**
 * Fase 5: wanneer doen we wat?
 *
 * Alleen wat in het portfolio zit komt hier terug. Drie horizons, en per use case de vraag wat er
 * eerst af moet — die randvoorwaarden zijn achteraf vaak het waardevolste deel van het rapport,
 * omdat ze verklaren waarom iets níét in de eerste horizon staat.
 */
export function Roadmap({
  state,
  identiteit,
  doe,
}: {
  state: SessieState;
  identiteit: BewaardeIdentiteit;
  doe: (actie: () => Promise<unknown>) => Promise<void>;
}) {
  const modus = speelmodus(state.sessie.speelmodus);
  const inPortfolio = portfolio(state);
  const horizonnen = speelmodi.horizonnen.filter((h) => modus.roadmap_horizonnen.includes(h.id));
  const nogNietGeplaatst = inPortfolio.filter(
    (b) => !state.roadmap.some((r) => r.usecase_id === b.usecase.id),
  );

  return (
    <div className="space-y-6">
      <Hoofdregel links={state.sessie.titel} rechts="Fase 5 · Roadmap" />
      <Kop
        boven="Fase 5 · Roadmap"
        titel="Wanneer doen we wat?"
        onder="Verdeel het portfolio over de horizons en benoem wat er eerst af moet."
      />

      {inPortfolio.length === 0 ? (
        <Leeg>
          Er zit nog niets in het portfolio. Ga terug naar de prioritering om use cases op te nemen.
        </Leeg>
      ) : (
        <>
          {nogNietGeplaatst.length > 0 ? (
            <Melding>
              Nog {nogNietGeplaatst.length} use{" "}
              {nogNietGeplaatst.length === 1 ? "case" : "cases"} zonder horizon.
            </Melding>
          ) : null}

          {horizonnen.map((horizon) => {
            const items = state.roadmap.filter((r) => r.horizon === horizon.id);
            return (
              <section key={horizon.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="display text-lg text-inkt">
                    {horizon.naam}{" "}
                    <span className="font-normal text-inkt-licht">
                      · {horizon.periode}
                    </span>
                  </h2>
                  <span className="text-xs tabular-nums text-inkt-licht">
                    {items.length}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-inkt-licht">{horizon.vraag}</p>

                <ul className="mt-2 space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
                  {items.map((item) => {
                    const beeld = inPortfolio.find((b) => b.usecase.id === item.usecase_id);
                    if (!beeld) return null;
                    return (
                      <li key={item.usecase_id}>
                        <RoadmapKaart
                          state={state}
                          identiteit={identiteit}
                          doe={doe}
                          beeld={beeld}
                          horizonIds={modus.roadmap_horizonnen}
                          randvoorwaardenVerplicht={modus.randvoorwaarden_verplicht === true}
                        />
                      </li>
                    );
                  })}
                  {items.length === 0 ? (
                    <li className="rounded-kaart border border-dashed border-rand-sterk px-3 py-4 text-center text-xs text-inkt-licht">
                      Nog niets in deze horizon.
                    </li>
                  ) : null}
                </ul>
              </section>
            );
          })}

          {nogNietGeplaatst.length > 0 ? (
            <section>
              <h2 className="display text-lg text-inkt">Nog te plaatsen</h2>
              <ul className="mt-2 space-y-2">
                {nogNietGeplaatst.map((beeld) => (
                  <li key={beeld.usecase.id}>
                    <RoadmapKaart
                      state={state}
                      identiteit={identiteit}
                      doe={doe}
                      beeld={beeld}
                      horizonIds={modus.roadmap_horizonnen}
                      randvoorwaardenVerplicht={modus.randvoorwaarden_verplicht === true}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function RoadmapKaart({
  state,
  identiteit,
  doe,
  beeld,
  horizonIds,
  randvoorwaardenVerplicht,
}: {
  state: SessieState;
  identiteit: BewaardeIdentiteit;
  doe: (actie: () => Promise<unknown>) => Promise<void>;
  beeld: UsecaseBeeld;
  horizonIds: string[];
  randvoorwaardenVerplicht: boolean;
}) {
  const item = state.roadmap.find((r) => r.usecase_id === beeld.usecase.id);
  const anderen = alleBeelden(state).filter(
    (b) => b.usecase.id !== beeld.usecase.id && b.usecase.status === "portfolio",
  );

  async function bewaar(velden: {
    horizon?: string;
    randvoorwaarden?: string;
    afhankelijkVan?: string[];
  }) {
    await doe(() =>
      opslag.bewaarRoadmapItem(identiteit, {
        sessieId: state.sessie.id,
        usecaseId: beeld.usecase.id,
        horizon: velden.horizon ?? item?.horizon ?? horizonIds[0],
        randvoorwaarden: velden.randvoorwaarden ?? item?.randvoorwaarden ?? "",
        afhankelijkVan: velden.afhankelijkVan ?? item?.afhankelijk_van ?? [],
      }),
    );
  }

  const mistRandvoorwaarden =
    randvoorwaardenVerplicht && item && !item.randvoorwaarden.trim();

  return (
    <Kaart aandacht={Boolean(item)} className="p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-medium leading-snug text-inkt">
          {beeld.usecase.titel}
        </h3>
        {beeld.businessCase?.netto_baat ? (
          <span
            className={`shrink-0 text-xs font-medium tabular-nums ${
              (beeld.businessCase.netto_baat?.verwacht ?? 0) >= 0 ? "text-waarde" : "text-risico"
            }`}
          >
            {formatteerBandbreedte(beeld.businessCase.netto_baat)}
          </span>
        ) : null}
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {speelmodi.horizonnen
          .filter((h) => horizonIds.includes(h.id))
          .map((h) => (
            <Knop
              key={h.id}
              soort={item?.horizon === h.id ? "primair" : "rand"}
              onClick={() => void bewaar({ horizon: h.id })}
              className="!px-3 !py-2 !text-xs"
            >
              {h.naam}
            </Knop>
          ))}
        {item ? (
          <Knop
            soort="stil"
            onClick={() => void doe(() => opslag.verwijderRoadmapItem(identiteit, beeld.usecase.id))}
            className="!px-3 !py-2 !text-xs"
          >
            Weghalen
          </Knop>
        ) : null}
      </div>

      {item ? (
        <div className="mt-3 space-y-2.5">
          <label className="block">
            <span className="block text-[11px] text-inkt-zacht">
              Wat moet er eerst geregeld zijn?
            </span>
            <textarea
              className={`${invoerStijl} mt-1 min-h-14 !text-sm`}
              defaultValue={item.randvoorwaarden}
              onBlur={(e) => void bewaar({ randvoorwaarden: e.target.value })}
              placeholder="Bijvoorbeeld: koppelvlak op VERA, of een besluit over het gebruik van huurdersdata."
            />
          </label>

          {anderen.length > 0 ? (
            <div>
              <p className="text-[11px] text-inkt-zacht">Hangt af van</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {anderen.map((ander) => {
                  const actief = item.afhankelijk_van.includes(ander.usecase.id);
                  return (
                    <button
                      key={ander.usecase.id}
                      type="button"
                      onClick={() =>
                        void bewaar({
                          afhankelijkVan: actief
                            ? item.afhankelijk_van.filter((id) => id !== ander.usecase.id)
                            : [...item.afhankelijk_van, ander.usecase.id],
                        })
                      }
                      className={`rounded border px-2 py-1 text-[11px] transition-colors ${
                        actief
                          ? "border-accent bg-accent-zacht text-accent-diep"
                          : "border-rand text-inkt-licht"
                      }`}
                    >
                      {ander.usecase.titel}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {mistRandvoorwaarden ? (
            <Etiket toon="aandacht">Randvoorwaarden zijn verplicht in deze speelduur</Etiket>
          ) : null}
        </div>
      ) : null}
    </Kaart>
  );
}
