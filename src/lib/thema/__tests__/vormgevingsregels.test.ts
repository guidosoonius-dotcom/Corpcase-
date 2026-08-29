import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Regel 1 uit docs/ONTWERP.md, hier bewaakt in plaats van onthouden.
 *
 * Vol koraal (`bg-accent`) haalt met witte tekst 3,66 en met de donkerste inkt 4,44 — allebei
 * onder de norm. Toch is het de aantrekkelijkste kleur in het palet, en zo belandde hij drie keer
 * onder een geselecteerd filterchipje. Met het oog is dat niet te zien: het ziet er goed uit.
 * Vandaar deze test en niet alleen een regel in de documentatie.
 */

const WORTEL = join(import.meta.dirname, "..", "..", "..");

function tsxBestanden(map: string): string[] {
  return readdirSync(map, { withFileTypes: true }).flatMap((item) => {
    const pad = join(map, item.name);
    if (item.isDirectory()) return tsxBestanden(pad);
    return item.name.endsWith(".tsx") ? [pad] : [];
  });
}

describe("vol koraal draagt geen tekst", () => {
  const bestanden = tsxBestanden(WORTEL);

  it("vindt überhaupt bestanden, anders toetst deze test niets", () => {
    expect(bestanden.length).toBeGreaterThan(10);
  });

  it.each(bestanden.map((p) => [p.slice(WORTEL.length + 1), p] as const))(
    "%s zet geen tekstkleur op bg-accent",
    (_naam, pad) => {
      const inhoud = readFileSync(pad, "utf8");
      // `bg-accent` gevolgd door een tekstkleur binnen dezelfde klassenlijst. De lookahead sluit
      // `bg-accent-sterk`, `-diep`, `-zacht` en `-op-donker` uit: die zijn juist afgeleid om
      // tekst te dragen. Een woordgrens volstaat hier niet, want een koppelteken is er ook een.
      const fout = /bg-accent(?![-\w])[^"'`]*\btext-(white|inkt)(?![-\w])/.exec(inhoud);
      expect(fout?.[0] ?? null).toBeNull();
    },
  );
});

/**
 * Dezelfde regel, andere kant op: `text-accent` is het volle koraal als tékstkleur. Op papier
 * haalt dat 3,43 — genoeg voor grote tekst (norm 3,0), niet voor kleine (norm 4,5). Zo stonden er
 * zes bijschriften en links van 12 en 14 px in een kleur die met het oog gewoon leesbaar oogt.
 * Kleine tekst in de accentkleur hoort `text-accent-diep` te zijn (5,54 op papier).
 */
describe("vol koraal als tekstkleur alleen op grote tekst", () => {
  /** Vanaf text-3xl (30 px) geldt de norm voor grote tekst. */
  const GROOT = /\btext-(3xl|4xl|5xl|6xl|7xl|8xl|9xl)\b/;

  /**
   * `Cijfer` in basis.tsx zet de kleur en het formaat in twee losse tabellen, dus daar staan ze
   * niet in dezelfde klassenlijst. Het kleinste formaat daar is text-3xl; dat is vastgelegd in
   * een commentaar bij de component en in docs/ONTWERP.md.
   */
  const UITGEZONDERD = ["components/basis.tsx"];

  it.each(
    tsxBestanden(WORTEL)
      .map((p) => [p.slice(WORTEL.length + 1), p] as const)
      .filter(([naam]) => !UITGEZONDERD.includes(naam)),
  )("%s zet text-accent alleen op grote tekst", (_naam, pad) => {
    const inhoud = readFileSync(pad, "utf8");
    const klassenlijsten = inhoud.match(/(?<=className=(?:"|'|\{`))[^"'`]*/g) ?? [];
    const fout = klassenlijsten.filter(
      (lijst) => /\btext-accent(?![-\w])/.test(lijst) && !GROOT.test(lijst),
    );
    expect(fout).toEqual([]);
  });
});
