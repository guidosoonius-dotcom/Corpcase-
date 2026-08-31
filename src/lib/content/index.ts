import coraJson from "@content/cora/domeinen.json";
import uitdagingenJson from "@content/signalen/uitdagingen.json";
import bibliotheekJson from "@content/usecases/bibliotheek.json";
import driversJson from "@content/waarde/drivers.json";
import rollenJson from "@content/spel/rollen.json";
import rolopdrachtenJson from "@content/spel/rolopdrachten.json";
import realiteitschecksJson from "@content/spel/realiteitschecks.json";
import speelmodiJson from "@content/spel/speelmodi.json";

// Per organisatie horen drie bestanden bij elkaar: het profiel en de twee org-specifieke
// signaallenzen (jaarverslag, huurders). Nieuwe corporatie? Voeg de drie imports hieronder toe en
// één regel aan ORGANISATIE_BRONNEN — de onboardingwizard (/organisatie-toevoegen) genereert de
// bestanden zelf en toont precies deze twee regels om te plakken.
import duwoJson from "@content/organisaties/duwo.json";
import duwoJaarverslagJson from "@content/signalen/duwo-jaarverslag.json";
import duwoPersonasJson from "@content/signalen/duwo-personas.json";

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
  type JaarverslagKaart,
  type PersonaKaart,
} from "./schemas";

/**
 * Eén plek waar de contentbestanden worden ingelezen en gevalideerd.
 *
 * De validatie draait bij het importeren, dus een fout in een contentbestand valt op bij de build
 * of bij `npm run content:check` — niet pas halverwege een sessie met een bestuurder aan tafel.
 */

const ORGANISATIE_BRONNEN = [
  { organisatie: duwoJson, jaarverslag: duwoJaarverslagJson, personas: duwoPersonasJson },
];

/** Los van ORGANISATIE_BRONNEN getest in __tests__/organisaties.test.ts, met fictieve bronnen. */
export function bouwOrganisatieRegister(
  bronnen: { organisatie: unknown; jaarverslag: unknown; personas: unknown }[],
) {
  return bronnen.map((bron) => ({
    organisatie: organisatieSchema.parse(bron.organisatie),
    jaarverslag: jaarverslagBestandSchema.parse(bron.jaarverslag),
    personas: personaBestandSchema.parse(bron.personas),
  }));
}

const organisatieRegister = bouwOrganisatieRegister(ORGANISATIE_BRONNEN);

export const cora = coraBestandSchema.parse(coraJson);
export const organisaties = organisatieRegister.map((e) => e.organisatie);
export const uitdagingSignalen = uitdagingBestandSchema.parse(uitdagingenJson);
export const bibliotheek = bibliotheekSchema.parse(bibliotheekJson);
export const waardeModel = driversBestandSchema.parse(driversJson);
export const rollen = rollenBestandSchema.parse(rollenJson);
export const rolopdrachten = rolopdrachtenBestandSchema.parse(rolopdrachtenJson);
export const realiteitschecks = realiteitschecksBestandSchema.parse(realiteitschecksJson);
export const speelmodi = speelmodiBestandSchema.parse(speelmodiJson);

/**
 * Alle huurderspersona's van alle organisaties samen — voor kruiscontroles in
 * `scripts/valideer-content.ts` (verwijst elke usecase.personas naar een bestaand persona-id?)
 * en voor de wizard, die de bestaande persona-concepten toont als startpunt: een nieuwe
 * corporatie die een concept-id hergebruikt (bijvoorbeeld `p-internationaal`) houdt de koppeling
 * met de bibliotheek in stand.
 */
export const allePersonaSignalen: PersonaKaart[] = organisatieRegister.flatMap(
  (e) => e.personas.kaarten,
);

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

export function rol(id: string | null | undefined) {
  return rollen.rollen.find((r) => r.id === id);
}

export function rolopdrachtVoorRol(rolId: string | null | undefined) {
  return rolopdrachten.opdrachten.find((o) => o.rol === rolId);
}

/**
 * Weergavetekst voor een deelnemersrol, met een leesbare tekst voor een facilitator die alleen
 * begeleidt en dus geen `rol_id` heeft — anders staat er `null` of niets in lijsten en het rapport.
 */
export function rolNaam(rolId: string | null): string {
  if (!rolId) return "Begeleidt, geen rol";
  return rol(rolId)?.naam ?? rolId;
}

/** De huurderspersona's van precies deze organisatie, voor dekking() en de teamscore. */
export function personasVoorOrganisatie(organisatieId: string): PersonaKaart[] {
  return organisatieRegister.find((e) => e.organisatie.id === organisatieId)?.personas.kaarten ?? [];
}

function jaarverslagVoorOrganisatie(organisatieId: string): JaarverslagKaart[] {
  return (
    organisatieRegister.find((e) => e.organisatie.id === organisatieId)?.jaarverslag.kaarten ?? []
  );
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

  for (const k of jaarverslagVoorOrganisatie(organisatieId)) {
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

  for (const k of personasVoorOrganisatie(organisatieId)) {
    kaarten.push({
      id: k.id,
      lens: "huurder",
      titel: k.titel,
      tekst: k.signaal,
      thema: k.thema,
      detail: { profiel: k.profiel, reis: k.reis, frustraties: k.frustraties },
    });
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
