import type { Identiteit } from "./soorten";

/**
 * Onthoudt per sessie wie je bent, zodat je je scherm kunt verversen of je telefoon opnieuw kunt
 * pakken zonder opnieuw te joinen. Er zijn geen accounts; dit token ís je toegang.
 */

export type BewaardeIdentiteit = Identiteit & { deelnemerId: string };

function sleutel(sessieId: string): string {
  return `corpcase:sessie:${sessieId}`;
}

export function bewaarIdentiteit(sessieId: string, identiteit: BewaardeIdentiteit): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(sleutel(sessieId), JSON.stringify(identiteit));
  } catch {
    // Privémodus of geblokkeerde opslag: de sessie werkt dan wel, maar overleeft geen refresh.
  }
}

export function leesIdentiteit(sessieId: string): BewaardeIdentiteit | null {
  if (typeof window === "undefined") return null;
  try {
    const ruw = window.localStorage.getItem(sleutel(sessieId));
    if (!ruw) return null;
    const gelezen = JSON.parse(ruw) as BewaardeIdentiteit;
    return gelezen.deelnemerId && gelezen.deelnemerToken ? gelezen : null;
  } catch {
    return null;
  }
}

export function wisIdentiteit(sessieId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(sleutel(sessieId));
  } catch {
    // Zie hierboven.
  }
}

/** Alle sessies waarin deze browser een identiteit heeft; voor een 'verder waar je was'-lijst. */
export function bekendeSessies(): { sessieId: string; identiteit: BewaardeIdentiteit }[] {
  if (typeof window === "undefined") return [];
  const gevonden: { sessieId: string; identiteit: BewaardeIdentiteit }[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const naam = window.localStorage.key(i);
      if (!naam?.startsWith("corpcase:sessie:")) continue;
      const sessieId = naam.slice("corpcase:sessie:".length);
      const identiteit = leesIdentiteit(sessieId);
      if (identiteit) gevonden.push({ sessieId, identiteit });
    }
  } catch {
    return [];
  }
  return gevonden;
}
