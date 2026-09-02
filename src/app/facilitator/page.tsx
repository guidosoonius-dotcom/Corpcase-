"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { opslag } from "@/lib/sessie/api";
import { bewaarIdentiteit, wisIdentiteit } from "@/lib/sessie/identiteit";
import { normaliseerCode } from "@/lib/sessie/codes";
import { organisaties, procesmodi, procesmodus, rollen, speelmodi, speelmodus } from "@/lib/content";
import { maakHerkomst, herkomstIsBruikbaar } from "@/lib/sessie/herkomst";
import type { FacilitatorSessieOverzicht } from "@/lib/sessie/soorten";
import { FASE_LABELS, type Herkomst, type Spelsoort } from "@/lib/supabase/types";
import { Etiket, Kaart, Knop, Melding, Veld, Veldgroep, invoerStijl } from "@/components/basis";
import { Cirkel } from "@/components/decoratie";
import { Thema } from "@/components/thema";

/**
 * De facilitatoromgeving: hier maak je een sessie aan en beheer je alles wat al loopt.
 *
 * Anders dan een deelnemer, die nooit meer dan een sessiecode, zijn naam en zijn rol ziet, staan
 * hier de instellingen (spelsoort, titel, speelduur) én een overzicht van alle sessies — achter
 * één gedeeld wachtwoord in plaats van individuele accounts. Zie
 * src/lib/supabase/service.ts voor hoe dat overzicht technisch begrensd is.
 */

const WACHTWOORD_SLEUTEL = "corpcase:facilitator-wachtwoord";

function modusNaam(spelsoort: Spelsoort, speelmodusId: string): string {
  try {
    return spelsoort === "proces" ? procesmodus(speelmodusId).naam : speelmodus(speelmodusId).naam;
  } catch {
    return speelmodusId;
  }
}

function datumTijd(iso: string): string {
  return new Date(iso).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FacilitatorPagina() {
  const router = useRouter();
  const org = organisaties[0];

  // Wachtwoordgate ------------------------------------------------------------
  // Begint altijd op "niet ingelogd", ook als er een wachtwoord in localStorage staat: die is er
  // tijdens server-rendering nog niet, en de eerste render moet op de server en de client gelijk
  // zijn. Een eerder ingevoerd wachtwoord hergebruiken gebeurt daarom pas in het effect hieronder,
  // net zoals useSessie in src/lib/sessie/gebruik.ts de identiteit ook pas ná de eerste render leest.
  const [wachtwoord, setWachtwoord] = useState("");
  const [ingelogd, setIngelogd] = useState(false);
  const [wachtwoordFout, setWachtwoordFout] = useState<string | null>(null);
  const [wachtwoordBezig, setWachtwoordBezig] = useState(false);

  // Overzicht -------------------------------------------------------------------
  const [sessies, setSessies] = useState<FacilitatorSessieOverzicht[] | null>(null);
  const [overzichtFout, setOverzichtFout] = useState<string | null>(null);
  const [overzichtLaden, setOverzichtLaden] = useState(false);
  const [bezigMet, setBezigMet] = useState<string | null>(null);
  const [teVerwijderen, setTeVerwijderen] = useState<string | null>(null);

  async function laadOverzicht(actueelWachtwoord: string) {
    setOverzichtLaden(true);
    setOverzichtFout(null);
    try {
      const lijst = await opslag.lijstAlleSessies(actueelWachtwoord);
      setSessies(lijst);
    } catch (probleem) {
      setOverzichtFout(probleem instanceof Error ? probleem.message : "Overzicht ophalen mislukte.");
    } finally {
      setOverzichtLaden(false);
    }
  }

  // Was er al een bewaard wachtwoord, dan na de eerste render inloggen en meteen het overzicht
  // ophalen. Niet meteen in de effectbody: dat zou synchroon state zetten en een extra render
  // kosten (zelfde patroon als useSessie in src/lib/sessie/gebruik.ts).
  useEffect(() => {
    const bewaard = window.localStorage.getItem(WACHTWOORD_SLEUTEL);
    if (!bewaard) return;
    const timer = window.setTimeout(() => {
      setWachtwoord(bewaard);
      setIngelogd(true);
      void laadOverzicht(bewaard);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function logIn() {
    if (!wachtwoord.trim()) return;
    setWachtwoordBezig(true);
    setWachtwoordFout(null);
    try {
      await opslag.lijstAlleSessies(wachtwoord);
      window.localStorage.setItem(WACHTWOORD_SLEUTEL, wachtwoord);
      setIngelogd(true);
      await laadOverzicht(wachtwoord);
    } catch (probleem) {
      setWachtwoordFout(probleem instanceof Error ? probleem.message : "Inloggen mislukte.");
    } finally {
      setWachtwoordBezig(false);
    }
  }

  async function beheer(sessie: FacilitatorSessieOverzicht) {
    setBezigMet(sessie.id);
    setOverzichtFout(null);
    try {
      const toegang = await opslag.facilitatorInloggen(sessie.beheer_code);
      bewaarIdentiteit(toegang.sessie.id, {
        ...toegang.identiteit,
        deelnemerId: toegang.deelnemer.id,
      });
      router.push(`/sessie/${toegang.sessie.id}/beheer`);
    } catch (probleem) {
      setOverzichtFout(probleem instanceof Error ? probleem.message : "Beheren mislukte.");
      setBezigMet(null);
    }
  }

  async function verwijder(sessie: FacilitatorSessieOverzicht) {
    setBezigMet(sessie.id);
    setOverzichtFout(null);
    try {
      const toegang = await opslag.facilitatorInloggen(sessie.beheer_code);
      await opslag.verwijderSessie(toegang.identiteit, sessie.id);
      wisIdentiteit(sessie.id);
      setSessies((huidig) => huidig?.filter((s) => s.id !== sessie.id) ?? null);
      setTeVerwijderen(null);
    } catch (probleem) {
      setOverzichtFout(probleem instanceof Error ? probleem.message : "Verwijderen mislukte.");
    } finally {
      setBezigMet(null);
    }
  }

  // Nieuwe sessie -----------------------------------------------------------------
  const [spelsoort, setSpelsoort] = useState<Spelsoort>("usecases");
  const [titel, setTitel] = useState(`Use-casesessie ${org.naam}`);
  const [modusId, setModusId] = useState("halve-dag");
  const [vorigeBeheerCode, setVorigeBeheerCode] = useState("");
  const [herkomst, setHerkomst] = useState<Herkomst | null>(null);
  const [herkomstBezig, setHerkomstBezig] = useState(false);
  const [herkomstFout, setHerkomstFout] = useState<string | null>(null);
  const [naam, setNaam] = useState("");
  const [speeltMee, setSpeeltMee] = useState(true);
  const [rolId, setRolId] = useState(rollen.rollen[0].id);
  const [aanmakenBezig, setAanmakenBezig] = useState(false);
  const [aanmakenFout, setAanmakenFout] = useState<string | null>(null);

  const modi = spelsoort === "proces" ? procesmodi.modi : speelmodi.modi;
  const modus = modi.find((m) => m.id === modusId)!;

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

  async function maakNieuweSessie() {
    if (!naam.trim()) {
      setAanmakenFout("Vul je naam in, dan weten de anderen wie er aan tafel zit.");
      return;
    }
    setAanmakenBezig(true);
    setAanmakenFout(null);
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
      setAanmakenFout(probleem instanceof Error ? probleem.message : "Sessie starten mislukte.");
      setAanmakenBezig(false);
    }
  }

  // Direct met een beheercode, zonder het wachtwoord -------------------------------
  const [beheerCode, setBeheerCode] = useState("");
  const [beheerCodeBezig, setBeheerCodeBezig] = useState(false);
  const [beheerCodeFout, setBeheerCodeFout] = useState<string | null>(null);

  async function directInloggen() {
    if (normaliseerCode(beheerCode).length !== 10) {
      setBeheerCodeFout("Een beheercode bestaat uit tien tekens.");
      return;
    }
    setBeheerCodeBezig(true);
    setBeheerCodeFout(null);
    try {
      const toegang = await opslag.facilitatorInloggen(beheerCode);
      bewaarIdentiteit(toegang.sessie.id, {
        ...toegang.identiteit,
        deelnemerId: toegang.deelnemer.id,
      });
      router.push(`/sessie/${toegang.sessie.id}/beheer`);
    } catch (probleem) {
      setBeheerCodeFout(probleem instanceof Error ? probleem.message : "Inloggen mislukte.");
      setBeheerCodeBezig(false);
    }
  }

  if (!ingelogd) {
    return (
      <main className="relative mx-auto w-full max-w-md overflow-hidden px-5 py-10">
        <Cirkel hoek="rechtsboven" formaat={0.55} toon="zacht" />
        <Link href="/" className="text-sm text-inkt-licht hover:text-accent-diep">
          ← Terug
        </Link>
        <h1 className="display mt-4 text-3xl text-inkt">Facilitator</h1>
        <p className="mt-2 text-sm leading-relaxed text-inkt-zacht">
          Vul het facilitator-wachtwoord in. Daarachter zitten het overzicht van alle sessies en
          het formulier om een nieuwe sessie aan te maken.
        </p>

        <div className="mt-7 space-y-5">
          <Veld label="Wachtwoord">
            <input
              type="password"
              className={invoerStijl}
              value={wachtwoord}
              onChange={(e) => setWachtwoord(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void logIn()}
              autoComplete="off"
            />
          </Veld>

          {wachtwoordFout ? <Melding toon="risico">{wachtwoordFout}</Melding> : null}

          <Knop onClick={logIn} disabled={wachtwoordBezig || !wachtwoord.trim()} className="w-full">
            {wachtwoordBezig ? "Bezig…" : "Inloggen"}
          </Knop>

          <details className="pt-2">
            <summary className="cursor-pointer text-xs font-medium text-inkt-licht hover:text-accent-diep">
              Heb je alleen een beheercode van één sessie?
            </summary>
            <div className="mt-3 space-y-3">
              <p className="text-xs leading-relaxed text-inkt-zacht">
                Dan hoef je het wachtwoord niet te kennen: met de beheercode kom je direct op het
                beheerscherm van die ene sessie.
              </p>
              <Veld label="Beheercode">
                <input
                  className={`${invoerStijl} text-center font-mono text-lg tracking-[0.2em] uppercase`}
                  value={beheerCode}
                  onChange={(e) => setBeheerCode(e.target.value.toUpperCase())}
                  placeholder="ABCD234EFG"
                  maxLength={14}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="text"
                />
              </Veld>
              {beheerCodeFout ? <Melding toon="risico">{beheerCodeFout}</Melding> : null}
              <Knop soort="rand" onClick={directInloggen} disabled={beheerCodeBezig} className="w-full">
                {beheerCodeBezig ? "Bezig…" : "Direct naar die sessie"}
              </Knop>
            </div>
          </details>
        </div>
      </main>
    );
  }

  return (
    <Thema accent={org.thema.accent} className="flex-1">
      <main className="relative mx-auto w-full max-w-3xl overflow-hidden px-5 py-10">
        <Cirkel hoek="rechtsboven" formaat={0.5} toon="zacht" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link href="/" className="text-sm text-inkt-licht hover:text-accent-diep">
              ← Terug
            </Link>
            <h1 className="display mt-4 text-3xl text-inkt">Facilitator</h1>
          </div>
          <button
            type="button"
            onClick={() => {
              window.localStorage.removeItem(WACHTWOORD_SLEUTEL);
              setIngelogd(false);
              setSessies(null);
            }}
            className="mt-1 text-xs text-inkt-licht hover:text-accent-diep"
          >
            Uitloggen
          </button>
        </div>

        {/* Overzicht ------------------------------------------------------- */}
        <section className="mt-8">
          <h2 className="display text-xl text-inkt">Sessies</h2>

          {overzichtFout ? <Melding toon="risico">{overzichtFout}</Melding> : null}

          {overzichtLaden && !sessies ? (
            <p className="mt-3 text-sm text-inkt-licht">Bezig…</p>
          ) : sessies && sessies.length === 0 ? (
            <p className="mt-3 text-sm text-inkt-licht">Nog geen sessies. Maak er hieronder een aan.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {sessies?.map((sessie) => (
                <li key={sessie.id}>
                  <Kaart className="p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-inkt">{sessie.titel}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-inkt-licht">
                          <Etiket>{sessie.spelsoort === "proces" ? "Processen" : "Use cases"}</Etiket>
                          <Etiket>{modusNaam(sessie.spelsoort, sessie.speelmodus)}</Etiket>
                          <Etiket toon={sessie.afgerond_op ? "waarde" : "accent"}>
                            {FASE_LABELS[sessie.fase]}
                          </Etiket>
                          <span>
                            {sessie.deelnemers_aantal}{" "}
                            {sessie.deelnemers_aantal === 1 ? "deelnemer" : "deelnemers"}
                          </span>
                          <span>· aangemaakt {datumTijd(sessie.aangemaakt_op)}</span>
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <Knop
                          soort="rand"
                          className="!px-3 !py-2 !text-xs"
                          disabled={bezigMet === sessie.id}
                          onClick={() => void beheer(sessie)}
                        >
                          Beheren
                        </Knop>
                        <Knop
                          soort="gevaar"
                          className="!px-3 !py-2 !text-xs"
                          disabled={bezigMet === sessie.id}
                          onClick={() =>
                            setTeVerwijderen(teVerwijderen === sessie.id ? null : sessie.id)
                          }
                        >
                          Verwijderen
                        </Knop>
                      </div>
                    </div>

                    {teVerwijderen === sessie.id ? (
                      <div className="mt-3 rounded-kaart bg-risico-zacht p-2.5">
                        <p className="text-xs leading-relaxed text-risico">
                          &ldquo;{sessie.titel}&rdquo; verwijderen? Dat kan niet ongedaan gemaakt
                          worden — alle deelnemers, use cases en antwoorden gaan mee weg.
                        </p>
                        <div className="mt-2 flex gap-2">
                          <Knop
                            soort="gevaar"
                            className="!px-3 !py-1.5 !text-xs"
                            disabled={bezigMet === sessie.id}
                            onClick={() => void verwijder(sessie)}
                          >
                            {bezigMet === sessie.id ? "Bezig…" : "Ja, verwijderen"}
                          </Knop>
                          <Knop
                            soort="stil"
                            className="!px-3 !py-1.5 !text-xs"
                            onClick={() => setTeVerwijderen(null)}
                          >
                            Annuleren
                          </Knop>
                        </div>
                      </div>
                    ) : null}
                  </Kaart>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Nieuwe sessie ----------------------------------------------------- */}
        <section className="mt-12 border-t border-rand pt-8">
          <h2 className="display text-xl text-inkt">Nieuwe sessie</h2>
          <p className="mt-2 text-sm leading-relaxed text-inkt-zacht">
            Jij opent en sluit de fases. Kies hieronder of je daarnaast ook zelf een rol speelt,
            of alleen begeleidt.
          </p>

          <div className="mt-6 space-y-5">
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

            <Veld
              label="Hoeveel tijd heb je?"
              hint="Bepaalt het aantal kaarten, de timers en hoe diep je doorrekent."
            >
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
                <select
                  className={invoerStijl}
                  value={rolId}
                  onChange={(e) => setRolId(e.target.value)}
                >
                  {rollen.rollen.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.naam}
                    </option>
                  ))}
                </select>
              </Veld>
            ) : null}

            {aanmakenFout ? <Melding toon="risico">{aanmakenFout}</Melding> : null}

            <div className="flex items-center gap-3">
              <Knop onClick={maakNieuweSessie} disabled={aanmakenBezig}>
                {aanmakenBezig ? "Bezig…" : "Sessie starten"}
              </Knop>
              <p className="text-xs text-inkt-licht">
                {"max_usecases" in modus
                  ? `Maximaal ${modus.max_usecases} use cases in deze modus.`
                  : `Maximaal ${modus.max_processen} ${modus.max_processen === 1 ? "proces" : "processen"} in deze modus.`}
              </p>
            </div>
          </div>
        </section>
      </main>
    </Thema>
  );
}
