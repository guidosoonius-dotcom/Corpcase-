/**
 * Eenmalig hulpscript: leest de gekloonde ArchiMate-modellen uit
 * `Aedes-datastandaarden/VERA-Domeinmodellen` (MIT-licentie) en dumpt de bedrijfsfuncties en de
 * procesketen-diagrammen naar leesbare JSON, als grondstof voor het handmatig samenstellen van
 * `content/processen/cora-bedrijfsfuncties.json`.
 *
 * Dit script is bewust GEEN onderdeel van de applicatie of van `npm run content:check` — het
 * draait één keer, tegen een lokale clone, en de uitkomst wordt met de hand nagelopen (welke
 * kleur/laan bij welke bedrijfsfunctie hoort staat alleen in de vrije tekst van elk diagram, niet
 * in een machineleesbare relatie) voordat er iets in de contentbibliotheek terechtkomt. Zie het
 * plan-bestand voor de volledige toelichting.
 *
 * Gebruik: npx tsx scripts/vera-import.ts <pad-naar-vera-domeinmodellen-clone> > dump.json
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

type Element = { id: string; tag: string; name: string; documentation?: string };
type Edge = { type: string; name: string; sourceId: string; targetId: string };

function alleXmlBestanden(dir: string): string[] {
  const resultaat: string[] = [];
  for (const naam of readdirSync(dir)) {
    const pad = join(dir, naam);
    const info = statSync(pad);
    if (info.isDirectory()) resultaat.push(...alleXmlBestanden(pad));
    else if (naam.endsWith(".xml") && naam !== "folder.xml") resultaat.push(pad);
  }
  return resultaat;
}

function attribuut(inhoud: string, naam: string): string | undefined {
  const match = inhoud.match(new RegExp(`${naam}="([^"]*)"`));
  return match?.[1];
}

/** Elk element-bestand is klein (één archimate-tag met attributen); simpele regex volstaat. */
function leesElement(pad: string): Element | null {
  const inhoud = readFileSync(pad, "utf-8");
  const tagMatch = inhoud.match(/<archimate:(\w+)/);
  const id = attribuut(inhoud, "id");
  const name = attribuut(inhoud, "name");
  if (!tagMatch || !id || name === undefined) return null;
  const documentation = attribuut(inhoud, "documentation");
  return { id, tag: tagMatch[1], name, documentation };
}

function leesRelatie(pad: string): Edge | null {
  const inhoud = readFileSync(pad, "utf-8");
  const typeMatch = inhoud.match(/archimate:(\w+Relationship)/);
  const sourceMatch = inhoud.match(/<source[^>]*href="[^"#]*#([^"]+)"/);
  const targetMatch = inhoud.match(/<target[^>]*href="[^"#]*#([^"]+)"/);
  if (!typeMatch || !sourceMatch || !targetMatch) return null;
  return {
    type: typeMatch[1],
    name: attribuut(inhoud, "name") ?? "",
    sourceId: sourceMatch[1],
    targetId: targetMatch[1],
  };
}

function main() {
  const bron = process.argv[2];
  if (!bron) {
    console.error("Gebruik: npx tsx scripts/vera-import.ts <pad-naar-clone>");
    process.exit(1);
  }
  const model = join(bron, "model");

  // --- Alle business-elementen, op id ------------------------------------
  const elementen = new Map<string, Element>();
  for (const pad of alleXmlBestanden(join(model, "business"))) {
    const el = leesElement(pad);
    if (el) elementen.set(el.id, el);
  }

  // --- Bedrijfsfuncties: de map die letterlijk zo heet --------------------
  const bedrijfsfuncties = [...elementen.values()]
    .filter((e) => e.tag === "BusinessFunction")
    .sort((a, b) => a.name.localeCompare(b.name));

  // --- Alle relaties tussen business-elementen -----------------------------
  const relaties: Edge[] = [];
  for (const pad of alleXmlBestanden(join(model, "relations"))) {
    const rel = leesRelatie(pad);
    if (rel) relaties.push(rel);
  }
  const triggeringNaarNaam = relaties
    .filter((r) => r.type === "TriggeringRelationship")
    .filter((r) => elementen.has(r.sourceId) && elementen.has(r.targetId))
    .map((r) => ({
      relatie: r.name,
      van: elementen.get(r.sourceId)!.name,
      naar: elementen.get(r.targetId)!.name,
    }));

  // --- Procesketen-diagrammen: viewpoint business_process_cooperation -----
  const diagrammen: {
    naam: string;
    documentatie: string | undefined;
    lanen: { kleur: string; functieVermoeden: string; stappen: string[] }[];
  }[] = [];

  for (const pad of alleXmlBestanden(join(model, "diagrams"))) {
    const inhoud = readFileSync(pad, "utf-8");
    if (!inhoud.includes('viewpoint="business_process_cooperation"')) continue;
    const naam = attribuut(inhoud, "name") ?? pad;
    const documentatie = attribuut(inhoud, "documentation");

    // Elke <children ... fillColor="#.."> met een archimateElement erin is een zichtbare stap.
    // We groeperen op fillColor: dat is de enige machinale aanwijzing voor "dezelfde laan" — welke
    // laan bij welke bedrijfsfunctie hoort staat alleen in de documentatietekst hierboven.
    const stapPerKleur = new Map<string, Set<string>>();
    const stapRegex =
      /<children[^>]*fillColor="([^"]+)"[^>]*>(?:(?!<\/children>)[\s\S])*?<archimateElement\s+xsi:type="archimate:BusinessProcess"\s+href="[^"#]*#([^"]+)"/g;
    let m: RegExpExecArray | null;
    while ((m = stapRegex.exec(inhoud))) {
      const kleur = m[1];
      const id = m[2];
      const naamVanStap = elementen.get(id)?.name;
      if (!naamVanStap) continue;
      if (!stapPerKleur.has(kleur)) stapPerKleur.set(kleur, new Set());
      stapPerKleur.get(kleur)!.add(naamVanStap);
    }

    diagrammen.push({
      naam,
      documentatie,
      lanen: [...stapPerKleur.entries()].map(([kleur, stappen]) => ({
        kleur,
        functieVermoeden: "", // met de hand in te vullen aan de hand van `documentatie`
        stappen: [...stappen],
      })),
    });
  }

  console.log(
    JSON.stringify(
      {
        aantal_bedrijfsfuncties: bedrijfsfuncties.length,
        bedrijfsfuncties: bedrijfsfuncties.map((f) => ({ id: f.id, naam: f.name })),
        aantal_triggering_relaties: triggeringNaarNaam.length,
        triggering: triggeringNaarNaam,
        procesketen_diagrammen: diagrammen,
      },
      null,
      2,
    ),
  );
}

main();
