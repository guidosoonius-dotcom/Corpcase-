import { describe, expect, it } from "vitest";
import { maakSessie, voegProcesToe, voegVerbeteringToe, wijzigVerbetering, bewaarBesluit, haalState } from "../lokale-kern";
import { businessCaseVanVerbetering, teamscore } from "../afgeleid";
import { bedrijfsfuncties, organisaties, praktijktoetsen, speelmodi } from "@/lib/content";
import type { ProcesVerbeteringRij } from "@/lib/supabase/types";

function nieuweVerbetering(overrides: Partial<ProcesVerbeteringRij> = {}): ProcesVerbeteringRij {
  return {
    id: "v1",
    sessie_id: "s1",
    proces_id: "p1",
    stap_id: null,
    manoeuvre: null,
    titel: "Test",
    toelichting: "",
    usecase_ref: null,
    drivers: [],
    kosten: { eenmalig: 0, jaarlijks: 0, capaciteit: 0 },
    eigenaar_id: null,
    meetmoment: null,
    toegevoegd_door: null,
    aangemaakt_op: "",
    bijgewerkt_op: "",
    ...overrides,
  };
}

/** Zelfde patroon als `businessCaseVan`: geen drivers betekent geen doorrekening. */
describe("businessCaseVanVerbetering", () => {
  it("is null zolang er geen drivers zijn", () => {
    expect(businessCaseVanVerbetering(nieuweVerbetering(), 30)).toBeNull();
  });

  it("rekent door zodra er een complete driver op staat", () => {
    const verbetering = nieuweVerbetering({
      drivers: [
        {
          type: "dervingsreductie",
          waarden: { huidige_post_per_jaar: 10000, reductie_pct: 50 },
        },
      ],
    });
    const businessCase = businessCaseVanVerbetering(verbetering, 30);
    expect(businessCase?.volledig).toBe(true);
    expect(businessCase?.bruto_baat?.verwacht).toBeCloseTo(5000);
  });

  it("meldt welke velden nog ontbreken bij een onvolledige driver", () => {
    const verbetering = nieuweVerbetering({
      drivers: [{ type: "dervingsreductie", waarden: { huidige_post_per_jaar: 10000 } }],
    });
    const businessCase = businessCaseVanVerbetering(verbetering, 30);
    expect(businessCase?.volledig).toBe(false);
    expect(businessCase?.ontbrekende_velden).toContain("dervingsreductie.reductie_pct");
  });
});

/**
 * De teamscore van een processessie krijgt punten voor doorgerekende verbeteringen en voor
 * praktijktoetsen die van een besluit zijn voorzien — via de echte spelflow op de lokale opslag,
 * net als `lokale-kern.test.ts` dat voor andere acties ook doet.
 */
describe("procesTeamscore: doorrekenen en besluit", () => {
  function nieuweProcessessie() {
    const toegang = maakSessie({
      titel: "Testprocessessie",
      organisatieId: organisaties[0].id,
      spelsoort: "proces",
      speelmodusId: speelmodi.modi[0].id,
      facilitatorNaam: "Guido",
      facilitatorRolId: null,
    });
    const identiteit = { deelnemerToken: toegang.identiteit.deelnemerToken };
    const proces = voegProcesToe(identiteit, {
      sessieId: toegang.sessie.id,
      functieId: bedrijfsfuncties.functies[0].id,
      titel: "Testproces",
    });
    return { toegang, identiteit, proces };
  }

  it("beloont een volledig doorgerekende verbetering", () => {
    const { toegang, identiteit, proces } = nieuweProcessessie();
    const verbetering = voegVerbeteringToe(identiteit, {
      sessieId: toegang.sessie.id,
      procesId: proces.id,
      deelnemerId: toegang.deelnemer.id,
      titel: "Automatiseer de herinnering",
    });
    wijzigVerbetering(identiteit, verbetering.id, {
      drivers: [
        { type: "dervingsreductie", waarden: { huidige_post_per_jaar: 10000, reductie_pct: 50 } },
      ],
    });

    const state = haalState(identiteit, toegang.sessie.id);
    const score = teamscore(state);
    const onderdeel = score.onderdelen.find((o) => o.id === "doorrekening");
    expect(onderdeel?.punten).toBe(6);
  });

  it("geeft geen doorrekenpunten zolang geen enkele verbetering compleet is", () => {
    const { toegang, identiteit, proces } = nieuweProcessessie();
    voegVerbeteringToe(identiteit, {
      sessieId: toegang.sessie.id,
      procesId: proces.id,
      deelnemerId: toegang.deelnemer.id,
      titel: "Nog niets ingevuld",
    });

    const state = haalState(identiteit, toegang.sessie.id);
    const score = teamscore(state);
    const onderdeel = score.onderdelen.find((o) => o.id === "doorrekening");
    expect(onderdeel?.punten).toBe(0);
  });

  it("beloont een praktijktoets die van een besluit is voorzien", () => {
    const { toegang, identiteit } = nieuweProcessessie();
    const check = praktijktoetsen.checks[0];
    bewaarBesluit(identiteit, {
      sessieId: toegang.sessie.id,
      checkId: check.id,
      besluit: "handhaven",
      motivatie: "Het houdt stand.",
    });

    const state = haalState(identiteit, toegang.sessie.id);
    const score = teamscore(state);
    const onderdeel = score.onderdelen.find((o) => o.id === "besluit");
    expect(onderdeel?.punten).toBe(4);
  });

  it("laat het besluit-onderdeel weg zolang er geen enkele praktijktoets is vastgelegd", () => {
    const { toegang, identiteit } = nieuweProcessessie();
    const state = haalState(identiteit, toegang.sessie.id);
    const score = teamscore(state);
    expect(score.onderdelen.find((o) => o.id === "besluit")).toBeUndefined();
  });
});
