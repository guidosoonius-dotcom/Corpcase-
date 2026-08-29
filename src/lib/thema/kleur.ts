/**
 * Kleurafleiding met gemeten contrast.
 *
 * Een corporatie levert één accentkleur aan. Daar zijn drie varianten van nodig die elk een
 * andere leesbaarheidseis hebben: een vulling waar witte knoptekst op staat, een tint voor kleine
 * tekst op papier, en een tint voor tekst op een donker paneel.
 *
 * Die varianten worden niet met een vast percentage verdonkerd. Dat werkt toevallig bij koraal,
 * maar bij een gele of lichtgroene huisstijl levert het alsnog onleesbare tekst op. In plaats
 * daarvan wordt de lichtheid net zolang verschoven tot de gemeten WCAG-verhouding de drempel
 * haalt. Zo kan iemand die een huisstijlkleur in een JSON zet de interface niet stilletjes
 * onleesbaar maken.
 */

export type Rgb = { r: number; g: number; b: number };
export type Hsl = { h: number; s: number; l: number };

/**
 * De harde eis is 4,5. We mikken hoger, om twee redenen: precies op de grens landen is broos bij
 * afronding en bij de manier waarop schermen kleuren weergeven, en kleine tekst leest op het
 * minimum nog steeds onprettig. Kleine tekst krijgt daarom de meeste marge.
 */
const AA_NORMAAL = 4.5;
const DOEL_VULLING = 4.8;
const DOEL_KLEINE_TEKST = 5.5;
const DOEL_OP_DONKER = 5.0;

export function hexNaarRgb(hex: string): Rgb {
  const schoon = hex.trim().replace("#", "");
  const volledig =
    schoon.length === 3
      ? schoon
          .split("")
          .map((teken) => teken + teken)
          .join("")
      : schoon;

  if (!/^[0-9a-fA-F]{6}$/.test(volledig)) {
    throw new Error(`Geen geldige kleurcode: ${hex}`);
  }

  return {
    r: parseInt(volledig.slice(0, 2), 16),
    g: parseInt(volledig.slice(2, 4), 16),
    b: parseInt(volledig.slice(4, 6), 16),
  };
}

export function rgbNaarHex({ r, g, b }: Rgb): string {
  const deel = (waarde: number) =>
    Math.round(Math.min(Math.max(waarde, 0), 255))
      .toString(16)
      .padStart(2, "0");
  return `#${deel(r)}${deel(g)}${deel(b)}`.toUpperCase();
}

export function rgbNaarHsl({ r, g, b }: Rgb): Hsl {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6;
  else if (max === gg) h = ((bb - rr) / d + 2) / 6;
  else h = ((rr - gg) / d + 4) / 6;

  return { h, s, l };
}

export function hslNaarRgb({ h, s, l }: Hsl): Rgb {
  if (s === 0) {
    const grijs = l * 255;
    return { r: grijs, g: grijs, b: grijs };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const kanaal = (t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  return { r: kanaal(h + 1 / 3) * 255, g: kanaal(h) * 255, b: kanaal(h - 1 / 3) * 255 };
}

/** Relatieve luminantie volgens WCAG 2.1. */
export function luminantie(hex: string): number {
  const { r, g, b } = hexNaarRgb(hex);
  const kanaal = (waarde: number) => {
    const v = waarde / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * kanaal(r) + 0.7152 * kanaal(g) + 0.0722 * kanaal(b);
}

/** Contrastverhouding tussen twee kleuren, 1 (gelijk) tot 21 (zwart op wit). */
export function contrast(voorgrond: string, achtergrond: string): number {
  const a = luminantie(voorgrond);
  const b = luminantie(achtergrond);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function metLichtheid(hex: string, lichtheid: number): string {
  const hsl = rgbNaarHsl(hexNaarRgb(hex));
  return rgbNaarHex(hslNaarRgb({ ...hsl, l: Math.min(Math.max(lichtheid, 0), 1) }));
}

/**
 * Zoekt de variant die het dichtst bij de oorspronkelijke kleur ligt en toch het vereiste
 * contrast haalt. Binaire zoektocht over de lichtheid, met behoud van tint en verzadiging, zodat
 * de kleur herkenbaar blijft als dezelfde huisstijlkleur.
 *
 * `richting` bepaalt of we donkerder of lichter zoeken: donkerder voor tekst op een lichte
 * ondergrond, lichter voor tekst op een donker paneel.
 */
function zoekVariant(
  accent: string,
  achtergrond: string,
  drempel: number,
  richting: "donkerder" | "lichter",
): string {
  if (contrast(accent, achtergrond) >= drempel) return accent.toUpperCase();

  const start = rgbNaarHsl(hexNaarRgb(accent)).l;
  const uiterste = richting === "donkerder" ? 0 : 1;

  // Haalt zelfs het uiterste het niet, dan is er geen variant met deze tint mogelijk.
  if (contrast(metLichtheid(accent, uiterste), achtergrond) < drempel) {
    return metLichtheid(accent, uiterste);
  }

  let dichtbij = start;
  let ver = uiterste;

  // Twintig stappen brengt de lichtheid tot op ruim onder één procent nauwkeurig.
  for (let stap = 0; stap < 20; stap++) {
    const midden = (dichtbij + ver) / 2;
    if (contrast(metLichtheid(accent, midden), achtergrond) >= drempel) {
      ver = midden;
    } else {
      dichtbij = midden;
    }
  }

  return metLichtheid(accent, ver);
}

/** Een zeer lichte tint van de accentkleur, voor achtergrondvlakken. */
function zachteTint(accent: string): string {
  const hsl = rgbNaarHsl(hexNaarRgb(accent));
  return rgbNaarHex(hslNaarRgb({ h: hsl.h, s: Math.min(hsl.s, 0.7), l: 0.94 }));
}

export type Palet = {
  /** De aangeleverde kleur. Alleen voor grote vormen: cijfers, cirkels, matrixpunten. */
  accent: string;
  /** Vulling met witte tekst erop, bijvoorbeeld knoppen. */
  accentSterk: string;
  /** Kleine tekst in de accentkleur op de papieren ondergrond. */
  accentDiep: string;
  /** Tekst in de accentkleur op een houtskoolpaneel. */
  accentOpDonker: string;
  /** Lichte tint voor achtergrondvlakken. */
  accentZacht: string;
};

/** De ondergronden waartegen de varianten gemeten worden. */
export const PAPIER = "#FAF7F3";
export const HOUTSKOOL = "#2B2926";
export const WIT = "#FFFFFF";

/**
 * Leidt het volledige accentpalet af uit één kleur.
 *
 * Elke variant wordt getoetst tegen de ondergrond waarop hij daadwerkelijk komt te staan, niet
 * tegen een aanname. `kleur.test.ts` controleert dat voor elke organisatie in content/.
 */
export { AA_NORMAAL };

export function leidPaletAf(accent: string): Palet {
  const genormaliseerd = rgbNaarHex(hexNaarRgb(accent));

  return {
    accent: genormaliseerd,
    accentSterk: zoekVariant(genormaliseerd, WIT, DOEL_VULLING, "donkerder"),
    accentDiep: zoekVariant(genormaliseerd, PAPIER, DOEL_KLEINE_TEKST, "donkerder"),
    accentOpDonker: zoekVariant(genormaliseerd, HOUTSKOOL, DOEL_OP_DONKER, "lichter"),
    accentZacht: zachteTint(genormaliseerd),
  };
}

/** De variabelen zoals ze op een element gezet worden; de utilities lezen ze via var(). */
export function paletAlsVariabelen(palet: Palet): Record<string, string> {
  return {
    "--color-accent": palet.accent,
    "--color-accent-sterk": palet.accentSterk,
    "--color-accent-diep": palet.accentDiep,
    "--color-accent-op-donker": palet.accentOpDonker,
    "--color-accent-zacht": palet.accentZacht,
  };
}
