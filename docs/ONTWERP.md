# Vormgeving

De game is een instrument dat een dagdeel op tafel ligt bij een bestuur of MT. Het moet er dus
uitzien als iets waar je tijd aan wijdt, niet als een intern formulier. De vormtaal is redactioneel:
warm papier, één accentkleur, een display-serif tegenover kleine schreefloze tekst, en spaarzaam een
houtskoolpaneel op de plek waar de beslissing valt.

## Eén kleur per corporatie, de rest afgeleid

Een corporatieprofiel levert **één** hex in `content/organisaties/<naam>.json`:

```json
"thema": { "accent": "#E8524A", "bron": "…", "geverifieerd": false }
```

`src/lib/thema/kleur.ts` leidt daaruit vier varianten af, elk gemeten tegen de ondergrond waarop
hij daadwerkelijk komt te staan:

| Variant | Waarvoor | Eis |
|---|---|---|
| `accent` | grote vormen: cijfers, cirkels, matrixpunten | geen (haalt bewust niet de norm voor kleine tekst) |
| `accent-sterk` | knopvullingen met witte tekst | ≥ 4,5 met wit erop |
| `accent-diep` | kleine tekst in de accentkleur op papier | ≥ 4,5 op papier |
| `accent-op-donker` | tekst op een houtskoolpaneel | ≥ 4,5 op houtskool |

De afleiding verschuift de lichtheid net zolang tot de **gemeten** verhouding de drempel haalt,
in plaats van een vast percentage te verdonkeren. Dat verschil telt: een vast percentage werkt
toevallig bij koraal, maar zou bij een geel of lichtgroen logo alsnog onleesbare knoptekst
opleveren. Er wordt bovendien hoger gemikt dan het minimum, omdat precies op 4,5 landen broos is
en kleine tekst op het minimum nog steeds onprettig leest.

`src/lib/thema/__tests__/kleur.test.ts` toetst dit voor elke organisatie in `content/` én voor een
aantal lastige vertrekpunten (fel geel, lichtgroen, wit, zwart). Zet iemand een huisstijlkleur in
een JSON die niet werkt, dan valt de test om in plaats van dat de interface stilletjes onleesbaar
wordt.

## Wat waar mag

- **Serif** is voor display: koppen, grote cijfers, de sessietitel. Nooit voor lopende tekst,
  labels of invoervelden.
- **Het felle accent** is voor grote vormen. Kleine tekst in de accentkleur gebruikt `accent-diep`.
- **De sessiecode staat bewust in een monospace**, niet in de display-serif. Die code wordt
  overgetypt, en de hoge contrasten van een serif maken letters juist dubbelzinnig. Het
  code-alfabet zelf sluit al verwarrende tekens uit (geen I/1, geen O/0).
- **Groen betekent waarde, niet accent.** Een negatieve netto baat wordt daarom in de risicokleur
  getoond; anders leest een verliesgevende use case als winst.
- **Eén houtskoolpaneel per scherm**, op de plek waar de beslissing valt: het uitkomstblok bij de
  waardebepaling, de investeringsruimte bij de prioritering, de grote getallen bij de opbrengst,
  en de matrix op de beamer. Geen invoervelden op donker.
- **Decoratie is aria-hidden en verdwijnt bij het printen.** Het rapport blijft licht, want het
  gaat mee naar een RvC-vergadering op papier.

## Lettertypen

Playfair Display voor display, Inter voor de rest, allebei via `next/font/google`. Die haalt ze bij
de build binnen en serveert ze vanaf het eigen domein — er gaat dus geen bezoekersdata naar Google.
Voor een corporatie die in deze game zelf over privacy bij huurdersdata praat, is dat geen detail.

## Raakvlakken

De globale regel dat elke knop minstens 44 pixels hoog is, maakte van de matrixpunten strepen. Die
punten zijn daarom een transparante knop van 44 bij 44 met een kleine ronde stip erin: het
raakvlak blijft bruikbaar op een telefoon, en de stip blijft een stip.
