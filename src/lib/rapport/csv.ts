import { domein as coraDomein, organisatie, rolNaam } from "@/lib/content";
import { alleBeelden, portfolio } from "@/lib/sessie/afgeleid";
import type { SessieState } from "@/lib/supabase/types";

/**
 * Het rapport als spreadsheet: portfolio, business cases en roadmap, elk als eigen sectie in
 * één CSV. Geen aparte bestanden of een .xlsx-bibliotheek — één downloadknop, en Excel opent een
 * CSV met lege regels tussen de secties net zo goed als drie tabbladen.
 *
 * Bedragen en scores gaan er als kale getallen in, niet als de opgemaakte weergave uit het
 * rapport (€-teken, liggend streepje in een bandbreedte): dat is precies wat onbruikbaar is
 * zodra iemand er in Excel mee wil rekenen.
 */

/** Los getest in __tests__/csv.test.ts: het escapepatroon is precies waar CSV op stukloopt. */
export function veld(waarde: string | number | null | undefined): string {
  if (waarde === null || waarde === undefined) return "";
  const tekst = String(waarde);
  // Alles met een komma, aanhalingsteken of regeleinde tussen aanhalingstekens, met interne
  // aanhalingstekens verdubbeld — het standaard CSV-escapepatroon.
  return /[",\r\n]/.test(tekst) ? `"${tekst.replace(/"/g, '""')}"` : tekst;
}

export function regel(velden: (string | number | null | undefined)[]): string {
  return velden.map(veld).join(",") + "\r\n";
}

export function genereerRapportCsv(state: SessieState): string {
  const org = organisatie(state.sessie.organisatie_id);
  const alles = alleBeelden(state);
  const inPortfolio = portfolio(state);

  let csv = "";

  csv += regel([`Use-caseportfolio ${org.naam}`, state.sessie.titel]);
  csv += regel([]);

  // --- Portfolio -------------------------------------------------------------
  csv += regel(["Portfolio"]);
  csv += regel([
    "Titel",
    "Domein",
    "Status",
    "Waardemodus",
    "Waarde (1-5)",
    "Haalbaarheid (1-5)",
    "Netto baat laag (EUR/jr)",
    "Netto baat verwacht (EUR/jr)",
    "Netto baat hoog (EUR/jr)",
    "Doorrekening volledig",
    "Toegekend budget (EUR)",
    "Toegekend capaciteit (mensmaanden)",
    "Benodigde data",
    "Aandachtspunten",
  ]);
  for (const beeld of alles) {
    const allocatie = state.allocaties.find((a) => a.usecase_id === beeld.usecase.id);
    csv += regel([
      beeld.usecase.titel,
      coraDomein(beeld.usecase.domein)?.naam ?? beeld.usecase.domein,
      beeld.usecase.status,
      beeld.waardering?.modus ?? "",
      beeld.positie?.waarde ?? "",
      beeld.positie?.haalbaarheid ?? "",
      beeld.businessCase?.netto_baat?.laag ?? "",
      beeld.businessCase?.netto_baat?.verwacht ?? "",
      beeld.businessCase?.netto_baat?.hoog ?? "",
      beeld.businessCase ? (beeld.businessCase.volledig ? "ja" : "nee") : "",
      allocatie?.geld_eur ?? "",
      allocatie?.capaciteit_mensmaanden ?? "",
      beeld.usecase.benodigde_data.join("; "),
      beeld.usecase.aandachtspunten.join("; "),
    ]);
  }
  csv += regel([]);

  // --- Business cases ----------------------------------------------------------
  // Eén rij per driver, niet per use case: dat is het niveau waarop de aannames staan die je in
  // Excel wilt kunnen narekenen.
  csv += regel(["Business cases"]);
  csv += regel([
    "Titel",
    "Driver",
    "Status",
    "Jaarlijkse baat (EUR)",
    "Ontbrekende velden",
    "Jaarlijkse kosten (EUR)",
    "Eenmalige kosten (EUR)",
    "Terugverdientijd (maanden)",
  ]);
  for (const beeld of inPortfolio) {
    if (!beeld.businessCase) continue;
    for (const driver of beeld.businessCase.drivers) {
      csv += regel([
        beeld.usecase.titel,
        driver.type,
        driver.status,
        driver.status === "berekend" ? driver.jaarlijkse_baat : "",
        driver.status === "onbekend" ? driver.ontbrekende_velden.join("; ") : "",
        beeld.businessCase.kosten.jaarlijks,
        beeld.businessCase.kosten.eenmalig,
        beeld.businessCase.terugverdientijd_maanden ?? "",
      ]);
    }
  }
  csv += regel([]);

  // --- Roadmap -------------------------------------------------------------
  csv += regel(["Roadmap"]);
  csv += regel([
    "Horizon",
    "Titel",
    "Netto baat verwacht (EUR/jr)",
    "Randvoorwaarden",
    "Afhankelijk van",
  ]);
  for (const item of [...state.roadmap].sort((a, b) => a.volgorde - b.volgorde)) {
    const beeld = alles.find((b) => b.usecase.id === item.usecase_id);
    if (!beeld) continue;
    const afhankelijkheden = item.afhankelijk_van
      .map((id) => alles.find((b) => b.usecase.id === id)?.usecase.titel)
      .filter((titel): titel is string => Boolean(titel));
    csv += regel([
      item.horizon,
      beeld.usecase.titel,
      beeld.businessCase?.netto_baat?.verwacht ?? "",
      item.randvoorwaarden,
      afhankelijkheden.join("; "),
    ]);
  }
  csv += regel([]);

  // --- Deelnemers ------------------------------------------------------------
  csv += regel(["Deelnemers"]);
  csv += regel(["Naam", "Rol"]);
  for (const deelnemer of state.deelnemers) {
    csv += regel([deelnemer.naam, rolNaam(deelnemer.rol_id)]);
  }

  return csv;
}

/**
 * Triggert een download in de browser. Geen library nodig: een Blob-URL en een onzichtbare
 * `<a download>` is het standaardpatroon hiervoor.
 */
export function downloadCsv(bestandsnaam: string, inhoud: string): void {
  // BOM vooraan, anders opent Excel de accenten (é, €) in Nederlandse tekst als rommel.
  const blob = new Blob(["﻿" + inhoud], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = bestandsnaam;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
