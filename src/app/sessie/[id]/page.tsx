"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useSessie, useAanwezigheid } from "@/lib/sessie/gebruik";
import { Sessiebalk } from "@/components/sessiebalk";
import { Lobby } from "@/components/fases/lobby";
import { Verkennen } from "@/components/fases/verkennen";
import { Identificatie } from "@/components/fases/identificatie";
import { Waardebepaling } from "@/components/fases/waardebepaling";
import { Prioritering } from "@/components/fases/prioritering";
import { Roadmap } from "@/components/fases/roadmap";
import { Opbrengst } from "@/components/fases/opbrengst";
import { Knop, Melding } from "@/components/basis";
import { Thema } from "@/components/thema";
import { organisatie } from "@/lib/content";
import { eigenFase } from "@/lib/sessie/afgeleid";

/**
 * Het scherm van de speler, meestal een telefoon.
 *
 * Elke deelnemer navigeert hier zelf, via de tabbalk in `Sessiebalk` — niet meer gedwongen
 * gelijk op met de groep. `sessie.fase` blijft de gezamenlijke stand die de facilitator zet;
 * wie zijn eigen tabblad niet heeft aangeraakt volgt die automatisch (`eigen_fase` is dan null).
 * Wie zelf doorklikt naar een latere fase ziet daar de waarschuwing dat hij voorloopt.
 */
export default function SpelerPagina() {
  const parameters = useParams<{ id: string }>();
  const sessieId = parameters.id;
  const { state, identiteit, laden, fout, doe } = useSessie(sessieId);
  useAanwezigheid(sessieId, identiteit);

  if (laden) {
    return <main className="p-8 text-sm text-inkt-licht">Laden…</main>;
  }

  if (!identiteit) {
    return (
      <main className="mx-auto w-full max-w-md px-5 py-12">
        <h1 className="text-xl font-semibold text-inkt">Je doet nog niet mee</h1>
        <p className="mt-2 text-sm leading-relaxed text-inkt-zacht">
          Deze browser hoort niet bij deze sessie. Vraag de facilitator om de code en doe mee.
        </p>
        <div className="mt-5">
          <Link href="/deelnemen">
            <Knop>Naar het joinscherm</Knop>
          </Link>
        </div>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="mx-auto w-full max-w-md px-5 py-12">
        <Melding toon="risico">{fout ?? "De sessie kon niet geladen worden."}</Melding>
      </main>
    );
  }

  const ik = state.deelnemers.find((d) => d.id === identiteit.deelnemerId);
  const fase = ik ? eigenFase(ik, state) : state.sessie.fase;

  return (
    <Thema
      accent={organisatie(state.sessie.organisatie_id).thema.accent}
      className="flex flex-1 flex-col"
    >
      <Sessiebalk state={state} identiteit={identiteit} sessieId={sessieId} doe={doe} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        {fout ? (
          <div className="mb-4">
            <Melding toon="risico">{fout}</Melding>
          </div>
        ) : null}

        {fase === "lobby" ? <Lobby state={state} identiteit={identiteit} /> : null}
        {fase === "verkennen" ? (
          <Verkennen state={state} identiteit={identiteit} doe={doe} />
        ) : null}
        {fase === "identificatie" ? (
          <Identificatie state={state} identiteit={identiteit} doe={doe} />
        ) : null}
        {fase === "waardebepaling" ? (
          <Waardebepaling state={state} identiteit={identiteit} doe={doe} />
        ) : null}
        {fase === "prioritering" ? (
          <Prioritering state={state} identiteit={identiteit} doe={doe} />
        ) : null}
        {fase === "roadmap" ? <Roadmap state={state} identiteit={identiteit} doe={doe} /> : null}
        {fase === "opbrengst" ? <Opbrengst state={state} /> : null}
      </main>
    </Thema>
  );
}
