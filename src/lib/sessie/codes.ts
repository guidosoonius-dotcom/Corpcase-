/**
 * Codes die mensen moeten overtypen of voorlezen in een vergaderzaal.
 *
 * Daarom geen tekens die op elkaar lijken: geen I/1, geen O/0, geen U (klinkt als een letter die
 * je verkeerd verstaat). Wat overblijft is nog steeds ruim genoeg: 6 tekens uit 28 mogelijkheden
 * is meer dan 480 miljoen combinaties.
 */

const TEKENS = "ABCDEFGHJKLMNPQRSTVWXYZ23456789";

function willekeurigeTekens(lengte: number): string {
  const waarden = new Uint32Array(lengte);
  crypto.getRandomValues(waarden);
  return Array.from(waarden, (w) => TEKENS[w % TEKENS.length]).join("");
}

/** Code die deelnemers intypen om mee te doen. */
export function maakJoinCode(): string {
  return willekeurigeTekens(6);
}

/** Code waarmee de facilitator de sessie bestuurt. Langer, want hij lekt makkelijker mee. */
export function maakBeheerCode(): string {
  return willekeurigeTekens(10);
}

/** Geheim per deelnemer, blijft in localStorage staan zodat je je sessie kunt hervatten. */
export function maakToken(): string {
  return crypto.randomUUID();
}

/**
 * Tolerant normaliseren: mensen typen spaties, streepjes en kleine letters.
 *
 * Er wordt niets omgezet naar een ander teken. Het alfabet hierboven bevat geen enkel paar dat
 * op elkaar lijkt, dus een getypte O of 1 kan geen geldige code zijn geweest; die weghalen is
 * eerlijker dan hem naar een willekeurig ander teken te vertalen.
 */
export function normaliseerCode(invoer: string): string {
  return invoer
    .toUpperCase()
    .split("")
    .filter((teken) => TEKENS.includes(teken))
    .join("");
}
