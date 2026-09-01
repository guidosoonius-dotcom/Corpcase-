import { describe, expect, it } from "vitest";
import { bepaalSpoorAdvies, DIAGNOSE_ASSEN, gemiddeldeDiagnoseScores } from "../proces";
import type { ProcesDiagnoseRij } from "@/lib/supabase/types";

function diagnose(deelnemerId: string, scores: Record<string, number>): ProcesDiagnoseRij {
  return {
    id: `diag-${deelnemerId}`,
    sessie_id: "s1",
    proces_id: "p1",
    deelnemer_id: deelnemerId,
    scores,
    aangemaakt_op: "",
    bijgewerkt_op: "",
  };
}

const alle5 = { pijn: 3, volume: 3, variatie: 3, datakwaliteit: 3, strategisch_belang: 3 };

describe("gemiddeldeDiagnoseScores", () => {
  it("middelt per as over meerdere deelnemers", () => {
    const scores = gemiddeldeDiagnoseScores([
      diagnose("a", { pijn: 5, volume: 1, variatie: 3, datakwaliteit: 3, strategisch_belang: 3 }),
      diagnose("b", { pijn: 3, volume: 5, variatie: 3, datakwaliteit: 3, strategisch_belang: 3 }),
    ]);
    expect(scores.pijn).toBeCloseTo(4);
    expect(scores.volume).toBeCloseTo(3);
  });

  it("een as die niemand invulde blijft null", () => {
    const scores = gemiddeldeDiagnoseScores([diagnose("a", { pijn: 4 })]);
    expect(scores.pijn).toBe(4);
    expect(scores.volume).toBeNull();
  });

  it("geen diagnoses levert vijf keer null op", () => {
    const scores = gemiddeldeDiagnoseScores([]);
    for (const as of DIAGNOSE_ASSEN) expect(scores[as]).toBeNull();
  });

  it("een deelnemer die niet alle assen invulde telt alleen mee op de assen die hij wel deed", () => {
    const scores = gemiddeldeDiagnoseScores([
      diagnose("a", { pijn: 5 }),
      diagnose("b", { pijn: 1, volume: 5 }),
    ]);
    expect(scores.pijn).toBeCloseTo(3);
    expect(scores.volume).toBeCloseTo(5);
  });
});

describe("bepaalSpoorAdvies", () => {
  it("adviseert new practice bij hoog strategisch belang, hoge variatie, lage datakwaliteit", () => {
    const uitkomst = bepaalSpoorAdvies({
      pijn: 1,
      volume: 1,
      variatie: 5,
      datakwaliteit: 1,
      strategisch_belang: 5,
    });
    expect(uitkomst).toMatchObject({ status: "advies", spoor: "nieuw" });
    if (uitkomst.status === "advies") {
      expect(uitkomst.assen).toEqual(
        expect.arrayContaining(["strategisch_belang", "variatie", "datakwaliteit"]),
      );
    }
  });

  it("adviseert iteratief bij hoge pijn, hoog volume, lage variatie", () => {
    const uitkomst = bepaalSpoorAdvies({
      pijn: 5,
      volume: 5,
      variatie: 1,
      datakwaliteit: 5,
      strategisch_belang: 1,
    });
    expect(uitkomst).toMatchObject({ status: "advies", spoor: "iteratief" });
  });

  it("adviseert niet-nu bij lage pijn en laag volume", () => {
    const uitkomst = bepaalSpoorAdvies({
      pijn: 1,
      volume: 1,
      variatie: 3,
      datakwaliteit: 3,
      strategisch_belang: 3,
    });
    expect(uitkomst).toMatchObject({ status: "advies", spoor: "niet-nu" });
  });

  it("is onbeslist als geen van de regels aanslaat", () => {
    // Hoge pijn, hoog volume, maar ook hoge variatie: raakt geen van de drie regels.
    const uitkomst = bepaalSpoorAdvies({
      pijn: 5,
      volume: 5,
      variatie: 5,
      datakwaliteit: 5,
      strategisch_belang: 1,
    });
    expect(uitkomst.status).toBe("onbeslist");
  });

  it("de grenswaarde (alles precies op 3) is onbeslist, niet toevallig één van de drie", () => {
    const uitkomst = bepaalSpoorAdvies(alle5);
    expect(uitkomst.status).toBe("onbeslist");
  });

  it("meldt onvoldoende_data als een as nog niet gescoord is", () => {
    const uitkomst = bepaalSpoorAdvies({ ...alle5, datakwaliteit: null });
    expect(uitkomst).toMatchObject({ status: "onvoldoende_data", ontbrekende_assen: ["datakwaliteit"] });
  });

  it("meldt alle ontbrekende assen als niemand nog gescoord heeft", () => {
    const uitkomst = bepaalSpoorAdvies({
      pijn: null,
      volume: null,
      variatie: null,
      datakwaliteit: null,
      strategisch_belang: null,
    });
    expect(uitkomst.status).toBe("onvoldoende_data");
    if (uitkomst.status === "onvoldoende_data") {
      expect(uitkomst.ontbrekende_assen).toHaveLength(5);
    }
  });
});
