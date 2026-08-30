import {
  jaarverslagBestandSchema,
  organisatieSchema,
  personaBestandSchema,
} from "@/lib/content/schemas";

/**
 * Bouwt de drie contentbestanden voor een nieuwe corporatie uit het formulier van de
 * onboardingwizard, en valideert ze tegen dezelfde zod-schema's als `npm run content:check`.
 *
 * Genereert bestanden, schrijft niets weg: content leeft in `content/` en wordt met de app
 * meegebouwd, met opzet zonder database — zie de toelichting bovenaan supabase/schema.sql. De
 * wizard verkort dus het pad van "een developer schrijft JSON met de hand" naar "vul een
 * formulier in, commit drie bestanden en twee regels", niet naar "geen code aanraken".
 */

export type KengetalFormulier = {
  id: string;
  label: string;
  waarde: number;
  eenheid: string;
  notatie: string;
  bron: string;
  geverifieerd: boolean;
};

export type ThemaFormulier = { id: string; naam: string; omschrijving: string };

export type OrganisatieFormulier = {
  id: string;
  naam: string;
  type: string;
  pitch: string;
  accent: string;
  themaToelichting: string;
  themaBron: string;
  themaGeverifieerd: boolean;
  jaarverslagJaar: number;
  jaarverslagTitel: string;
  jaarverslagBron: string;
  jaarverslagGeverifieerd: boolean;
  steden: string[];
  kengetallen: KengetalFormulier[];
  strategischeThemas: ThemaFormulier[];
  onderscheidendeKenmerken: string[];
  rekenkundigeUitgangspunten: KengetalFormulier[];
  budgetGeldEur: number;
  budgetCapaciteit: number;
  budgetToelichting: string;
  budgetBron: string;
  budgetGeverifieerd: boolean;
};

export type JaarverslagKaartFormulier = {
  id: string;
  titel: string;
  thema: string;
  signaal: string;
  bron: string;
  geverifieerd: boolean;
};

export type PersonaKaartFormulier = {
  id: string;
  titel: string;
  thema: string;
  profiel: string;
  reis: string;
  frustraties: string[];
  signaal: string;
};

/** Van "DUWO Rotterdam" naar "duwo-rotterdam": hetzelfde patroon als de bestaande content-id's. */
export function slugify(tekst: string): string {
  return tekst
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function naarKengetal(k: KengetalFormulier) {
  return {
    id: k.id,
    label: k.label,
    waarde: k.waarde,
    eenheid: k.eenheid,
    ...(k.notatie ? { notatie: k.notatie } : {}),
    bron: k.bron,
    geverifieerd: k.geverifieerd,
  };
}

export function bouwOrganisatieJson(f: OrganisatieFormulier) {
  return {
    id: f.id,
    naam: f.naam,
    type: f.type,
    pitch: f.pitch,
    thema: {
      accent: f.accent,
      toelichting: f.themaToelichting,
      bron: f.themaBron,
      geverifieerd: f.themaGeverifieerd,
    },
    jaarverslag: {
      jaar: f.jaarverslagJaar,
      titel: f.jaarverslagTitel,
      bron: f.jaarverslagBron,
      geverifieerd: f.jaarverslagGeverifieerd,
    },
    steden: f.steden,
    kengetallen: f.kengetallen.map(naarKengetal),
    strategische_themas: f.strategischeThemas,
    onderscheidende_kenmerken: f.onderscheidendeKenmerken,
    rekenkundige_uitgangspunten: f.rekenkundigeUitgangspunten.map(naarKengetal),
    budget_defaults: {
      geld_eur: f.budgetGeldEur,
      verandercapaciteit_mensmaanden: f.budgetCapaciteit,
      toelichting: f.budgetToelichting,
      bron: f.budgetBron,
      geverifieerd: f.budgetGeverifieerd,
    },
  };
}

export function bouwJaarverslagJson(organisatieId: string, kaarten: JaarverslagKaartFormulier[]) {
  return {
    organisatie_id: organisatieId,
    lens: "jaarverslag" as const,
    toelichting: `Signalen uit het jaarverslag van ${organisatieId}, per kaart met bron en verificatiestatus.`,
    kaarten: kaarten.map((k) => ({
      id: k.id,
      titel: k.titel,
      ...(k.thema ? { thema: k.thema } : {}),
      signaal: k.signaal,
      bron: k.bron,
      geverifieerd: k.geverifieerd,
    })),
  };
}

export function bouwPersonasJson(organisatieId: string, kaarten: PersonaKaartFormulier[]) {
  return {
    organisatie_id: organisatieId,
    lens: "huurder" as const,
    toelichting: `Huurderspersona's van ${organisatieId}, elk met een profiel, een reis en concrete frustraties.`,
    kaarten: kaarten.map((k) => ({
      id: k.id,
      titel: k.titel,
      ...(k.thema ? { thema: k.thema } : {}),
      profiel: k.profiel,
      reis: k.reis,
      frustraties: k.frustraties,
      signaal: k.signaal,
    })),
  };
}

/** De twee regels die in src/lib/content/index.ts geplakt moeten worden. */
export function bouwIndexSnippet(organisatieId: string): string {
  const naam = organisatieId.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
  return [
    `import ${naam}Json from "@content/organisaties/${organisatieId}.json";`,
    `import ${naam}JaarverslagJson from "@content/signalen/${organisatieId}-jaarverslag.json";`,
    `import ${naam}PersonasJson from "@content/signalen/${organisatieId}-personas.json";`,
    "",
    `// In ORGANISATIE_BRONNEN, als extra element van de array:`,
    `{ organisatie: ${naam}Json, jaarverslag: ${naam}JaarverslagJson, personas: ${naam}PersonasJson },`,
  ].join("\n");
}

export type ValidatieResultaat =
  | { geldig: true }
  | { geldig: false; fouten: { bestand: string; pad: string; melding: string }[] };

function verzamelFouten(
  bestand: string,
  resultaat: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } },
): { bestand: string; pad: string; melding: string }[] {
  if (resultaat.success || !resultaat.error) return [];
  return resultaat.error.issues.map((issue) => ({
    bestand,
    pad: issue.path.join(".") || "(root)",
    melding: issue.message,
  }));
}

/** Dezelfde schema's als npm run content:check — hier vóór het downloaden, daar bij elke build. */
export function valideerFormulier(
  organisatie: unknown,
  jaarverslag: unknown,
  personas: unknown,
): ValidatieResultaat {
  const fouten = [
    ...verzamelFouten("organisatie", organisatieSchema.safeParse(organisatie)),
    ...verzamelFouten("jaarverslag", jaarverslagBestandSchema.safeParse(jaarverslag)),
    ...verzamelFouten("personas", personaBestandSchema.safeParse(personas)),
  ];

  return fouten.length === 0 ? { geldig: true } : { geldig: false, fouten };
}
