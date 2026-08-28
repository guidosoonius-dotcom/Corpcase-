import coraJson from "@content/cora/domeinen.json";
import duwoJson from "@content/organisaties/duwo.json";
import jaarverslagJson from "@content/signalen/duwo-jaarverslag.json";
import personasJson from "@content/signalen/duwo-personas.json";
import uitdagingenJson from "@content/signalen/uitdagingen.json";
import bibliotheekJson from "@content/usecases/bibliotheek.json";
import driversJson from "@content/waarde/drivers.json";
import rollenJson from "@content/spel/rollen.json";
import rolopdrachtenJson from "@content/spel/rolopdrachten.json";
import realiteitschecksJson from "@content/spel/realiteitschecks.json";
import speelmodiJson from "@content/spel/speelmodi.json";

import {
  bibliotheekSchema,
  coraBestandSchema,
  driversBestandSchema,
  jaarverslagBestandSchema,
  organisatieSchema,
  personaBestandSchema,
  realiteitschecksBestandSchema,
  rolopdrachtenBestandSchema,
  rollenBestandSchema,
  speelmodiBestandSchema,
  uitdagingBestandSchema,
} from "./schemas";

/**
 * Eén plek waar de contentbestanden worden ingelezen en gevalideerd.
 *
 * De validatie draait bij het importeren, dus een fout in een contentbestand valt op bij de build
 * of bij `npm run content:check` — niet pas halverwege een sessie met een bestuurder aan tafel.
 */

export const cora = coraBestandSchema.parse(coraJson);
export const organisaties = [organisatieSchema.parse(duwoJson)];
export const jaarverslagSignalen = jaarverslagBestandSchema.parse(jaarverslagJson);
export const personaSignalen = personaBestandSchema.parse(personasJson);
export const uitdagingSignalen = uitdagingBestandSchema.parse(uitdagingenJson);
export const bibliotheek = bibliotheekSchema.parse(bibliotheekJson);
export const waardeModel = driversBestandSchema.parse(driversJson);
export const rollen = rollenBestandSchema.parse(rollenJson);
export const rolopdrachten = rolopdrachtenBestandSchema.parse(rolopdrachtenJson);
export const realiteitschecks = realiteitschecksBestandSchema.parse(realiteitschecksJson);
export const speelmodi = speelmodiBestandSchema.parse(speelmodiJson);

export function organisatie(id: string) {
  const gevonden = organisaties.find((o) => o.id === id);
  if (!gevonden) throw new Error(`Onbekende organisatie: ${id}`);
  return gevonden;
}

export function domein(id: string) {
  return cora.domeinen.find((d) => d.id === id);
}

export function usecase(id: string) {
  return bibliotheek.usecases.find((u) => u.id === id);
}

export function speelmodus(id: string) {
  const gevonden = speelmodi.modi.find((m) => m.id === id);
  if (!gevonden) throw new Error(`Onbekende speelmodus: ${id}`);
  return gevonden;
}

export function rol(id: string) {
  return rollen.rollen.find((r) => r.id === id);
}

export function rolopdrachtVoorRol(rolId: string) {
  return rolopdrachten.opdrachten.find((o) => o.rol === rolId);
}

/** Alle signaalkaarten van de vier lenzen, in één lijst met hun lens erbij. */
export type SignaalKaart = {
  id: string;
  lens: "jaarverslag" | "huurder" | "uitdaging" | "domein";
  titel: string;
  tekst: string;
  thema?: string;
  domeinen?: string[];
  bron?: string;
  geverifieerd?: boolean;
  detail?: { profiel?: string; reis?: string; frustraties?: string[] };
};

export function alleSignalen(organisatieId: string): SignaalKaart[] {
  const kaarten: SignaalKaart[] = [];

  if (jaarverslagSignalen.organisatie_id === organisatieId) {
    for (const k of jaarverslagSignalen.kaarten) {
      kaarten.push({
        id: k.id,
        lens: "jaarverslag",
        titel: k.titel,
        tekst: k.signaal,
        thema: k.thema,
        bron: k.bron,
        geverifieerd: k.geverifieerd,
      });
    }
  }

  if (personaSignalen.organisatie_id === organisatieId) {
    for (const k of personaSignalen.kaarten) {
      kaarten.push({
        id: k.id,
        lens: "huurder",
        titel: k.titel,
        tekst: k.signaal,
        thema: k.thema,
        detail: { profiel: k.profiel, reis: k.reis, frustraties: k.frustraties },
      });
    }
  }

  for (const k of uitdagingSignalen.kaarten) {
    kaarten.push({
      id: k.id,
      lens: "uitdaging",
      titel: k.titel,
      tekst: k.signaal,
      domeinen: k.domeinen,
    });
  }

  for (const d of cora.domeinen) {
    kaarten.push({
      id: `dom-${d.id}`,
      lens: "domein",
      titel: d.naam,
      tekst: d.omschrijving,
      domeinen: [d.id],
    });
  }

  return kaarten;
}

/** Use cases die bij een signaal passen, zodat de stap van signaal naar use case klein blijft. */
export function usecasesBijSignaal(signaalId: string) {
  return bibliotheek.usecases.filter(
    (u) =>
      u.personas.includes(signaalId) ||
      u.uitdagingen.includes(signaalId) ||
      (signaalId.startsWith("dom-") && u.domein === signaalId.slice(4)),
  );
}
