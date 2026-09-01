import { z } from "zod";

/**
 * Zod-schema's voor de contentbibliotheek in `content/`.
 *
 * De contentbestanden zijn bewust los van de code gehouden zodat een adviseur of de corporatie
 * zelf use cases, signalen en kengetallen kan aanpassen zonder een regel TypeScript aan te raken.
 * Deze schema's zijn het contract: `npm run content:check` valideert de bestanden ertegen.
 */

export const soortBedrijfsfunctie = z.enum(["sturend", "primair", "ondersteunend"]);

export const coraDomeinSchema = z.object({
  id: z.string().min(1),
  naam: z.string().min(1),
  soort: soortBedrijfsfunctie,
  omschrijving: z.string().min(1),
});

export const coraBestandSchema = z.object({
  toelichting: z.string(),
  bron: z.string().optional(),
  geverifieerd: z.boolean(),
  domeinen: z.array(coraDomeinSchema).min(1),
});

/** Een kengetal draagt altijd zijn bron en of die geverifieerd is. Zie content/BRONNEN.md. */
export const kengetalSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  waarde: z.number(),
  eenheid: z.string(),
  notatie: z.string().optional(),
  bron: z.string().min(1),
  geverifieerd: z.boolean(),
});

export const organisatieSchema = z.object({
  id: z.string().min(1),
  naam: z.string().min(1),
  type: z.string(),
  pitch: z.string(),
  /**
   * Eén accentkleur; de varianten voor knoppen, kleine tekst en donkere panelen worden eruit
   * afgeleid in src/lib/thema/kleur.ts, met een gemeten contrasttoets.
   */
  thema: z.object({
    accent: z.string().regex(/^#[0-9a-fA-F]{3,6}$/, "Geef een kleurcode zoals #E8524A"),
    toelichting: z.string().optional(),
    bron: z.string(),
    geverifieerd: z.boolean(),
  }),
  jaarverslag: z.object({
    jaar: z.number().int(),
    titel: z.string(),
    bron: z.string(),
    geverifieerd: z.boolean(),
  }),
  steden: z.array(z.string()),
  kengetallen: z.array(kengetalSchema),
  strategische_themas: z.array(
    z.object({ id: z.string(), naam: z.string(), omschrijving: z.string() }),
  ),
  onderscheidende_kenmerken: z.array(z.string()),
  rekenkundige_uitgangspunten: z.array(kengetalSchema),
  budget_defaults: z.object({
    geld_eur: z.number().nonnegative(),
    verandercapaciteit_mensmaanden: z.number().nonnegative(),
    toelichting: z.string(),
    bron: z.string(),
    geverifieerd: z.boolean(),
  }),
});

const signaalBasis = {
  id: z.string().min(1),
  titel: z.string().min(1),
  thema: z.string().optional(),
};

export const jaarverslagKaartSchema = z.object({
  ...signaalBasis,
  signaal: z.string().min(1),
  bron: z.string().min(1),
  geverifieerd: z.boolean(),
});

export const personaKaartSchema = z.object({
  ...signaalBasis,
  profiel: z.string().min(1),
  reis: z.string().min(1),
  frustraties: z.array(z.string()).min(1),
  signaal: z.string().min(1),
});

export const uitdagingKaartSchema = z.object({
  ...signaalBasis,
  signaal: z.string().min(1),
  domeinen: z.array(z.string()).min(1),
  specifiek_voor: z.string().optional(),
});

export const jaarverslagBestandSchema = z.object({
  organisatie_id: z.string(),
  lens: z.literal("jaarverslag"),
  toelichting: z.string(),
  kaarten: z.array(jaarverslagKaartSchema).min(1),
});

export const personaBestandSchema = z.object({
  organisatie_id: z.string(),
  lens: z.literal("huurder"),
  toelichting: z.string(),
  kaarten: z.array(personaKaartSchema).min(1),
});

export const uitdagingBestandSchema = z.object({
  lens: z.literal("uitdaging"),
  toelichting: z.string(),
  kaarten: z.array(uitdagingKaartSchema).min(1),
});

export const drivertypeIds = [
  "tijdsbesparing",
  "leegstandsreductie",
  "dervingsreductie",
  "vermeden_kosten",
  "extra_opbrengst",
] as const;

export const drivertypeIdSchema = z.enum(drivertypeIds);
export type DrivertypeId = (typeof drivertypeIds)[number];

export const driverVeldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  eenheid: z.string(),
  type: z.enum(["getal", "percentage"]),
  min: z.number().optional(),
  max: z.number().optional(),
  /** Verwijst naar een id in `rekenkundige_uitgangspunten` of `kengetallen` van de organisatie. */
  uitgangspunt: z.string().optional(),
});

export const drivertypeSchema = z.object({
  id: drivertypeIdSchema,
  naam: z.string().min(1),
  toelichting: z.string().min(1),
  eenheid: z.string(),
  formule: z.string().min(1),
  velden: z.array(driverVeldSchema).min(1),
});

export const dimensieSchema = z.object({
  id: z.string().min(1),
  naam: z.string().min(1),
  vraag: z.string().min(1),
  /** Kerndimensies staan altijd in beeld; de rest zit achter een knop. */
  kern: z.boolean().optional(),
});

export const driversBestandSchema = z.object({
  toelichting: z.string(),
  onzekerheid: z.object({
    standaard_bandbreedte_pct: z.number().min(0).max(100),
    toelichting: z.string(),
  }),
  drivertypes: z.array(drivertypeSchema).min(1),
  kostentypes: z.array(
    z.object({ id: z.string(), naam: z.string(), eenheid: z.string(), toelichting: z.string() }),
  ),
  kwalitatieve_dimensies: z.array(dimensieSchema).min(1),
  haalbaarheidsdimensies: z.array(dimensieSchema).min(1),
  scorekaart_dimensies: z.array(dimensieSchema).min(1),
  schaal: z.object({
    min: z.number().int(),
    max: z.number().int(),
    labels: z.record(z.string(), z.string()),
  }),
});

export const usecaseDriverSchema = z.object({
  type: drivertypeIdSchema,
  waarden: z.record(z.string(), z.number()),
});

export const usecaseSchema = z.object({
  id: z.string().min(1),
  titel: z.string().min(1),
  domein: z.string().min(1),
  probleem: z.string().min(1),
  oplossingsrichting: z.string().min(1),
  themas: z.array(z.string()),
  personas: z.array(z.string()),
  uitdagingen: z.array(z.string()),
  benodigde_data: z.array(z.string()).min(1),
  volwassenheid: z.enum(["bewezen", "opkomend", "verkennend"]),
  aandachtspunten: z.array(z.string()),
  drivers: z.array(usecaseDriverSchema),
  kosten: z.object({
    eenmalig: z.number().nonnegative(),
    jaarlijks: z.number().nonnegative(),
    capaciteit: z.number().nonnegative(),
  }),
  haalbaarheid_indicatie: z.record(z.string(), z.number().min(1).max(5)),
  kwalitatief_indicatie: z.record(z.string(), z.number().min(1).max(5)),
});

export const bibliotheekSchema = z.object({
  toelichting: z.string(),
  waarschuwing: z.string(),
  usecases: z.array(usecaseSchema).min(1),
});

export const rolSchema = z.object({
  id: z.string().min(1),
  naam: z.string().min(1),
  lens: z.string().min(1),
  kijkt_naar: z.array(z.string()).min(1),
  vraag: z.string().min(1),
});

export const rollenBestandSchema = z.object({
  toelichting: z.string(),
  rollen: z.array(rolSchema).min(1),
});

export const rolopdrachtSchema = z.object({
  id: z.string().min(1),
  rol: z.string().min(1),
  /** Voor welk spel deze opdracht geldt. Weggelaten betekent de use-casesessie. */
  spelsoort: z.enum(["usecases", "proces"]).default("usecases"),
  opdracht: z.string().min(1),
  controle: z.string().min(1),
});

export const rolopdrachtenBestandSchema = z.object({
  toelichting: z.string(),
  onthulling: z.string(),
  opdrachten: z.array(rolopdrachtSchema).min(1),
});

export const realiteitscheckSchema = z.object({
  id: z.string().min(1),
  titel: z.string().min(1),
  scenario: z.string().min(1),
  raakt: z.array(z.string()).min(1),
  zwaarte: z.number().int().min(1).max(3),
});

/**
 * De praktijktoetsen van de processessie hebben dezelfde vorm als de realiteitschecks, en delen
 * bewust hun tabel in de database: `realiteitscheck_besluiten.check_id` is vrije tekst zonder
 * verwijzing, precies zodat er inhoud uit meerdere bibliotheken in kan.
 */
export const realiteitschecksBestandSchema = z.object({
  toelichting: z.string(),
  checks: z.array(realiteitscheckSchema).min(1),
});

export const speelmodusSchema = z.object({
  id: z.enum(["kort", "halve-dag", "hele-dag"]),
  naam: z.string().min(1),
  duur_minuten: z.number().int().positive(),
  omschrijving: z.string().min(1),
  max_usecases: z.number().int().positive(),
  min_signalen_per_speler: z.number().int().nonnegative(),
  max_signalen_per_speler: z.number().int().positive(),
  businesscase_verplicht_aantal: z.number().int().nonnegative(),
  aantal_realiteitschecks: z.number().int().nonnegative(),
  roadmap_horizonnen: z.array(z.string()).min(1),
  randvoorwaarden_verplicht: z.boolean().optional(),
  timers_minuten: z.record(z.string(), z.number().int().positive()),
});

export const speelmodiBestandSchema = z.object({
  toelichting: z.string(),
  modi: z.array(speelmodusSchema).length(3),
  horizonnen: z
    .array(z.object({ id: z.string(), naam: z.string(), periode: z.string(), vraag: z.string() }))
    .min(1),
  kwadranten: z
    .array(
      z.object({
        id: z.string(),
        naam: z.string(),
        waarde: z.enum(["hoog", "laag"]),
        haalbaarheid: z.enum(["hoog", "laag"]),
        advies: z.string(),
      }),
    )
    .length(4),
});

/**
 * Een bedrijfsfunctie uit het CORA-functiemodel: het niveau waarop een processessie kiest.
 *
 * Een niveau fijner dan de achttien domeinen in `content/cora/domeinen.json` — "Coördineren
 * reparatieonderhoud" in plaats van "Vastgoedonderhoud" — en een niveau grover dan de stappen
 * waaruit zo'n functie bestaat. Die stappen staan hier bewust niet standaard in: die tekent het
 * team zelf op de procesplaat. Is er materiaal van de corporatie zelf, dan komt dat in
 * `stappen_voorzet` te staan, met een eigen bron, en verschijnt het in de sessie als één knop —
 * laden en daarna aanpassen — nooit als iets dat er stilzwijgend al staat.
 */
export const processtapVoorzetSchema = z.object({
  naam: z.string().min(1),
  /** Rol of afdeling die de stap uitvoert; de plaat markeert de overdrachten hiertussen. */
  uitvoerder: z.string().min(1),
  /** Een stap die maar in een deel van de gevallen langskomt; hangt naast de hoofdlijn. */
  uitzondering: z.boolean().optional(),
});

export const bedrijfsfunctieSchema = z.object({
  id: z.string().min(1),
  naam: z.string().min(1),
  /** Het oranje kader waar de functie in staat: "Verhuurde eenheid", "Richting", "Monitoring". */
  groep: z.string().min(1),
  soort: soortBedrijfsfunctie,
  /** Alleen bij primaire functies: bedient die de huurder, of de eigen organisatie? */
  klant: z.enum(["extern", "intern"]).optional(),
  /** Verwijst naar een id in content/cora/domeinen.json. */
  domein: z.string().min(1),
  /** Voor wat er in de bron opvalt en nog uitgezocht moet worden. */
  opmerking: z.string().optional(),
  stappen_voorzet: z.array(processtapVoorzetSchema),
  /** Verplicht zodra er een voorzet staat: waar komen die stappen vandaan? */
  voorzet_bron: z.string().min(1).optional(),
  voorzet_geverifieerd: z.boolean().optional(),
});

export const bedrijfsfunctiesBestandSchema = z.object({
  toelichting: z.string(),
  bron: z.string().min(1),
  geverifieerd: z.boolean(),
  functies: z.array(bedrijfsfunctieSchema).min(1),
});

/**
 * De processessie heeft eigen knoppen per speelduur. Bewust een eigen bestand en een eigen schema
 * naast `speelmodi.json`: de twee spellen delen alleen de drie id's, zodat de facilitator dezelfde
 * keuze maakt bij het starten, maar verder stelt een proces afpellen andere eisen dan een
 * portfolio opbouwen.
 */
export const procesManoeuvreIds = [
  "voorkomen",
  "schrappen",
  "samenvoegen",
  "verplaatsen",
  "automatiseren",
  "standaardiseren",
  "verrijken",
] as const;

export const procesManoeuvreIdSchema = z.enum(procesManoeuvreIds);
export type ProcesManoeuvreId = (typeof procesManoeuvreIds)[number];

/** Iteratief verbeteren, opnieuw ontwerpen, of bewust niet nu. */
export const spoorIds = ["iteratief", "nieuw", "niet-nu"] as const;
export const spoorIdSchema = z.enum(spoorIds);
export type SpoorId = (typeof spoorIds)[number];

export const procesmodusSchema = z.object({
  id: z.enum(["kort", "halve-dag", "hele-dag"]),
  naam: z.string().min(1),
  duur_minuten: z.number().int().positive(),
  omschrijving: z.string().min(1),
  max_processen: z.number().int().positive(),
  min_stappen_per_proces: z.number().int().positive(),
  min_processignalen_per_speler: z.number().int().nonnegative(),
  max_processignalen_per_speler: z.number().int().positive(),
  verbeteringen_doorrekenen_aantal: z.number().int().nonnegative(),
  aantal_praktijktoetsen: z.number().int().nonnegative(),
  eigenaar_verplicht: z.boolean().optional(),
  /** Welke manoeuvres in deze speelduur op tafel liggen; korter spel, minder keuzes. */
  manoeuvres: z.array(procesManoeuvreIdSchema).min(1),
  timers_minuten: z.record(z.string(), z.number().int().positive()),
});

export const procesmodiBestandSchema = z.object({
  toelichting: z.string(),
  modi: z.array(procesmodusSchema).length(3),
  manoeuvres: z
    .array(
      z.object({
        id: procesManoeuvreIdSchema,
        naam: z.string().min(1),
        vraag: z.string().min(1),
        toelichting: z.string().min(1),
      }),
    )
    .length(7),
  sporen: z
    .array(
      z.object({
        id: spoorIdSchema,
        naam: z.string().min(1),
        omschrijving: z.string().min(1),
        vraag: z.string().min(1),
      }),
    )
    .length(3),
});

export type CoraDomein = z.infer<typeof coraDomeinSchema>;
export type Organisatie = z.infer<typeof organisatieSchema>;
export type Kengetal = z.infer<typeof kengetalSchema>;
export type JaarverslagKaart = z.infer<typeof jaarverslagKaartSchema>;
export type PersonaKaart = z.infer<typeof personaKaartSchema>;
export type UitdagingKaart = z.infer<typeof uitdagingKaartSchema>;
export type Drivertype = z.infer<typeof drivertypeSchema>;
export type Usecase = z.infer<typeof usecaseSchema>;
export type UsecaseDriver = z.infer<typeof usecaseDriverSchema>;
export type Rol = z.infer<typeof rolSchema>;
export type Rolopdracht = z.infer<typeof rolopdrachtSchema>;
export type Realiteitscheck = z.infer<typeof realiteitscheckSchema>;
export type Speelmodus = z.infer<typeof speelmodusSchema>;
export type Bedrijfsfunctie = z.infer<typeof bedrijfsfunctieSchema>;
export type ProcesstapVoorzet = z.infer<typeof processtapVoorzetSchema>;
export type Procesmodus = z.infer<typeof procesmodusSchema>;
export type ProcesManoeuvre = z.infer<typeof procesmodiBestandSchema>["manoeuvres"][number];
export type Spoor = z.infer<typeof procesmodiBestandSchema>["sporen"][number];
export type Dimensie = z.infer<typeof dimensieSchema>;
