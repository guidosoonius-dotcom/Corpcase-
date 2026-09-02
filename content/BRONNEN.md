# Bronnen en verificatiestatus

Dit bestand verantwoordt waar de inhoud van de game vandaan komt en wat nog geverifieerd moet
worden. **Loop dit door vóór de eerste sessie met DUWO.** De game toont bij elk cijfer de bron, en
markeert expliciet wat een aanname is.

## Waarom veel items op `geverifieerd: false` staan

De omgeving waarin deze applicatie is gebouwd heeft een egress-proxy die directe toegang blokkeert
tot `coraveraonline.nl`, `cora.wikixl.nl`, `aedes.nl`, `duwo.nl` en de DUWO-jaarverslag-PDF.
Zoekresultaten waren wel beschikbaar. De cijfers hieronder komen daarom uit
zoekresultaatsamenvattingen van publieke bronnen en zijn niet tegen het originele document
gecontroleerd. Ze zijn bruikbaar als startpunt voor het gesprek, niet als verantwoordingscijfer.

## Te verifiëren vóór gebruik

| Onderwerp | Waarde in de game | Bron | Actie |
|---|---|---|---|
| Aantal eenheden DUWO | ruim 33.000 | DUWO jaarverslag 2024 / duwo.nl | Controleer in het jaarverslag |
| Verhuizingen per jaar | circa 18.000 | duwo.nl nieuwsbericht | Controleer; bepaalt de grootste driver in het model |
| Studenten in werkgebied | 126.000 (was 127.500) | DUWO jaarverslag 2024 | Controleer |
| Tekort in werkgebied | 3.600 eenheden | DUWO jaarverslag 2024 | Controleer |
| Behoefte 2029 | 50.000 eenheden | duwo.nl | Controleer |
| Woonbeleving | 7,2 gemiddeld, elke locatie ≥ 7,1 | Woonbelevingsonderzoek 2024 | Controleer |
| Groeiambitie Den Haag | 5.000 eenheden | DUWO jaarverslag 2024 | Controleer |
| CORA-hoofdbedrijfsfuncties | 18 domeinen in `content/cora/domeinen.json` | CORA 5 bedrijfsfunctiemodel | Controleer exacte benamingen tegen coraveraonline.nl |
| CORA-bedrijfsfuncties | 25 functies in `content/processen/cora-bedrijfsfuncties.json` | `Aedes-datastandaarden/VERA-Domeinmodellen` op GitHub (MIT-licentie), map `model/business/*/Bedrijfsfuncties`, uitgelezen met `scripts/vera-import.ts` | Vervangt de twee eerder gebruikte screenshots. `groep` is onze eigen thematische clustering van deze 25 functies, geen letterlijk CORA-plaat-kader. Van vier functies is `stappen_voorzet` gevuld, elk afgeleid uit een procesketen-diagram in dezelfde bron: `onderhoudsfunctie` (18 stappen, "Onderhouden Eenheden"), `woonruimteverdeelfunctie` (11 stappen, "Woonruimteverdeling"), `incassofunctie` (8 stappen, "Incasso") en `kwaliteitsmanagementfunctie` (7 stappen, "Kwaliteitsmanagement") — elk diagram is zelf een netwerk van meerdere rollen, teruggebracht tot één representatief hoofdpad; zie de `opmerking` per functie. Van de overige 20 functies bevat de bron ofwel geen procesketen-diagram, ofwel alleen een architectuur-contextplaat zonder stapdetail, ofwel staan de stappen al verwerkt in een van de bovenstaande ketens — elk met een eigen `opmerking` die dat toelicht in plaats van te gokken. |
| CORA-bedrijfsfuncties — tweede bron | `vastgoedverhuurfunctie` (5 stappen) | coraveraonline.nl, de officiële CORA-wiki beheerd door CorpoNet (CC BY 4.0), bedrijfsproces "Verhuren eenheden": `https://www.coraveraonline.nl/index.php/Id-9b7ea443-b993-0810-2f0b-e0b18776d83c` | Deze functie stond leeg omdat het VERA-Domeinmodellen-diagram "Verhuren Eenheden" zelf te dun was. coraveraonline.nl geeft ditzelfde bedrijfsproces een detailpagina met, naast een niet-uitleesbaar SVG-volgordediagram, wél een expliciete `TriggeringRelationship` ("Werven en selecteren kandidaten leidt tot Verhuren eenheden") en Werkproces-beschrijvingen met een eigen precondition-zin — samen genoeg om zonder gokken een keten te bouwen; zie de `opmerking` bij deze functie voor de precieze redenering. De bredere pagina `/index.php/Bedrijfsprocessen` (~70 bedrijfsprocessen, alfabetisch, doorklikbaar) is ook geraadpleegd: dat is een ander detailniveau dan onze 25 bedrijfsfuncties (het niveau van VERA-Domeinmodellen's 32 `BusinessProcess`-elementen) en bevestigt vooral namen die al bekend waren. `WebFetch` op dit domein is egress-blocked (zie hierboven); geraadpleegd via Tavily-extractie. Voor de overige 20 lege functies leverde deze bron geen vergelijkbaar sterke tekstuele aanwijzing op, dus die blijven ongewijzigd. |
| Domein per bedrijfsfunctie | elke functie hangt aan één van de 18 domeinen | eigen vertaling | Dit is **onze** koppeling, geen uitspraak van CORA. Loop hem na met iemand die het model kent; vooral VvE-beheer en "Beheren energielabels" zijn keuzes waar meer op valt af te dingen |
| Accentkleur DUWO | `#E8524A` (koraal) | voorlopig gekozen | Vervang door de huisstijlkleur van DUWO; `duwo.nl` was vanuit de bouwomgeving niet bereikbaar. Eén hex volstaat, de rest wordt afgeleid |
| VERA-objectnamen | gebruikt als "benodigde data" per use case | VERA-standaard, Aedes Datastandaarden | Controleer of de gehanteerde termen aansluiten |

## Zuivere aannames (geen bron, bewust ingevuld)

Deze staan in `content/organisaties/duwo.json` onder `rekenkundige_uitgangspunten` en zijn door de
facilitator per sessie aanpasbaar. Ze zijn gekozen op plausibele ordegrootte, niet op DUWO-cijfers:

- Intern uurtarief all-in: € 65/uur
- Gemiddelde maandhuur per eenheid: € 450 → € 15 gederfde opbrengst per leegstandsdag
- Leegstandsdagen per mutatie: 10
- Reparatieverzoeken per jaar: 25.000
- Klantcontacten per jaar: 120.000
- Inkoopfacturen per jaar: 40.000
- Jaarlijkse huurderving door achterstand en oninbaarheid: € 1.500.000
- Investeringsruimte: € 1.500.000 en 36 mensmaanden verandercapaciteit per jaar

Alle voorgevulde driverwaarden in `content/usecases/bibliotheek.json` zijn eveneens aannames op
ordegrootte. Ze bestaan om het gesprek te starten — het invullen van de echte waarde ís de
oefening.

## Geraadpleegde publieke bronnen

- CORA — Woningcorporatie Referentiearchitectuur: https://www.coraveraonline.nl/index.php/Bedrijfsfuncties
- VERA-standaard, Aedes Datastandaarden: https://aedes.nl/datastandaarden/vera-standaard
- Datastandaarden in de corporatiesector, Aedes: https://aedes.nl/datastandaarden/datastandaarden-de-corporatiesector
- Aedes-benchmark 2025, belangrijkste resultaten: https://aedes.nl/aedes-benchmark/aedes-benchmark-2025-belangrijkste-resultaten
- DUWO jaarverslag 2024: https://view.publitas.com/cfreport/duwo-jaarverslag-2024
- DUWO — behoefte 50.000 eenheden in 2029: https://www.duwo.nl/over-duwo/duwo-nieuws/het-laatste-nieuws/nieuwsbericht/in-2029-behoefte-van-50000-eenheden-in-werkgebied-duwo
- DUWO Woonbelevingsonderzoek 2024: https://www.duwo.nl/over-duwo/duwo-nieuws/het-laatste-nieuws/nieuwsbericht/woonbelevingsonderzoek-2024-bewoners-geven-duwo-gemiddeld-een-72

## Eigen data toevoegen

De contentbestanden staan los van de code. Om eigen use cases of corporatiedata te gebruiken:
vervang of vul aan in `content/`, draai `npm run content:check` om te valideren en daarna
`npm run seed`. Er hoeft geen regel code aangepast te worden.
