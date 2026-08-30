"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { allePersonaSignalen } from "@/lib/content";
import { contrast, leidPaletAf, PAPIER } from "@/lib/thema/kleur";
import {
  bouwIndexSnippet,
  bouwJaarverslagJson,
  bouwOrganisatieJson,
  bouwPersonasJson,
  slugify,
  valideerFormulier,
  type JaarverslagKaartFormulier,
  type KengetalFormulier,
  type OrganisatieFormulier,
  type PersonaKaartFormulier,
  type ThemaFormulier,
} from "@/lib/onboarding/genereren";
import { Kaart, Knop, Melding, Veld, invoerStijl } from "@/components/basis";
import { Thema } from "@/components/thema";
import { DownloadIcoon } from "@/components/icoon";

/**
 * Onboardingwizard voor een nieuwe corporatie.
 *
 * Content leeft in `content/` en wordt met de app meegebouwd — met opzet zonder database, zie de
 * toelichting bovenaan supabase/schema.sql. Deze pagina schrijft dus niets weg: hij vult een
 * formulier gevalideerd tegen dezelfde zod-schema's als `npm run content:check`, en levert aan
 * het eind drie downloadbare bestanden plus de twee regels om in src/lib/content/index.ts te
 * plakken. Dat is het verschil tussen "een developer schrijft JSON met de hand" en "vul een
 * formulier in, commit drie bestanden en twee regels" — niet "geen code aanraken": dat zou de
 * garantie breken dat er geen drift kan ontstaan tussen wat de app kent en wat er in content/
 * staat.
 *
 * Bewust geen sessie-achtige, speler-gerichte vormgeving: dit is gereedschap voor wie de
 * contentbibliotheek beheert, niet voor een bestuur aan tafel.
 */

const legeKengetal = (): KengetalFormulier => ({
  id: "",
  label: "",
  waarde: 0,
  eenheid: "",
  notatie: "",
  bron: "",
  geverifieerd: false,
});

const legeThema = (): ThemaFormulier => ({ id: "", naam: "", omschrijving: "" });

const legeJaarverslagKaart = (): JaarverslagKaartFormulier => ({
  id: "",
  titel: "",
  thema: "",
  signaal: "",
  bron: "",
  geverifieerd: false,
});

const legePersonaKaart = (): PersonaKaartFormulier => ({
  id: "",
  titel: "",
  thema: "",
  profiel: "",
  reis: "",
  frustraties: [],
  signaal: "",
});

const legFormulier = (): OrganisatieFormulier => ({
  id: "",
  naam: "",
  type: "Woningcorporatie",
  pitch: "",
  accent: "#E8524A",
  themaToelichting: "",
  themaBron: "",
  themaGeverifieerd: false,
  jaarverslagJaar: new Date().getFullYear() - 1,
  jaarverslagTitel: "",
  jaarverslagBron: "",
  jaarverslagGeverifieerd: false,
  steden: [],
  kengetallen: [],
  strategischeThemas: [],
  onderscheidendeKenmerken: [],
  rekenkundigeUitgangspunten: [],
  budgetGeldEur: 0,
  budgetCapaciteit: 0,
  budgetToelichting: "",
  budgetBron: "",
  budgetGeverifieerd: false,
});

function regelsNaarLijst(tekst: string): string[] {
  return tekst
    .split("\n")
    .map((r) => r.trim())
    .filter(Boolean);
}

function downloadJson(bestandsnaam: string, waarde: unknown): void {
  const blob = new Blob([JSON.stringify(waarde, null, 2) + "\n"], {
    type: "application/json;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = bestandsnaam;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function OrganisatieToevoegenPagina() {
  const [form, setForm] = useState<OrganisatieFormulier>(legFormulier());
  const [idHandmatig, setIdHandmatig] = useState(false);
  const [stedenTekst, setStedenTekst] = useState("");
  const [kenmerkenTekst, setKenmerkenTekst] = useState("");
  const [jaarverslagKaarten, setJaarverslagKaarten] = useState<JaarverslagKaartFormulier[]>([]);
  const [personaKaarten, setPersonaKaarten] = useState<PersonaKaartFormulier[]>([]);
  const [gecontroleerd, setGecontroleerd] = useState(false);

  const palet = useMemo(() => {
    try {
      return leidPaletAf(form.accent);
    } catch {
      return null;
    }
  }, [form.accent]);
  const accentContrastGroot = palet ? contrast(form.accent, PAPIER) : 0;

  function werkForm(veld: Partial<OrganisatieFormulier>) {
    setForm((f) => ({ ...f, ...veld }));
    setGecontroleerd(false);
  }

  function naamGewijzigd(naam: string) {
    werkForm({ naam, ...(idHandmatig ? {} : { id: slugify(naam) }) });
  }

  const organisatieJson = bouwOrganisatieJson({
    ...form,
    steden: regelsNaarLijst(stedenTekst),
    onderscheidendeKenmerken: regelsNaarLijst(kenmerkenTekst),
  });
  const jaarverslagJson = bouwJaarverslagJson(form.id, jaarverslagKaarten);
  const personasJson = bouwPersonasJson(form.id, personaKaarten);
  const resultaat = valideerFormulier(organisatieJson, jaarverslagJson, personasJson);

  const bestaandePersonaConcepten = [...new Set(allePersonaSignalen.map((k) => k.id))].sort();

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10">
      <Link href="/" className="text-sm text-inkt-licht hover:text-accent-diep">
        ← Terug
      </Link>
      <h1 className="display mt-4 text-3xl text-inkt">Nieuwe corporatie toevoegen</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-inkt-zacht">
        Vult drie contentbestanden — het profiel, de jaarverslagsignalen en de huurderssignalen —
        gevalideerd tegen dezelfde regels als <code>npm run content:check</code>. Onderaan staat
        wat je daarna nog moet doen: de bestanden in <code>content/</code> zetten en twee regels
        in <code>src/lib/content/index.ts</code> plakken, dan committen en deployen. De
        use-casebibliotheek zelf is generiek en hoeft niet opnieuw — die geldt voor elke
        corporatie.
      </p>

      {/* ------------------------------------------------------------------ Profiel */}
      <section className="mt-8">
        <h2 className="display text-xl text-inkt">Profiel</h2>
        <div className="mt-4 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Veld label="Naam">
              <input
                className={invoerStijl}
                value={form.naam}
                onChange={(e) => naamGewijzigd(e.target.value)}
                placeholder="Woonstichting Voorbeeld"
              />
            </Veld>
            <Veld label="Content-id" hint="Bepaalt de bestandsnamen; a-z, 0-9 en koppeltekens.">
              <input
                className={`${invoerStijl} font-mono`}
                value={form.id}
                onChange={(e) => {
                  setIdHandmatig(true);
                  werkForm({ id: slugify(e.target.value) });
                }}
                placeholder="woonstichting-voorbeeld"
              />
            </Veld>
          </div>

          <Veld label="Type" hint="Zoals het in de pitch en het rapport verschijnt.">
            <input
              className={invoerStijl}
              value={form.type}
              onChange={(e) => werkForm({ type: e.target.value })}
              placeholder="Woningcorporatie"
            />
          </Veld>

          <Veld label="Pitch" hint="Twee, drie zinnen: wie ze zijn en wat hen onderscheidt.">
            <textarea
              className={`${invoerStijl} min-h-[5rem]`}
              value={form.pitch}
              onChange={(e) => werkForm({ pitch: e.target.value })}
            />
          </Veld>

          <Veld label="Steden" hint="Eén per regel.">
            <textarea
              className={`${invoerStijl} min-h-[4rem]`}
              value={stedenTekst}
              onChange={(e) => setStedenTekst(e.target.value)}
              placeholder={"Amsterdam\nRotterdam"}
            />
          </Veld>

          <Veld label="Onderscheidende kenmerken" hint="Eén per regel; dit voedt de facilitatorbriefing.">
            <textarea
              className={`${invoerStijl} min-h-[5rem]`}
              value={kenmerkenTekst}
              onChange={(e) => setKenmerkenTekst(e.target.value)}
              placeholder={"Hoge mutatiegraad.\nGroot aandeel kortverblijvers."}
            />
          </Veld>

          <div>
            <h3 className="text-sm font-semibold text-inkt">Strategische thema&apos;s</h3>
            <div className="mt-2 space-y-3">
              {form.strategischeThemas.map((thema, index) => (
                <Kaart key={index} className="p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      className={invoerStijl}
                      value={thema.naam}
                      onChange={(e) => {
                        const naam = e.target.value;
                        werkForm({
                          strategischeThemas: form.strategischeThemas.map((t, i) =>
                            i === index ? { ...t, naam, id: t.id || slugify(naam) } : t,
                          ),
                        });
                      }}
                      placeholder="Beschikbaarheid"
                    />
                    <input
                      className={`${invoerStijl} font-mono`}
                      value={thema.id}
                      onChange={(e) =>
                        werkForm({
                          strategischeThemas: form.strategischeThemas.map((t, i) =>
                            i === index ? { ...t, id: slugify(e.target.value) } : t,
                          ),
                        })
                      }
                      placeholder="beschikbaarheid"
                    />
                  </div>
                  <textarea
                    className={`${invoerStijl} mt-2 min-h-[3.5rem]`}
                    value={thema.omschrijving}
                    onChange={(e) =>
                      werkForm({
                        strategischeThemas: form.strategischeThemas.map((t, i) =>
                          i === index ? { ...t, omschrijving: e.target.value } : t,
                        ),
                      })
                    }
                    placeholder="Omschrijving"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      werkForm({
                        strategischeThemas: form.strategischeThemas.filter((_, i) => i !== index),
                      })
                    }
                    className="mt-2 text-xs font-medium text-risico hover:underline"
                  >
                    Verwijderen
                  </button>
                </Kaart>
              ))}
              <Knop
                soort="rand"
                onClick={() =>
                  werkForm({ strategischeThemas: [...form.strategischeThemas, legeThema()] })
                }
              >
                Thema toevoegen
              </Knop>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ Huisstijl */}
      <section className="mt-10">
        <h2 className="display text-xl text-inkt">Huisstijl</h2>
        <p className="mt-1 text-sm leading-relaxed text-inkt-zacht">
          Eén kleur; de varianten voor knoppen, kleine tekst en het donkere paneel worden eruit
          afgeleid met een gemeten contrasttoets — zie{" "}
          <code>docs/ONTWERP.md</code>.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
          <Veld label="Accentkleur">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(form.accent) ? form.accent : "#e8524a"}
                onChange={(e) => werkForm({ accent: e.target.value })}
                className="h-11 w-14 cursor-pointer rounded-kaart border border-rand-sterk bg-vlak p-1"
              />
              <input
                className={`${invoerStijl} w-36 font-mono`}
                value={form.accent}
                onChange={(e) => werkForm({ accent: e.target.value })}
                placeholder="#E8524A"
              />
            </div>
            {palet ? (
              <p className="mt-1.5 text-xs text-inkt-licht">
                Contrast van deze kleur op papier: {accentContrastGroot.toFixed(2)}
                {accentContrastGroot < 3 ? " — te laag, ook voor grote vormen." : " — voldoende voor grote vormen (cijfers, cirkels)."}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-risico">Geen geldige kleurcode.</p>
            )}
          </Veld>

          {palet ? (
            <Thema accent={form.accent} className="rounded-kaart border border-rand p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-inkt-licht">
                Voorbeeld
              </p>
              <p className="cijfer mt-1 text-4xl text-accent">23</p>
              <div className="mt-3 flex gap-2">
                <Knop soort="primair">Primaire knop</Knop>
                <Knop soort="rand">Rand</Knop>
              </div>
              <div className="mt-3 rounded-kaart bg-houtskool p-3 text-white">
                <p className="text-xs text-houtskool-zacht">Op het donkere paneel</p>
                <p className="cijfer text-2xl text-accent-op-donker">€ 91.500</p>
              </div>
            </Thema>
          ) : null}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Veld label="Bron van de kleur">
            <input
              className={invoerStijl}
              value={form.themaBron}
              onChange={(e) => werkForm({ themaBron: e.target.value })}
              placeholder="huisstijlgids 2024"
            />
          </Veld>
          <label className="flex items-center gap-2 self-end pb-2.5">
            <input
              type="checkbox"
              checked={form.themaGeverifieerd}
              onChange={(e) => werkForm({ themaGeverifieerd: e.target.checked })}
              className="h-5 w-5"
            />
            <span className="text-sm text-inkt">Geverifieerd tegen de officiële huisstijl</span>
          </label>
        </div>
      </section>

      {/* ------------------------------------------------------------------ Jaarverslag (meta) */}
      <section className="mt-10">
        <h2 className="display text-xl text-inkt">Jaarverslag</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <Veld label="Jaar">
            <input
              type="number"
              className={invoerStijl}
              value={form.jaarverslagJaar}
              onChange={(e) => werkForm({ jaarverslagJaar: Number(e.target.value) })}
            />
          </Veld>
          <Veld label="Titel">
            <input
              className={invoerStijl}
              value={form.jaarverslagTitel}
              onChange={(e) => werkForm({ jaarverslagTitel: e.target.value })}
            />
          </Veld>
          <Veld label="Bron (link of documentnaam)">
            <input
              className={invoerStijl}
              value={form.jaarverslagBron}
              onChange={(e) => werkForm({ jaarverslagBron: e.target.value })}
            />
          </Veld>
        </div>
        <label className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.jaarverslagGeverifieerd}
            onChange={(e) => werkForm({ jaarverslagGeverifieerd: e.target.checked })}
            className="h-5 w-5"
          />
          <span className="text-sm text-inkt">Cijfers hieronder zijn tegen dit jaarverslag geverifieerd</span>
        </label>
      </section>

      {/* ------------------------------------------------------------------ Kengetallen */}
      <KengetalSectie
        titel="Kengetallen"
        toelichting="De cijfers die spelers op de lobby en in de facilitatorbriefing zien."
        rijen={form.kengetallen}
        onWijzig={(kengetallen) => werkForm({ kengetallen })}
      />

      {/* ------------------------------------------------------------------ Rekenkundige uitgangspunten */}
      <KengetalSectie
        titel="Rekenkundige uitgangspunten"
        toelichting="Voeden de business cases (uurtarief, dagopbrengst, volumes) — per sessie door de facilitator aan te passen."
        rijen={form.rekenkundigeUitgangspunten}
        onWijzig={(rekenkundigeUitgangspunten) => werkForm({ rekenkundigeUitgangspunten })}
      />

      {/* ------------------------------------------------------------------ Budget */}
      <section className="mt-10">
        <h2 className="display text-xl text-inkt">Investeringsruimte</h2>
        <p className="mt-1 text-sm leading-relaxed text-inkt-zacht">
          Indicatief; instelbaar per sessie. Bepaalt wat er in de prioriteringsfase &quot;past&quot;.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Veld label="Budget (EUR/jaar)">
            <input
              type="number"
              className={invoerStijl}
              value={form.budgetGeldEur}
              onChange={(e) => werkForm({ budgetGeldEur: Number(e.target.value) })}
            />
          </Veld>
          <Veld label="Verandercapaciteit (mensmaanden/jaar)">
            <input
              type="number"
              className={invoerStijl}
              value={form.budgetCapaciteit}
              onChange={(e) => werkForm({ budgetCapaciteit: Number(e.target.value) })}
            />
          </Veld>
        </div>
        <Veld label="Toelichting" hint="Zichtbaar bij het prioriteringspaneel.">
          <textarea
            className={`${invoerStijl} mt-1.5 min-h-[3.5rem]`}
            value={form.budgetToelichting}
            onChange={(e) => werkForm({ budgetToelichting: e.target.value })}
          />
        </Veld>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Veld label="Bron">
            <input
              className={invoerStijl}
              value={form.budgetBron}
              onChange={(e) => werkForm({ budgetBron: e.target.value })}
              placeholder="aanname"
            />
          </Veld>
          <label className="flex items-center gap-2 self-end pb-2.5">
            <input
              type="checkbox"
              checked={form.budgetGeverifieerd}
              onChange={(e) => werkForm({ budgetGeverifieerd: e.target.checked })}
              className="h-5 w-5"
            />
            <span className="text-sm text-inkt">Geverifieerd, geen aanname</span>
          </label>
        </div>
      </section>

      {/* ------------------------------------------------------------------ Jaarverslagsignalen */}
      <section className="mt-10">
        <h2 className="display text-xl text-inkt">Jaarverslagsignalen</h2>
        <p className="mt-1 text-sm leading-relaxed text-inkt-zacht">
          Concrete bevindingen uit het jaarverslag — de kaarten die spelers bij &quot;Verkennen&quot; onder
          de lens Jaarverslag zien. Minimaal één.
        </p>
        <div className="mt-3 space-y-3">
          {jaarverslagKaarten.map((kaart, index) => (
            <Kaart key={index} className="p-3.5">
              <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
                <input
                  className={invoerStijl}
                  value={kaart.titel}
                  onChange={(e) => {
                    const titel = e.target.value;
                    setJaarverslagKaarten((lijst) =>
                      lijst.map((k, i) =>
                        i === index
                          ? { ...k, titel, id: k.id || `${form.id || "org"}-jv-${slugify(titel)}` }
                          : k,
                      ),
                    );
                  }}
                  placeholder="Titel van het signaal"
                />
                <input
                  className={`${invoerStijl} font-mono text-xs`}
                  value={kaart.id}
                  onChange={(e) =>
                    setJaarverslagKaarten((lijst) =>
                      lijst.map((k, i) => (i === index ? { ...k, id: slugify(e.target.value) } : k)),
                    )
                  }
                  placeholder="content-id"
                />
              </div>
              <textarea
                className={`${invoerStijl} mt-2 min-h-[4rem]`}
                value={kaart.signaal}
                onChange={(e) =>
                  setJaarverslagKaarten((lijst) =>
                    lijst.map((k, i) => (i === index ? { ...k, signaal: e.target.value } : k)),
                  )
                }
                placeholder="Wat staat er, en waarom is het relevant voor use-caseidentificatie?"
              />
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input
                  className={invoerStijl}
                  value={kaart.thema}
                  onChange={(e) =>
                    setJaarverslagKaarten((lijst) =>
                      lijst.map((k, i) => (i === index ? { ...k, thema: e.target.value } : k)),
                    )
                  }
                  placeholder="Thema (optioneel)"
                />
                <input
                  className={invoerStijl}
                  value={kaart.bron}
                  onChange={(e) =>
                    setJaarverslagKaarten((lijst) =>
                      lijst.map((k, i) => (i === index ? { ...k, bron: e.target.value } : k)),
                    )
                  }
                  placeholder="Bron (paginanummer, sectie)"
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={kaart.geverifieerd}
                    onChange={(e) =>
                      setJaarverslagKaarten((lijst) =>
                        lijst.map((k, i) =>
                          i === index ? { ...k, geverifieerd: e.target.checked } : k,
                        ),
                      )
                    }
                    className="h-5 w-5"
                  />
                  <span className="text-sm text-inkt">Geverifieerd</span>
                </label>
                <button
                  type="button"
                  onClick={() => setJaarverslagKaarten((lijst) => lijst.filter((_, i) => i !== index))}
                  className="text-xs font-medium text-risico hover:underline"
                >
                  Verwijderen
                </button>
              </div>
            </Kaart>
          ))}
          <Knop
            soort="rand"
            onClick={() => setJaarverslagKaarten((lijst) => [...lijst, legeJaarverslagKaart()])}
          >
            Signaal toevoegen
          </Knop>
        </div>
      </section>

      {/* ------------------------------------------------------------------ Huurderssignalen */}
      <section className="mt-10">
        <h2 className="display text-xl text-inkt">Huurderssignalen (persona&apos;s)</h2>
        <p className="mt-1 text-sm leading-relaxed text-inkt-zacht">
          Elk profiel is een bewoner die spelers bij &quot;Verkennen&quot; tegenkomen. Minimaal één.
          Hergebruik bij voorkeur een bestaand concept-id — dan blijft de generieke
          use-casebibliotheek eraan gekoppeld:
        </p>
        {bestaandePersonaConcepten.length > 0 ? (
          <p className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
            {bestaandePersonaConcepten.map((id) => (
              <code key={id} className="rounded bg-papier px-1.5 py-0.5 text-inkt-zacht">
                {id}
              </code>
            ))}
          </p>
        ) : null}
        <div className="mt-3 space-y-3">
          {personaKaarten.map((kaart, index) => (
            <Kaart key={index} className="p-3.5">
              <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
                <input
                  className={invoerStijl}
                  value={kaart.titel}
                  onChange={(e) => {
                    const titel = e.target.value;
                    setPersonaKaarten((lijst) =>
                      lijst.map((k, i) => (i === index ? { ...k, titel } : k)),
                    );
                  }}
                  placeholder="Sanne — eerstejaars uit Nederland"
                />
                <input
                  className={`${invoerStijl} font-mono text-xs`}
                  value={kaart.id}
                  onChange={(e) =>
                    setPersonaKaarten((lijst) =>
                      lijst.map((k, i) => (i === index ? { ...k, id: slugify(e.target.value) } : k)),
                    )
                  }
                  placeholder="p-eerstejaars"
                />
              </div>
              <Veld label="Profiel">
                <textarea
                  className={`${invoerStijl} min-h-[3.5rem]`}
                  value={kaart.profiel}
                  onChange={(e) =>
                    setPersonaKaarten((lijst) =>
                      lijst.map((k, i) => (i === index ? { ...k, profiel: e.target.value } : k)),
                    )
                  }
                />
              </Veld>
              <div className="mt-2">
                <Veld label="Reis" hint="Wat deze bewoner meemaakt, van intake tot vertrek.">
                  <textarea
                    className={`${invoerStijl} min-h-[3.5rem]`}
                    value={kaart.reis}
                    onChange={(e) =>
                      setPersonaKaarten((lijst) =>
                        lijst.map((k, i) => (i === index ? { ...k, reis: e.target.value } : k)),
                      )
                    }
                  />
                </Veld>
              </div>
              <div className="mt-2">
                <Veld label="Frustraties" hint="Eén per regel; minstens één.">
                  <textarea
                    className={`${invoerStijl} min-h-[3.5rem]`}
                    value={kaart.frustraties.join("\n")}
                    onChange={(e) =>
                      setPersonaKaarten((lijst) =>
                        lijst.map((k, i) =>
                          i === index ? { ...k, frustraties: regelsNaarLijst(e.target.value) } : k,
                        ),
                      )
                    }
                  />
                </Veld>
              </div>
              <div className="mt-2">
                <Veld label="Signaal" hint="Eén zin: wat dit voor het gesprek betekent.">
                  <textarea
                    className={`${invoerStijl} min-h-[3rem]`}
                    value={kaart.signaal}
                    onChange={(e) =>
                      setPersonaKaarten((lijst) =>
                        lijst.map((k, i) => (i === index ? { ...k, signaal: e.target.value } : k)),
                      )
                    }
                  />
                </Veld>
              </div>
              <button
                type="button"
                onClick={() => setPersonaKaarten((lijst) => lijst.filter((_, i) => i !== index))}
                className="mt-2 text-xs font-medium text-risico hover:underline"
              >
                Verwijderen
              </button>
            </Kaart>
          ))}
          <Knop soort="rand" onClick={() => setPersonaKaarten((lijst) => [...lijst, legePersonaKaart()])}>
            Persona toevoegen
          </Knop>
        </div>
      </section>

      {/* ------------------------------------------------------------------ Controleren en downloaden */}
      <section className="mt-10 border-t border-rand pt-8">
        <h2 className="display text-xl text-inkt">Controleren en downloaden</h2>
        <div className="mt-3">
          <Knop onClick={() => setGecontroleerd(true)}>Controleren</Knop>
        </div>

        {gecontroleerd && !resultaat.geldig ? (
          <div className="mt-4 space-y-2">
            <Melding toon="risico">
              {resultaat.fouten.length === 1 ? "1 veld " : `${resultaat.fouten.length} velden `}
              moet{resultaat.fouten.length === 1 ? "" : "en"} nog kloppen.
            </Melding>
            <ul className="space-y-1">
              {resultaat.fouten.map((fout, i) => (
                <li key={i} className="text-xs text-inkt-zacht">
                  <span className="font-mono text-inkt">{fout.bestand}.{fout.pad}</span> — {fout.melding}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {gecontroleerd && resultaat.geldig ? (
          <div className="mt-4 space-y-5">
            <Melding toon="accent">
              Alle drie bestanden zijn geldig. Download ze en zet ze op de genoemde plek in{" "}
              <code>content/</code>.
            </Melding>

            <div className="flex flex-wrap gap-2">
              <Knop
                soort="rand"
                onClick={() => downloadJson(`${form.id}.json`, organisatieJson)}
              >
                <DownloadIcoon className="h-4 w-4" />
                content/organisaties/{form.id}.json
              </Knop>
              <Knop
                soort="rand"
                onClick={() => downloadJson(`${form.id}-jaarverslag.json`, jaarverslagJson)}
              >
                <DownloadIcoon className="h-4 w-4" />
                content/signalen/{form.id}-jaarverslag.json
              </Knop>
              <Knop
                soort="rand"
                onClick={() => downloadJson(`${form.id}-personas.json`, personasJson)}
              >
                <DownloadIcoon className="h-4 w-4" />
                content/signalen/{form.id}-personas.json
              </Knop>
            </div>

            <div>
              <p className="text-sm font-medium text-inkt">
                Plak dit in <code>src/lib/content/index.ts</code>:
              </p>
              <pre className="mt-1.5 overflow-x-auto rounded-kaart border border-rand bg-houtskool p-3 text-xs leading-relaxed text-white">
                {bouwIndexSnippet(form.id)}
              </pre>
              <p className="mt-1.5 text-xs text-inkt-licht">
                Daarna: <code>npm run content:check</code> om te bevestigen dat alles nog
                samenhangt, committen en pushen. De use-casebibliotheek zelf hoeft niet aangepast —
                die is generiek voor elke corporatie.
              </p>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function KengetalSectie({
  titel,
  toelichting,
  rijen,
  onWijzig,
}: {
  titel: string;
  toelichting: string;
  rijen: KengetalFormulier[];
  onWijzig: (rijen: KengetalFormulier[]) => void;
}) {
  function wijzigRij(index: number, veld: Partial<KengetalFormulier>) {
    onWijzig(rijen.map((r, i) => (i === index ? { ...r, ...veld } : r)));
  }

  return (
    <section className="mt-10">
      <h2 className="display text-xl text-inkt">{titel}</h2>
      <p className="mt-1 text-sm leading-relaxed text-inkt-zacht">{toelichting}</p>
      <div className="mt-3 space-y-3">
        {rijen.map((rij, index) => (
          <Kaart key={index} className="p-3">
            <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr]">
              <input
                className={invoerStijl}
                value={rij.label}
                onChange={(e) => {
                  const label = e.target.value;
                  wijzigRij(index, { label, id: rij.id || slugify(label) });
                }}
                placeholder="Label, zoals getoond aan spelers"
              />
              <input
                className={`${invoerStijl} font-mono text-xs`}
                value={rij.id}
                onChange={(e) => wijzigRij(index, { id: slugify(e.target.value) })}
                placeholder="content-id"
              />
              <input
                type="number"
                className={invoerStijl}
                value={rij.waarde}
                onChange={(e) => wijzigRij(index, { waarde: Number(e.target.value) })}
                placeholder="Waarde"
              />
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <input
                className={invoerStijl}
                value={rij.eenheid}
                onChange={(e) => wijzigRij(index, { eenheid: e.target.value })}
                placeholder="Eenheid"
              />
              <input
                className={invoerStijl}
                value={rij.notatie}
                onChange={(e) => wijzigRij(index, { notatie: e.target.value })}
                placeholder="Notatie, optioneel (ruim 33.000)"
              />
              <input
                className={invoerStijl}
                value={rij.bron}
                onChange={(e) => wijzigRij(index, { bron: e.target.value })}
                placeholder="Bron"
              />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rij.geverifieerd}
                  onChange={(e) => wijzigRij(index, { geverifieerd: e.target.checked })}
                  className="h-5 w-5"
                />
                <span className="text-sm text-inkt">Geverifieerd</span>
              </label>
              <button
                type="button"
                onClick={() => onWijzig(rijen.filter((_, i) => i !== index))}
                className="text-xs font-medium text-risico hover:underline"
              >
                Verwijderen
              </button>
            </div>
          </Kaart>
        ))}
        <Knop soort="rand" onClick={() => onWijzig([...rijen, legeKengetal()])}>
          Regel toevoegen
        </Knop>
      </div>
    </section>
  );
}
