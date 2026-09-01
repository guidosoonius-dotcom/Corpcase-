"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { opslag } from "@/lib/sessie/api";
import { bewaarIdentiteit } from "@/lib/sessie/identiteit";
import { organisaties, procesmodi, rollen, speelmodi } from "@/lib/content";
import { maakHerkomst, herkomstIsBruikbaar } from "@/lib/sessie/herkomst";
import type { Herkomst, Spelsoort } from "@/lib/supabase/types";
import { Kaart, Knop, Melding, Veld, Veldgroep, invoerStijl } from "@/components/basis";
import { Cirkel } from "@/components/decoratie";
import { Thema } from "@/components/thema";

export default function StartPagina() {
  const router = useRouter();
  const org = organisaties[0];

  const [spelsoort, setSpelsoort] = useState<Spelsoort>("usecases");
  const [titel, setTitel] = useState(`Use-casesessie ${org.naam}`);
  const [modusId, setModusId] = useState("halve-dag");
  // De optionele brug naar een afgeronde use-casesessie: de beheercode daarvan bewijst dat je er
  // zelf bij was. Wat eruit meekomt is een kopie; zie src/lib/sessie/herkomst.ts.
  const [vorigeBeheerCode, setVorigeBeheerCode] = useState("");
  const [herkomst, setHerkomst] = useState<Herkomst | null>(null);
  const [herkomstBezig, setHerkomstBezig] = useState(false);
  const [herkomstFout, setHerkomstFout] = useState<string | null>(null);
  const [naam, setNaam] = useState("");
  const [speeltMee, setSpeeltMee] = useState(true);
  const [rolId, setRolId] = useState(rollen.rollen[0].id);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const modi = spelsoort === "proces" ? procesmodi.modi : speelmodi.modi;
  const modus = modi.find((m) => m.id === modusId)!;

  // De titel volgt de spelsoort zolang de facilitator hem niet zelf heeft aangepast.
  function wisselSpelsoort(nieuw: Spelsoort) {
    setSpelsoort(nieuw);
    const standaard = { usecases: `Use-casesessie ${org.naam}`, proces: `Processessie ${org.naam}` };
    if (titel === standaard.usecases || titel === standaard.proces) setTitel(standaard[nieuw]);
    if (nieuw === "usecases") {
      setHerkomst(null);
      setVorigeBeheerCode("");
      setHerkomstFout(null);
    }
  }

  /**
   * Haalt de uitkomst van een eerdere sessie op met de beheercode ervan.
   *
   * Dit gebeurt hier in de browser van de facilitator, met zijn eigen toegang tot díe sessie, en
   * niet later vanuit de nieuwe sessie: zo hoeft de nieuwe sessie nooit ergens anders te kunnen
   * lezen dan bij zichzelf.
   */
  async function haalVorigeSessie() {
    const code = vorigeBeheerCode.trim();
    if (!code) return;
    setHerkomstBezig(true);
    setHerkomstFout(null);
    try {
      const toegang = await opslag.facilitatorInloggen(code);
      if (toegang.sessie.spelsoort !== "usecases") {
        setHerkomstFout("Dit is geen use-casesessie. Gebruik de beheercode van de eerste sessie.");
        return;
      }
      const state = await opslag.haalState(toegang.identiteit, toegang.sessie.id);
      const gevonden = maakHerkomst(state);
      if (!herkomstIsBruikbaar(gevonden)) {
        setHerkomstFout(
          "Die sessie heeft nog geen portfolio of roadmap opgeleverd; er valt dus niets mee te nemen.",
        );
        return;
      }
      setHerkomst(gevonden);
    } catch (probleem) {
      setHerkomstFout(
        probleem instanceof Error ? probleem.message : "De vorige sessie kon niet gelezen worden.",
      );
    } finally {
      setHerkomstBezig(false);
    }
  }

  async function starten() {
    if (!naam.trim()) {
      setFout("Vul je naam in, dan weten de anderen wie er aan tafel zit.");
      return;
    }
    setBezig(true);
    setFout(null);
    try {
      const toegang = await opslag.maakSessie({
        titel:
          titel.trim() ||
          (spelsoort === "proces" ? `Processessie ${org.naam}` : `Use-casesessie ${org.naam}`),
        organisatieId: org.id,
        spelsoort,
        herkomst,
        speelmodusId: modusId,
        facilitatorNaam: naam.trim(),
        facilitatorRolId: speeltMee ? rolId : null,
      });
      bewaarIdentiteit(toegang.sessie.id, {
        ...toegang.identiteit,
        deelnemerId: toegang.deelnemer.id,
      });
      router.push(`/sessie/${toegang.sessie.id}/beheer`);
    } catch (probleem) {
      setFout(probleem instanceof Error ? probleem.message : "Sessie starten mislukte.");
      setBezig(false);
    }
  }

  return (
    <Thema accent={org.thema.accent} className="flex-1">
      <main className="relative mx-auto w-full max-w-xl overflow-hidden px-5 py-10 lg:flex lg:min-h-screen lg:flex-col lg:justify-center">
      <Cirkel hoek="rechtsboven" formaat={0.5} toon="zacht" />
      <Link href="/" className="text-sm text-inkt-licht hover:text-accent-diep">
        ← Terug
      </Link>
      <h1 className="display mt-4 text-3xl text-inkt">Sessie starten</h1>
      <p className="mt-2 text-sm leading-relaxed text-inkt-zacht">
        Jij opent en sluit de fases. Kies hieronder of je daarnaast ook zelf een rol speelt, of
        alleen begeleidt.
      </p>

      <div className="mt-7 space-y-5">
        <Veldgroep
          label="Welke sessie speel je?"
          hint="De tweede bouwt voort op de eerste, maar is ook los te spelen."
        >
          <div className="space-y-2">
            {(
              [
                {
                  waarde: "usecases",
                  titel: "Use cases",
                  omschrijving:
                    "Van signaal naar use case, waarde, prioritering en roadmap. Levert een portfolio en een volgorde op.",
                },
                {
                  waarde: "proces",
                  titel: "Processen",
                  omschrijving:
                    "Eén proces op tafel: afpellen, diagnose, en verbeteren of opnieuw ontwerpen. Levert een procesontwerp met een doorrekening op.",
                },
              ] as const
            ).map((optie) => (
              <label
                key={optie.waarde}
                className={`keuze flex cursor-pointer items-start gap-3 rounded-kaart border p-3 transition-colors ${
                  spelsoort === optie.waarde
                    ? "border-accent bg-accent-zacht"
                    : "border-rand bg-vlak hover:border-rand-sterk"
                }`}
              >
                <input
                  type="radio"
                  name="spelsoort"
                  className="mt-1"
                  checked={spelsoort === optie.waarde}
                  onChange={() => wisselSpelsoort(optie.waarde)}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-inkt">{optie.titel}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-inkt-zacht">
                    {optie.omschrijving}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </Veldgroep>

        {spelsoort === "proces" ? (
          <Veld
            label="Volgt dit op een eerdere sessie?"
            hint="Optioneel. Met de beheercode van die sessie neem je het portfolio en de roadmap mee als startpunt."
          >
            {herkomst ? (
              <Kaart className="p-3">
                <p className="text-sm font-medium text-inkt">{herkomst.titel}</p>
                <p className="mt-1 text-xs leading-relaxed text-inkt-zacht">
                  {herkomst.portfolio.length} use cases in het portfolio
                  {herkomst.nu_op_de_roadmap.length > 0
                    ? `, ${herkomst.nu_op_de_roadmap.length} op de roadmap onder "nu"`
                    : ""}
                  . Die komen als voorzet terug bij de proceskeuze.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setHerkomst(null);
                    setVorigeBeheerCode("");
                  }}
                  className="mt-2 text-xs font-medium text-accent-diep hover:underline"
                >
                  Toch niet meenemen
                </button>
              </Kaart>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    className={invoerStijl}
                    value={vorigeBeheerCode}
                    onChange={(e) => setVorigeBeheerCode(e.target.value)}
                    placeholder="Beheercode van de vorige sessie"
                    autoComplete="off"
                  />
                  <Knop
                    soort="stil"
                    onClick={haalVorigeSessie}
                    disabled={herkomstBezig || !vorigeBeheerCode.trim()}
                  >
                    {herkomstBezig ? "Bezig…" : "Ophalen"}
                  </Knop>
                </div>
                {herkomstFout ? <Melding toon="risico">{herkomstFout}</Melding> : null}
              </div>
            )}
          </Veld>
        ) : null}

        <Veld label="Naam van de sessie">
          <input
            className={invoerStijl}
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            placeholder="Use-casesessie"
          />
        </Veld>

        <Veld label="Corporatie">
          <Kaart className="p-3">
            <p className="text-sm font-medium text-inkt">{org.naam}</p>
            <p className="mt-1 text-xs leading-relaxed text-inkt-zacht">{org.pitch}</p>
          </Kaart>
        </Veld>

        <Veld label="Hoeveel tijd heb je?" hint="Bepaalt het aantal kaarten, de timers en hoe diep je doorrekent.">
          <div className="space-y-2">
            {modi.map((m) => (
              <label
                key={m.id}
                className={`keuze flex cursor-pointer items-start gap-3 rounded-kaart border p-3 transition-colors ${
                  modusId === m.id
                    ? "border-accent bg-accent-zacht"
                    : "border-rand bg-vlak hover:border-rand-sterk"
                }`}
              >
                <input
                  type="radio"
                  name="modus"
                  className="mt-1"
                  checked={modusId === m.id}
                  onChange={() => setModusId(m.id)}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-inkt">
                    {m.naam} · {Math.round(m.duur_minuten / 15) * 15} minuten
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-inkt-zacht">
                    {m.omschrijving}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </Veld>

        <Veld label="Jouw naam">
          <input
            className={invoerStijl}
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            placeholder="Voor- en achternaam"
            autoComplete="name"
          />
        </Veld>

        <Veldgroep label="Doe je ook zelf mee?">
          <div className="space-y-2">
            {(
              [
                {
                  waarde: true,
                  titel: "Ik begeleid én speel mee",
                  omschrijving:
                    "Je kiest een rol, denkt inhoudelijk mee en krijgt een privé-opdracht — naast het openen en sluiten van de fases.",
                },
                {
                  waarde: false,
                  titel: "Ik begeleid alleen",
                  omschrijving:
                    "Geen rol en geen plek in het spelbord. Je stuurt de sessie aan en kijkt mee, zonder zelf mee te doen.",
                },
              ] as const
            ).map((optie) => (
              <label
                key={String(optie.waarde)}
                className={`keuze flex cursor-pointer items-start gap-3 rounded-kaart border p-3 transition-colors ${
                  speeltMee === optie.waarde
                    ? "border-accent bg-accent-zacht"
                    : "border-rand bg-vlak hover:border-rand-sterk"
                }`}
              >
                <input
                  type="radio"
                  name="speeltMee"
                  className="mt-1"
                  checked={speeltMee === optie.waarde}
                  onChange={() => setSpeeltMee(optie.waarde)}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-inkt">{optie.titel}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-inkt-zacht">
                    {optie.omschrijving}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </Veldgroep>

        {speeltMee ? (
          <Veld
            label="Jouw rol"
            hint="Bepaalt door welke bril je kijkt en welke privé-opdracht je krijgt."
          >
            <select className={invoerStijl} value={rolId} onChange={(e) => setRolId(e.target.value)}>
              {rollen.rollen.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.naam}
                </option>
              ))}
            </select>
          </Veld>
        ) : null}

        {fout ? <Melding toon="risico">{fout}</Melding> : null}

        <div className="flex items-center gap-3">
          <Knop onClick={starten} disabled={bezig}>
            {bezig ? "Bezig…" : "Sessie starten"}
          </Knop>
          <p className="text-xs text-inkt-licht">
            {"max_usecases" in modus
              ? `Maximaal ${modus.max_usecases} use cases in deze modus.`
              : `Maximaal ${modus.max_processen} ${modus.max_processen === 1 ? "proces" : "processen"} in deze modus.`}
          </p>
        </div>
      </div>
      </main>
    </Thema>
  );
}
