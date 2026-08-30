import { describe, expect, it } from "vitest";
import { regel, veld } from "../csv";

/**
 * Het escapepatroon is precies waar een CSV onopgemerkt stukgaat: een titel met een komma erin
 * (heel gewoon in een use-casenaam) schuift zonder aanhalingstekens alle kolommen daarna op.
 */
describe("veld", () => {
  it("laat gewone tekst en getallen ongemoeid", () => {
    expect(veld("Proactieve statusupdates")).toBe("Proactieve statusupdates");
    expect(veld(42)).toBe("42");
    expect(veld(0)).toBe("0");
  });

  it("maakt van null en undefined een lege cel, geen letterlijke tekst", () => {
    expect(veld(null)).toBe("");
    expect(veld(undefined)).toBe("");
  });

  it("zet tekst met een komma tussen aanhalingstekens", () => {
    expect(veld("Meldingen, klachten en vragen")).toBe('"Meldingen, klachten en vragen"');
  });

  it("verdubbelt aanhalingstekens binnen de tekst en omsluit het geheel", () => {
    expect(veld('De "snel doen"-quadrant')).toBe('"De ""snel doen""-quadrant"');
  });

  it("zet tekst met een regeleinde tussen aanhalingstekens", () => {
    expect(veld("Eerste regel\nTweede regel")).toBe('"Eerste regel\nTweede regel"');
  });
});

describe("regel", () => {
  it("voegt velden samen met komma's en sluit af met CRLF", () => {
    expect(regel(["a", "b", 3])).toBe("a,b,3\r\n");
  });

  it("een use case met een komma in de titel schuift latere kolommen niet op", () => {
    // Zonder aanhalingstekens rond het eerste veld zou een simpele CSV-lezer dit als vier
    // kolommen inlezen in plaats van drie; met de quoting blijft het er drie.
    expect(regel(["Meldingen, klachten en vragen", "klantbeheer", 5])).toBe(
      '"Meldingen, klachten en vragen",klantbeheer,5\r\n',
    );
  });
});
