import { describe, expect, it } from "vitest";
import {
  bandbreedte,
  bepaalKwadrant,
  bepaalPositie,
  berekenBudgetStand,
  berekenBusinessCase,
  berekenDriver,
  BEREKENINGEN,
  gemiddeldeScore,
  STANDAARD_BANDBREEDTE_PCT,
} from "../berekening";
import { waardeModel } from "@/lib/content";

describe("berekenDriver", () => {
  it("rekent een tijdsbesparing door", () => {
    // 10.000 keer per jaar, 6 minuten, 25% reductie, 60 euro per uur
    // = 10000 * 0,1 uur * 0,25 * 60 = 15.000 euro
    const uitkomst = berekenDriver({
      type: "tijdsbesparing",
      waarden: { volume_per_jaar: 10000, minuten_per_geval: 6, reductie_pct: 25, uurtarief: 60 },
    });
    expect(uitkomst.status).toBe("berekend");
    if (uitkomst.status === "berekend") expect(uitkomst.jaarlijkse_baat).toBeCloseTo(15000);
  });

  it("rekent leegstandsreductie door", () => {
    // 18.000 mutaties * 10 dagen * 10% * 15 euro = 270.000 euro
    const uitkomst = berekenDriver({
      type: "leegstandsreductie",
      waarden: {
        mutaties_per_jaar: 18000,
        leegstandsdagen_per_mutatie: 10,
        reductie_pct: 10,
        dagopbrengst: 15,
      },
    });
    expect(uitkomst.status).toBe("berekend");
    if (uitkomst.status === "berekend") expect(uitkomst.jaarlijkse_baat).toBeCloseTo(270000);
  });

  it("meldt een ontbrekend veld in plaats van er nul van te maken", () => {
    const uitkomst = berekenDriver({
      type: "tijdsbesparing",
      waarden: { volume_per_jaar: 10000, minuten_per_geval: 6, reductie_pct: null, uurtarief: 60 },
    });
    expect(uitkomst.status).toBe("onbekend");
    if (uitkomst.status === "onbekend") expect(uitkomst.ontbrekende_velden).toEqual(["reductie_pct"]);
  });

  it("behandelt NaN en Infinity als ontbrekend", () => {
    const uitkomst = berekenDriver({
      type: "dervingsreductie",
      waarden: { huidige_post_per_jaar: Number.NaN, reductie_pct: Number.POSITIVE_INFINITY },
    });
    expect(uitkomst.status).toBe("onbekend");
    if (uitkomst.status === "onbekend") {
      expect(uitkomst.ontbrekende_velden).toEqual(["huidige_post_per_jaar", "reductie_pct"]);
    }
  });
});

describe("bandbreedte", () => {
  it("houdt laag onder verwacht onder hoog", () => {
    const band = bandbreedte(100000);
    expect(band.laag).toBeLessThan(band.verwacht);
    expect(band.verwacht).toBeLessThan(band.hoog);
    expect(band.laag).toBeCloseTo(100000 * (1 - STANDAARD_BANDBREEDTE_PCT / 100));
    expect(band.hoog).toBeCloseTo(100000 * (1 + STANDAARD_BANDBREEDTE_PCT / 100));
  });

  it("levert bij nul onzekerheid drie gelijke waarden", () => {
    const band = bandbreedte(50000, 0);
    expect(band.laag).toBe(band.verwacht);
    expect(band.hoog).toBe(band.verwacht);
  });
});

describe("berekenBusinessCase", () => {
  const kosten = { eenmalig: 100000, jaarlijks: 20000, capaciteit: 4 };

  it("telt meerdere drivers op en trekt de jaarlijkse kosten eraf", () => {
    const bc = berekenBusinessCase(
      [
        {
          type: "tijdsbesparing",
          waarden: { volume_per_jaar: 10000, minuten_per_geval: 6, reductie_pct: 25, uurtarief: 60 },
        },
        { type: "dervingsreductie", waarden: { huidige_post_per_jaar: 100000, reductie_pct: 10 } },
      ],
      kosten,
    );
    expect(bc.volledig).toBe(true);
    expect(bc.bruto_baat?.verwacht).toBeCloseTo(25000);
    expect(bc.netto_baat?.verwacht).toBeCloseTo(5000);
    expect(bc.netto_baat!.laag).toBeLessThan(bc.netto_baat!.verwacht);
    expect(bc.netto_baat!.verwacht).toBeLessThan(bc.netto_baat!.hoog);
  });

  it("markeert de case als onvolledig maar rekent de bruikbare drivers wel door", () => {
    const bc = berekenBusinessCase(
      [
        {
          type: "tijdsbesparing",
          waarden: { volume_per_jaar: 10000, minuten_per_geval: 6, reductie_pct: 25, uurtarief: 60 },
        },
        { type: "dervingsreductie", waarden: { huidige_post_per_jaar: 100000 } },
      ],
      kosten,
    );
    expect(bc.volledig).toBe(false);
    expect(bc.ontbrekende_velden).toContain("dervingsreductie.reductie_pct");
    expect(bc.bruto_baat?.verwacht).toBeCloseTo(15000);
  });

  it("geeft geen bedrag terug als geen enkele driver compleet is", () => {
    const bc = berekenBusinessCase([{ type: "tijdsbesparing", waarden: {} }], kosten);
    expect(bc.bruto_baat).toBeNull();
    expect(bc.netto_baat).toBeNull();
    expect(bc.terugverdientijd_maanden).toBeNull();
  });

  it("berekent geen terugverdientijd bij een negatieve netto baat", () => {
    const bc = berekenBusinessCase(
      [{ type: "dervingsreductie", waarden: { huidige_post_per_jaar: 50000, reductie_pct: 10 } }],
      kosten,
    );
    expect(bc.netto_baat!.verwacht).toBeLessThan(0);
    expect(bc.terugverdientijd_maanden).toBeNull();
  });

  it("rekent de terugverdientijd in maanden", () => {
    const bc = berekenBusinessCase(
      [{ type: "extra_opbrengst", waarden: { extra_eenheden: 100, jaaropbrengst_per_eenheid: 1200 } }],
      { eenmalig: 100000, jaarlijks: 20000, capaciteit: 2 },
    );
    // bruto 120.000, netto 100.000, eenmalig 100.000 => 12 maanden
    expect(bc.terugverdientijd_maanden).toBeCloseTo(12);
  });
});

describe("budget", () => {
  const budget = { geld_eur: 1000000, verandercapaciteit_mensmaanden: 24 };

  it("houdt besteed en resterend bij", () => {
    const stand = berekenBudgetStand(budget, [
      { usecase_id: "a", geld_eur: 300000, capaciteit_mensmaanden: 6 },
      { usecase_id: "b", geld_eur: 200000, capaciteit_mensmaanden: 4 },
    ]);
    expect(stand.besteed.geld_eur).toBe(500000);
    expect(stand.resterend.verandercapaciteit_mensmaanden).toBe(14);
    expect(stand.overschreden).toEqual({ geld: false, capaciteit: false });
  });

  it("signaleert geld en capaciteit onafhankelijk van elkaar", () => {
    const stand = berekenBudgetStand(budget, [
      { usecase_id: "a", geld_eur: 100000, capaciteit_mensmaanden: 30 },
    ]);
    expect(stand.overschreden.geld).toBe(false);
    expect(stand.overschreden.capaciteit).toBe(true);
    expect(stand.resterend.verandercapaciteit_mensmaanden).toBeLessThan(0);
  });
});

describe("positie en kwadrant", () => {
  it("plaatst een use case zonder euro's toch op de matrix via kwalitatieve waarde", () => {
    const positie = bepaalPositie({
      businessCase: null,
      hoogsteNettoBaatInSessie: null,
      kwalitatief: { huurderswaarde: 5, maatschappelijk: 5, compliance: 4 },
      haalbaarheid: { databeschikbaarheid: 4, technische_complexiteit: 4 },
    });
    expect(positie).not.toBeNull();
    expect(positie!.waarde).toBeGreaterThan(3);
    expect(bepaalKwadrant(positie!)).toBe("quick-wins");
  });

  it("geeft null als er niets is ingevuld", () => {
    expect(bepaalPositie({ kwalitatief: {}, haalbaarheid: {} })).toBeNull();
  });

  it("onderscheidt de vier kwadranten", () => {
    expect(bepaalKwadrant({ waarde: 4, haalbaarheid: 4 })).toBe("quick-wins");
    expect(bepaalKwadrant({ waarde: 4, haalbaarheid: 2 })).toBe("strategisch");
    expect(bepaalKwadrant({ waarde: 2, haalbaarheid: 4 })).toBe("vulwerk");
    expect(bepaalKwadrant({ waarde: 2, haalbaarheid: 2 })).toBe("vermijden");
  });
});

describe("gemiddeldeScore", () => {
  it("negeert lege waarden in plaats van ze als nul te tellen", () => {
    expect(gemiddeldeScore({ a: 4, b: null, c: undefined, d: 2 })).toBe(3);
  });

  it("geeft null bij een leeg object", () => {
    expect(gemiddeldeScore({})).toBeNull();
  });
});

describe("content en rekenmotor blijven in de pas", () => {
  it("elk drivertype in de content heeft dezelfde velden als de implementatie", () => {
    for (const dt of waardeModel.drivertypes) {
      const berekening = BEREKENINGEN[dt.id];
      expect(berekening, `geen implementatie voor ${dt.id}`).toBeDefined();
      expect(dt.velden.map((v) => v.id).sort()).toEqual([...berekening.velden].sort());
    }
  });

  it("de rekenmotor bevat geen drivertypes die de content niet kent", () => {
    const contentIds = waardeModel.drivertypes.map((d) => d.id).sort();
    expect(Object.keys(BEREKENINGEN).sort()).toEqual(contentIds);
  });
});
