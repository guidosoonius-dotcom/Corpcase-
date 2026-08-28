"use client";

import { useParams } from "next/navigation";
import {
  alleSignalen,
  domein as coraDomein,
  organisatie,
  realiteitschecks,
  rol,
  rolopdrachten,
  speelmodi,
  speelmodus,
} from "@/lib/content";
import { useSessie } from "@/lib/sessie/gebruik";
import {
  aannames,
  alleBeelden,
  beoordeelRolopdracht,
  budgetStand,
  dekking,
  onvolledigeBusinessCases,
  portfolio,
} from "@/lib/sessie/afgeleid";
import { formatteerBandbreedte, formatteerEuro } from "@/lib/waarde/berekening";
import { Knop, Melding } from "@/components/basis";

/**
 * Het eindrapport: wat het team meeneemt naar de volgende vergadering.
 *
 * Bewust een gewone webpagina die goed print in plaats van een gegenereerd bestand. Belangrijker
 * dan de vormgeving is de eerlijkheid: elke aanname, elke onvolledige doorrekening en elke bron
 * staat erin. Een rapport dat alleen de mooie helft toont, is bij de eerste kritische vraag waardeloos.
 */
export default function RapportPagina() {
  const parameters = useParams<{ id: string }>();
  const { state, laden } = useSessie(parameters.id);

  if (laden) return <main className="p-8 text-sm text-[--color-inkt-licht]">Laden…</main>;

  if (!state) {
    return (
      <main className="mx-auto w-full max-w-md px-5 py-12">
        <Melding toon="risico">Deze browser heeft geen toegang tot deze sessie.</Melding>
      </main>
    );
  }

  const org = organisatie(state.sessie.organisatie_id);
  const modus = speelmodus(state.sessie.speelmodus);
  const inPortfolio = portfolio(state);
  const alles = alleBeelden(state);
  const afgevallen = alles.filter((b) => b.usecase.status === "afgevallen");
  const gedekt = dekking(state);
  const stand = budgetStand(state);
  const signalen = alleSignalen(state.sessie.organisatie_id);
  const kanttekeningen = aannames(state);
  const onvolledig = onvolledigeBusinessCases(state);

  const totaleBaat = inPortfolio.reduce(
    (som, b) => som + (b.businessCase?.netto_baat?.verwacht ?? 0),
    0,
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="niet-printen mb-8 flex items-center justify-between gap-4">
        <p className="text-xs text-[--color-inkt-licht]">
          Print deze pagina of bewaar hem als pdf.
        </p>
        <Knop soort="rand" onClick={() => window.print()}>
          Printen
        </Knop>
      </div>

      <header className="print-blok border-b border-[--color-rand] pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[--color-inkt-licht]">
          Use-caseportfolio · {org.naam}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[--color-inkt]">{state.sessie.titel}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[--color-inkt-zacht]">
          {new Date(state.sessie.aangemaakt_op).toLocaleDateString("nl-NL", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}{" "}
          · {modus.naam.toLowerCase()} · {state.deelnemers.length} deelnemers
        </p>
        <p className="mt-1 text-sm text-[--color-inkt-zacht]">
          {state.deelnemers
            .map((d) => `${d.naam} (${rol(d.rol_id)?.naam ?? d.rol_id})`)
            .join(", ")}
        </p>
      </header>

      <section className="print-blok mt-8">
        <h2 className="text-base font-semibold text-[--color-inkt]">In het kort</h2>
        <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "In het portfolio", waarde: String(inPortfolio.length) },
            { label: "Laten vallen", waarde: String(afgevallen.length) },
            {
              label: "Verwachte netto waarde",
              waarde: totaleBaat > 0 ? `${formatteerEuro(totaleBaat)}/jr` : "n.v.t.",
            },
            {
              label: "Domeinen geraakt",
              waarde: `${gedekt.domeinenGedekt.length}/${gedekt.domeinenGedekt.length + gedekt.domeinenOngedekt.length}`,
            },
          ].map((item) => (
            <div key={item.label}>
              <dt className="text-xs leading-snug text-[--color-inkt-licht]">{item.label}</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums text-[--color-inkt]">
                {item.waarde}
              </dd>
            </div>
          ))}
        </dl>

        {totaleBaat > 0 ? (
          <p className="mt-3 text-xs leading-relaxed text-[--color-inkt-licht]">
            De verwachte netto waarde is de optelling van de doorgerekende use cases, elk met een
            onzekerheid van {state.sessie.onzekerheid_pct}% rond de verwachte waarde. Het is geen
            begroting en geen toezegging: het is wat dit team op deze dag plausibel achtte, met de
            aannames die verderop staan.
          </p>
        ) : null}
      </section>

      <section className="mt-10">
        <h2 className="text-base font-semibold text-[--color-inkt]">De roadmap</h2>
        {speelmodi.horizonnen
          .filter((h) => modus.roadmap_horizonnen.includes(h.id))
          .map((horizon) => {
            const items = state.roadmap.filter((r) => r.horizon === horizon.id);
            return (
              <div key={horizon.id} className="print-blok mt-5">
                <h3 className="text-sm font-semibold text-[--color-inkt]">
                  {horizon.naam}{" "}
                  <span className="font-normal text-[--color-inkt-licht]">· {horizon.periode}</span>
                </h3>
                {items.length === 0 ? (
                  <p className="mt-1 text-sm text-[--color-inkt-licht]">Niets gepland.</p>
                ) : (
                  <ul className="mt-2 space-y-3">
                    {items.map((item) => {
                      const beeld = alles.find((b) => b.usecase.id === item.usecase_id);
                      if (!beeld) return null;
                      const afhankelijkheden = item.afhankelijk_van
                        .map((id) => alles.find((b) => b.usecase.id === id)?.usecase.titel)
                        .filter(Boolean);

                      return (
                        <li
                          key={item.usecase_id}
                          className="border-l-2 border-[--color-accent] pl-3"
                        >
                          <p className="text-sm font-medium text-[--color-inkt]">
                            {beeld.usecase.titel}
                          </p>
                          {beeld.businessCase?.netto_baat ? (
                            <p className="mt-0.5 text-xs tabular-nums text-[--color-waarde]">
                              {formatteerBandbreedte(beeld.businessCase.netto_baat)} per jaar
                            </p>
                          ) : null}
                          {item.randvoorwaarden ? (
                            <p className="mt-1 text-xs leading-relaxed text-[--color-inkt-zacht]">
                              Eerst nodig: {item.randvoorwaarden}
                            </p>
                          ) : null}
                          {afhankelijkheden.length > 0 ? (
                            <p className="mt-0.5 text-xs leading-relaxed text-[--color-inkt-licht]">
                              Hangt af van: {afhankelijkheden.join(", ")}
                            </p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
      </section>

      <section className="mt-10">
        <h2 className="text-base font-semibold text-[--color-inkt]">Het portfolio</h2>
        <ul className="mt-3 space-y-6">
          {inPortfolio.map((beeld) => {
            const allocatie = state.allocaties.find((a) => a.usecase_id === beeld.usecase.id);
            const onderbouwing = signalen.filter((s) => beeld.signaalIds.includes(s.id));

            return (
              <li key={beeld.usecase.id} className="print-blok">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-sm font-semibold text-[--color-inkt]">
                    {beeld.usecase.titel}
                  </h3>
                  <span className="shrink-0 text-xs text-[--color-inkt-licht]">
                    {coraDomein(beeld.usecase.domein)?.naam ?? beeld.usecase.domein}
                  </span>
                </div>

                {beeld.usecase.probleem ? (
                  <p className="mt-1.5 text-sm leading-relaxed text-[--color-inkt-zacht]">
                    {beeld.usecase.probleem}
                  </p>
                ) : null}
                {beeld.usecase.oplossingsrichting ? (
                  <p className="mt-1.5 text-sm leading-relaxed text-[--color-inkt-zacht]">
                    {beeld.usecase.oplossingsrichting}
                  </p>
                ) : null}

                {beeld.businessCase ? (
                  <div className="mt-2.5 rounded-[--radius-kaart] border border-[--color-rand] p-3">
                    <p className="text-xs font-semibold text-[--color-inkt]">Doorrekening</p>
                    <ul className="mt-1 space-y-0.5">
                      {beeld.businessCase.drivers.map((driver, index) => (
                        <li
                          key={`${driver.type}-${index}`}
                          className="text-xs tabular-nums text-[--color-inkt-zacht]"
                        >
                          {driver.status === "berekend"
                            ? `${driver.type}: ${formatteerEuro(driver.jaarlijkse_baat)} per jaar`
                            : `${driver.type}: onbekend (${driver.ontbrekende_velden.join(", ")} ontbreekt)`}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1.5 text-xs tabular-nums text-[--color-inkt-zacht]">
                      Jaarlijkse kosten {formatteerEuro(beeld.businessCase.kosten.jaarlijks)},
                      eenmalig {formatteerEuro(beeld.businessCase.kosten.eenmalig)}
                    </p>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-[--color-waarde]">
                      Netto {formatteerBandbreedte(beeld.businessCase.netto_baat)} per jaar
                      {beeld.businessCase.terugverdientijd_maanden
                        ? `, terugverdiend in ${Math.round(beeld.businessCase.terugverdientijd_maanden)} maanden`
                        : ""}
                    </p>
                    {!beeld.businessCase.volledig ? (
                      <p className="mt-1 text-xs text-[--color-aandacht]">
                        Deze doorrekening is niet compleet; het bedrag is dus een ondergrens.
                      </p>
                    ) : null}
                  </div>
                ) : beeld.positie ? (
                  <p className="mt-2 text-xs text-[--color-inkt-zacht]">
                    Gescoord, niet doorgerekend: waarde {beeld.positie.waarde.toFixed(1)} en
                    haalbaarheid {beeld.positie.haalbaarheid.toFixed(1)} op een schaal van 5.
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-[--color-aandacht]">
                    Niet gewaardeerd. Er is dus geen onderbouwing voor de plek in dit portfolio.
                  </p>
                )}

                {allocatie && (allocatie.geld_eur > 0 || allocatie.capaciteit_mensmaanden > 0) ? (
                  <p className="mt-2 text-xs tabular-nums text-[--color-inkt-zacht]">
                    Toegekend: {formatteerEuro(allocatie.geld_eur)} en{" "}
                    {allocatie.capaciteit_mensmaanden} mensmaanden.
                  </p>
                ) : null}

                {beeld.usecase.benodigde_data.length > 0 ? (
                  <p className="mt-2 text-xs leading-relaxed text-[--color-inkt-licht]">
                    Benodigde gegevens: {beeld.usecase.benodigde_data.join(", ")}.
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-[--color-aandacht]">
                    Geen databron benoemd.
                  </p>
                )}

                {beeld.usecase.aandachtspunten.length > 0 ? (
                  <ul className="mt-1.5 space-y-0.5">
                    {beeld.usecase.aandachtspunten.map((punt) => (
                      <li key={punt} className="text-xs leading-relaxed text-[--color-inkt-licht]">
                        Let op: {punt}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {onderbouwing.length > 0 ? (
                  <p className="mt-1.5 text-xs leading-relaxed text-[--color-inkt-licht]">
                    Komt voort uit: {onderbouwing.map((s) => s.titel).join("; ")}.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
        {inPortfolio.length === 0 ? (
          <p className="mt-2 text-sm text-[--color-inkt-licht]">Het portfolio is leeg.</p>
        ) : null}
      </section>

      {afgevallen.length > 0 ? (
        <section className="print-blok mt-10">
          <h2 className="text-base font-semibold text-[--color-inkt]">Bewust niet gedaan</h2>
          <p className="mt-1 text-sm leading-relaxed text-[--color-inkt-zacht]">
            Zodat het gesprek hierover volgend jaar niet opnieuw van voren af aan begint.
          </p>
          <ul className="mt-2 space-y-1">
            {afgevallen.map((beeld) => (
              <li key={beeld.usecase.id} className="text-sm text-[--color-inkt-zacht]">
                — {beeld.usecase.titel}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {state.besluiten.length > 0 ? (
        <section className="print-blok mt-10">
          <h2 className="text-base font-semibold text-[--color-inkt]">Realiteitschecks</h2>
          <ul className="mt-3 space-y-3">
            {state.besluiten.map((besluit) => {
              const check = realiteitschecks.checks.find((c) => c.id === besluit.check_id);
              return (
                <li key={besluit.id}>
                  <p className="text-sm font-medium text-[--color-inkt]">
                    {check?.titel ?? besluit.check_id}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[--color-inkt-licht]">
                    {check?.scenario}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-[--color-inkt-zacht]">
                    Besluit:{" "}
                    {besluit.besluit === "aanpassen"
                      ? "het portfolio is aangepast"
                      : "het portfolio blijft staan"}
                    {besluit.motivatie ? `. ${besluit.motivatie}` : "."}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="print-blok mt-10">
        <h2 className="text-base font-semibold text-[--color-inkt]">Aannames en onzekerheden</h2>
        <p className="mt-1 text-sm leading-relaxed text-[--color-inkt-zacht]">
          Wat hier staat is het eerste dat je moet toetsen voordat je aan de uitvoering begint.
        </p>

        <ul className="mt-3 space-y-2">
          <li className="text-sm leading-relaxed text-[--color-inkt-zacht]">
            De kengetallen van {org.naam} in deze sessie komen uit publieke bronnen en zijn niet
            geverifieerd tegen het originele jaarverslag. De rekenkundige uitgangspunten
            (uurtarief, dagopbrengst, volumes) zijn aannames.
          </li>

          {onvolledig.length > 0 ? (
            <li className="text-sm leading-relaxed text-[--color-inkt-zacht]">
              {onvolledig.length} doorrekening{onvolledig.length === 1 ? "" : "en"} zijn niet
              compleet:{" "}
              {onvolledig.map((b) => b.usecase.titel).join(", ")}. De genoemde bedragen zijn daar
              een ondergrens.
            </li>
          ) : null}

          {stand.overschreden.geld || stand.overschreden.capaciteit ? (
            <li className="text-sm leading-relaxed text-[--color-inkt-zacht]">
              Het toegekende budget overschrijdt de investeringsruimte die aan het begin van de
              sessie is vastgesteld ({formatteerEuro(stand.besteed.geld_eur)} tegenover{" "}
              {formatteerEuro(state.sessie.budget_geld)};{" "}
              {stand.besteed.verandercapaciteit_mensmaanden} tegenover{" "}
              {state.sessie.budget_capaciteit} mensmaanden).
            </li>
          ) : null}

          {kanttekeningen.map(({ bijdrage, usecase, auteur }) => (
            <li key={bijdrage.id} className="text-sm leading-relaxed text-[--color-inkt-zacht]">
              {usecase ? `${usecase.titel}: ` : ""}
              {bijdrage.tekst}
              {auteur ? ` (${auteur.naam})` : ""}
            </li>
          ))}

          {gedekt.personasGemist.length > 0 ? (
            <li className="text-sm leading-relaxed text-[--color-inkt-zacht]">
              {gedekt.personasGemist.length} van de huurderstypen komen in geen enkele use case
              terug. Dat kan een bewuste keuze zijn, maar het is er geen die is uitgesproken.
            </li>
          ) : null}
        </ul>
      </section>

      <section className="print-blok mt-10">
        <h2 className="text-base font-semibold text-[--color-inkt]">De rolopdrachten</h2>
        <ul className="mt-3 space-y-2">
          {state.deelnemers.map((deelnemer) => {
            const opdracht = rolopdrachten.opdrachten.find((o) => o.id === deelnemer.rolopdracht_id);
            if (!opdracht) return null;
            const oordeel = beoordeelRolopdracht(state, opdracht.controle);
            return (
              <li key={deelnemer.id} className="text-sm leading-relaxed text-[--color-inkt-zacht]">
                <span className="font-medium text-[--color-inkt]">{deelnemer.naam}</span>:{" "}
                {opdracht.opdracht} — {oordeel.gehaald ? "gelukt" : "niet gelukt"}.{" "}
                {oordeel.toelichting}
              </li>
            );
          })}
        </ul>
      </section>

      <footer className="mt-10 border-t border-[--color-rand] pt-5">
        <p className="text-xs leading-relaxed text-[--color-inkt-licht]">
          Samengesteld tijdens een werksessie met Corpcase. De use-casebibliotheek en de
          domeinindeling zijn gebaseerd op de CORA-referentiearchitectuur en de VERA-standaard van
          de corporatiesector. De verantwoording van elk cijfer staat in de bronnenlijst van de
          applicatie.
        </p>
      </footer>
    </main>
  );
}
