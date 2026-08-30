import { describe, expect, it } from "vitest";
import { jaarverslagBestandSchema, organisatieSchema, personaBestandSchema } from "@/lib/content/schemas";
import {
  bouwIndexSnippet,
  bouwJaarverslagJson,
  bouwOrganisatieJson,
  bouwPersonasJson,
  slugify,
  valideerFormulier,
  type JaarverslagKaartFormulier,
  type OrganisatieFormulier,
  type PersonaKaartFormulier,
} from "../genereren";

const volledigFormulier: OrganisatieFormulier = {
  id: "test-corp",
  naam: "Test Corp",
  type: "Woningcorporatie",
  pitch: "Een testcorporatie voor de wizard.",
  accent: "#3366CC",
  themaToelichting: "De huisstijlkleur.",
  themaBron: "huisstijlgids",
  themaGeverifieerd: true,
  jaarverslagJaar: 2024,
  jaarverslagTitel: "Jaarverslag 2024",
  jaarverslagBron: "jaarverslag.pdf",
  jaarverslagGeverifieerd: false,
  steden: ["Teststad"],
  kengetallen: [
    { id: "eenheden", label: "Eenheden", waarde: 1000, eenheid: "eenheden", notatie: "1.000", bron: "jaarverslag", geverifieerd: true },
  ],
  strategischeThemas: [{ id: "beschikbaarheid", naam: "Beschikbaarheid", omschrijving: "Meer aanbod." }],
  onderscheidendeKenmerken: ["Hoge mutatiegraad."],
  rekenkundigeUitgangspunten: [
    { id: "uurtarief_intern", label: "Uurtarief", waarde: 65, eenheid: "EUR/uur", notatie: "", bron: "aanname", geverifieerd: false },
  ],
  budgetGeldEur: 500000,
  budgetCapaciteit: 12,
  budgetToelichting: "Indicatieve ruimte.",
  budgetBron: "aanname",
  budgetGeverifieerd: false,
};

const jaarverslagKaarten: JaarverslagKaartFormulier[] = [
  { id: "test-corp-signaal-1", titel: "Signaal 1", thema: "beschikbaarheid", signaal: "Een bevinding.", bron: "jaarverslag.pdf", geverifieerd: false },
];

const personaKaarten: PersonaKaartFormulier[] = [
  {
    id: "p-test",
    titel: "Testbewoner",
    thema: "",
    profiel: "Een testbewoner met een profiel.",
    reis: "Een reis door het proces.",
    frustraties: ["Traag antwoord."],
    signaal: "Een signaal over deze persona.",
  },
];

describe("slugify", () => {
  it("maakt van een naam een content-id in dezelfde stijl als de bestaande bestanden", () => {
    expect(slugify("DUWO Rotterdam")).toBe("duwo-rotterdam");
    expect(slugify("  Woonstichting  Eigen Huis  ")).toBe("woonstichting-eigen-huis");
    expect(slugify("Élan Wonen")).toBe("elan-wonen");
  });
});

describe("bouwOrganisatieJson / bouwJaarverslagJson / bouwPersonasJson", () => {
  it("produceert output die tegen de echte contentschema's valideert — dezelfde als npm run content:check", () => {
    const organisatie = bouwOrganisatieJson(volledigFormulier);
    const jaarverslag = bouwJaarverslagJson(volledigFormulier.id, jaarverslagKaarten);
    const personas = bouwPersonasJson(volledigFormulier.id, personaKaarten);

    expect(() => organisatieSchema.parse(organisatie)).not.toThrow();
    expect(() => jaarverslagBestandSchema.parse(jaarverslag)).not.toThrow();
    expect(() => personaBestandSchema.parse(personas)).not.toThrow();
  });

  it("laat notatie weg in plaats van een lege string te bewaren, als niemand hem invulde", () => {
    const zonderNotatie = bouwOrganisatieJson({
      ...volledigFormulier,
      kengetallen: [{ ...volledigFormulier.kengetallen[0], notatie: "" }],
    });
    expect(zonderNotatie.kengetallen[0]).not.toHaveProperty("notatie");
  });

  it("koppelt jaarverslag en personas aan het organisatie-id, niet aan de naam", () => {
    const jaarverslag = bouwJaarverslagJson("test-corp", jaarverslagKaarten);
    const personas = bouwPersonasJson("test-corp", personaKaarten);
    expect(jaarverslag.organisatie_id).toBe("test-corp");
    expect(personas.organisatie_id).toBe("test-corp");
  });
});

describe("bouwIndexSnippet", () => {
  it("zet een id met een koppelteken om naar een geldige camelCase importnaam", () => {
    const snippet = bouwIndexSnippet("test-corp");
    expect(snippet).toContain('import testCorpJson from "@content/organisaties/test-corp.json";');
    expect(snippet).toContain("organisatie: testCorpJson");
  });
});

describe("valideerFormulier", () => {
  it("is geldig voor een compleet, correct ingevuld formulier", () => {
    const resultaat = valideerFormulier(
      bouwOrganisatieJson(volledigFormulier),
      bouwJaarverslagJson(volledigFormulier.id, jaarverslagKaarten),
      bouwPersonasJson(volledigFormulier.id, personaKaarten),
    );
    expect(resultaat.geldig).toBe(true);
  });

  it("wijst een organisatie zonder accentkleur af met een leesbare foutmelding", () => {
    const kapot = bouwOrganisatieJson({ ...volledigFormulier, accent: "niet-een-kleur" });
    const resultaat = valideerFormulier(
      kapot,
      bouwJaarverslagJson(volledigFormulier.id, jaarverslagKaarten),
      bouwPersonasJson(volledigFormulier.id, personaKaarten),
    );
    expect(resultaat.geldig).toBe(false);
    if (!resultaat.geldig) {
      expect(resultaat.fouten.some((f) => f.bestand === "organisatie" && f.pad === "thema.accent")).toBe(
        true,
      );
    }
  });

  it("wijst een persona zonder frustraties af — dat veld is bewust verplicht", () => {
    const resultaat = valideerFormulier(
      bouwOrganisatieJson(volledigFormulier),
      bouwJaarverslagJson(volledigFormulier.id, jaarverslagKaarten),
      bouwPersonasJson(volledigFormulier.id, [{ ...personaKaarten[0], frustraties: [] }]),
    );
    expect(resultaat.geldig).toBe(false);
  });
});
