/**
 * Valideert alle contentbestanden en controleert de kruisverwijzingen ertussen.
 *
 * De zod-schema's bewaken de vorm van elk bestand; dit script bewaakt de samenhang: verwijst een
 * use case naar een bestaand CORA-domein, bestaat elke persona waarnaar verwezen wordt, en heeft
 * elk drivertype in de content ook een implementatie in de rekenmotor.
 *
 * Draai met: npm run content:check
 */
import {
  allePersonaSignalen,
  bibliotheek,
  cora,
  organisaties,
  realiteitschecks,
  rollen,
  rolopdrachten,
  speelmodi,
  uitdagingSignalen,
  waardeModel,
} from "../src/lib/content";
import { BEREKENINGEN } from "../src/lib/waarde/berekening";

const fouten: string[] = [];
const waarschuwingen: string[] = [];

const domeinIds = new Set(cora.domeinen.map((d) => d.id));
const personaIds = new Set(allePersonaSignalen.map((k) => k.id));
const uitdagingIds = new Set(uitdagingSignalen.kaarten.map((k) => k.id));
const rolIds = new Set(rollen.rollen.map((r) => r.id));

// Use cases
const gezienId = new Set<string>();
for (const u of bibliotheek.usecases) {
  if (gezienId.has(u.id)) fouten.push(`Dubbel use case-id: ${u.id}`);
  gezienId.add(u.id);

  if (!domeinIds.has(u.domein)) fouten.push(`${u.id}: onbekend CORA-domein "${u.domein}"`);

  for (const p of u.personas) {
    if (!personaIds.has(p)) fouten.push(`${u.id}: onbekende persona "${p}"`);
  }
  for (const uit of u.uitdagingen) {
    if (!uitdagingIds.has(uit)) fouten.push(`${u.id}: onbekende uitdaging "${uit}"`);
  }

  for (const d of u.drivers) {
    const berekening = BEREKENINGEN[d.type];
    if (!berekening) {
      fouten.push(`${u.id}: drivertype "${d.type}" heeft geen implementatie`);
      continue;
    }
    for (const veld of berekening.velden) {
      if (typeof d.waarden[veld] !== "number") {
        fouten.push(`${u.id}: driver ${d.type} mist veld "${veld}"`);
      }
    }
  }

  if (u.drivers.length === 0) {
    waarschuwingen.push(`${u.id}: geen drivers, alleen kwalitatief te scoren`);
  }
}

// Drivertypes in content moeten één-op-één matchen met de rekenmotor
for (const dt of waardeModel.drivertypes) {
  const berekening = BEREKENINGEN[dt.id];
  if (!berekening) {
    fouten.push(`Drivertype "${dt.id}" staat in drivers.json maar niet in de rekenmotor`);
    continue;
  }
  const contentVelden = dt.velden.map((v) => v.id).sort();
  const codeVelden = [...berekening.velden].sort();
  if (contentVelden.join(",") !== codeVelden.join(",")) {
    fouten.push(
      `Drivertype "${dt.id}": velden lopen uiteen. content=[${contentVelden}] code=[${codeVelden}]`,
    );
  }
}
for (const id of Object.keys(BEREKENINGEN)) {
  if (!waardeModel.drivertypes.some((d) => d.id === id)) {
    fouten.push(`Drivertype "${id}" staat in de rekenmotor maar niet in drivers.json`);
  }
}

// Rolopdrachten: precies één per rol
for (const r of rollen.rollen) {
  const opdrachten = rolopdrachten.opdrachten.filter((o) => o.rol === r.id);
  if (opdrachten.length === 0) fouten.push(`Rol "${r.id}" heeft geen rolopdracht`);
  if (opdrachten.length > 1) fouten.push(`Rol "${r.id}" heeft meer dan één rolopdracht`);
}
for (const o of rolopdrachten.opdrachten) {
  if (!rolIds.has(o.rol)) fouten.push(`Rolopdracht "${o.id}" verwijst naar onbekende rol "${o.rol}"`);
}
for (const r of rollen.rollen) {
  for (const d of r.kijkt_naar) {
    if (!domeinIds.has(d)) fouten.push(`Rol "${r.id}" verwijst naar onbekend domein "${d}"`);
  }
}

// Uitdagingen verwijzen naar bestaande domeinen
for (const k of uitdagingSignalen.kaarten) {
  for (const d of k.domeinen) {
    if (!domeinIds.has(d)) fouten.push(`Uitdaging "${k.id}": onbekend domein "${d}"`);
  }
}

// Speelmodi: genoeg realiteitschecks beschikbaar, horizonnen bestaan
const horizonIds = new Set(speelmodi.horizonnen.map((h) => h.id));
for (const m of speelmodi.modi) {
  if (m.aantal_realiteitschecks > realiteitschecks.checks.length) {
    fouten.push(
      `Speelmodus "${m.id}" vraagt ${m.aantal_realiteitschecks} realiteitschecks, er zijn er ${realiteitschecks.checks.length}`,
    );
  }
  for (const h of m.roadmap_horizonnen) {
    if (!horizonIds.has(h)) fouten.push(`Speelmodus "${m.id}": onbekende horizon "${h}"`);
  }
  if (m.min_signalen_per_speler > m.max_signalen_per_speler) {
    fouten.push(`Speelmodus "${m.id}": min_signalen groter dan max_signalen`);
  }
}

// Organisaties: uitgangspunten waarnaar drivers verwijzen moeten bestaan
for (const org of organisaties) {
  const beschikbaar = new Set([
    ...org.rekenkundige_uitgangspunten.map((u) => u.id),
    ...org.kengetallen.map((k) => k.id),
  ]);
  for (const dt of waardeModel.drivertypes) {
    for (const veld of dt.velden) {
      if (veld.uitgangspunt && !beschikbaar.has(veld.uitgangspunt)) {
        fouten.push(
          `${org.id}: driverveld ${dt.id}.${veld.id} verwijst naar onbekend uitgangspunt "${veld.uitgangspunt}"`,
        );
      }
    }
  }
}

// Dekking: welke domeinen hebben nog geen kaart in de bibliotheek?
const gedekt = new Set(bibliotheek.usecases.map((u) => u.domein));
const ongedekt = cora.domeinen.filter((d) => !gedekt.has(d.id));
if (ongedekt.length > 0) {
  waarschuwingen.push(
    `Geen bibliotheekkaart voor: ${ongedekt.map((d) => d.naam).join(", ")} (spelers kunnen hier alleen een eigen kaart maken)`,
  );
}

// Verificatiestatus zichtbaar maken
const onGeverifieerd = organisaties.flatMap((o) =>
  [...o.kengetallen, ...o.rekenkundige_uitgangspunten].filter((k) => !k.geverifieerd),
);

console.log(`Use cases:            ${bibliotheek.usecases.length}`);
console.log(`CORA-domeinen:        ${cora.domeinen.length} (${gedekt.size} met bibliotheekkaart)`);
console.log(`Signaalkaarten:       ${uitdagingSignalen.kaarten.length + allePersonaSignalen.length} + jaarverslag`);
console.log(`Realiteitschecks:     ${realiteitschecks.checks.length}`);
console.log(`Rollen:               ${rollen.rollen.length}`);
console.log(`Nog te verifiëren:    ${onGeverifieerd.length} cijfers (zie content/BRONNEN.md)`);

if (waarschuwingen.length > 0) {
  console.log("\nWaarschuwingen:");
  for (const w of waarschuwingen) console.log(`  - ${w}`);
}

if (fouten.length > 0) {
  console.error("\nFouten:");
  for (const f of fouten) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("\nContent is consistent.");
