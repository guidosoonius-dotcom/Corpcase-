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
