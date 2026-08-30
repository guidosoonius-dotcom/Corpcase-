import { describe, expect, it } from "vitest";
import { bouwOrganisatieRegister } from "../index";

/**
 * Bewijst dat de contentlaag echt meerdere organisaties naast elkaar aankan, met fictieve
 * bronnen — niet met een tweede, verzonnen echte corporatie in content/. Vóór deze functie was
 * er precies één harde import per bestand; deze test moet omvallen als dat ooit weer sluipt.
 */

function organisatie(id: string, accent: string) {
  return {
    id,
    naam: `Testcorporatie ${id}`,
    type: "Woningcorporatie",
    pitch: "Testfixture, geen echte corporatie.",
    thema: { accent, bron: "test", geverifieerd: false },
    jaarverslag: { jaar: 2024, titel: "Testjaarverslag", bron: "test", geverifieerd: false },
    steden: ["Teststad"],
    kengetallen: [],
    strategische_themas: [],
    onderscheidende_kenmerken: [],
    rekenkundige_uitgangspunten: [],
    budget_defaults: {
      geld_eur: 100000,
      verandercapaciteit_mensmaanden: 12,
      toelichting: "test",
      bron: "test",
      geverifieerd: false,
    },
  };
}

function jaarverslag(organisatieId: string, kaartId: string) {
  return {
    organisatie_id: organisatieId,
    lens: "jaarverslag" as const,
    toelichting: "test",
    kaarten: [
      { id: kaartId, titel: "Testsignaal", signaal: "Een testbevinding.", bron: "test", geverifieerd: false },
    ],
  };
}

function personas(organisatieId: string, kaartId: string) {
  return {
    organisatie_id: organisatieId,
    lens: "huurder" as const,
    toelichting: "test",
    kaarten: [
      {
        id: kaartId,
        titel: "Testpersona",
        profiel: "Een testbewoner.",
        reis: "Een testreis.",
        frustraties: ["Een testfrustratie."],
        signaal: "Een testsignaal.",
      },
    ],
  };
}

describe("bouwOrganisatieRegister", () => {
  it("houdt de signalen van twee organisaties strikt gescheiden", () => {
    const register = bouwOrganisatieRegister([
      {
        organisatie: organisatie("test-a", "#123456"),
        jaarverslag: jaarverslag("test-a", "a-jv-1"),
        personas: personas("test-a", "a-p-1"),
      },
      {
        organisatie: organisatie("test-b", "#abcdef"),
        jaarverslag: jaarverslag("test-b", "b-jv-1"),
        personas: personas("test-b", "b-p-1"),
      },
    ]);

    expect(register).toHaveLength(2);
    const a = register.find((e) => e.organisatie.id === "test-a")!;
    const b = register.find((e) => e.organisatie.id === "test-b")!;

    expect(a.jaarverslag.kaarten.map((k) => k.id)).toEqual(["a-jv-1"]);
    expect(b.jaarverslag.kaarten.map((k) => k.id)).toEqual(["b-jv-1"]);
    expect(a.personas.kaarten.map((k) => k.id)).toEqual(["a-p-1"]);
    expect(b.personas.kaarten.map((k) => k.id)).toEqual(["b-p-1"]);

    // Elke organisatie krijgt zijn eigen accentkleur terug, niet die van de eerste in de lijst.
    expect(a.organisatie.thema.accent).toBe("#123456");
    expect(b.organisatie.thema.accent).toBe("#abcdef");
  });

  it("laat een ongeldig contentbestand meteen falen, met zod's eigen foutmelding", () => {
    expect(() =>
      bouwOrganisatieRegister([
        {
          organisatie: { ...organisatie("test-a", "#123456"), naam: undefined },
          jaarverslag: jaarverslag("test-a", "a-jv-1"),
          personas: personas("test-a", "a-p-1"),
        },
      ]),
    ).toThrow();
  });

  it("bouwt een leeg register op zonder bronnen, in plaats van te crashen", () => {
    expect(bouwOrganisatieRegister([])).toEqual([]);
  });
});
