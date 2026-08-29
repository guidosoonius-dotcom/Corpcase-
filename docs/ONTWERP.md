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

## De gelaagde compositie

Van de drie mockups is *Gelaagd* gekozen. De stapeling leidt: een houtskoolpaneel valt over een
lichte kaart en loopt tegen de schermrand aan, cirkels liggen erachter en worden door de kaartranden
afgesneden, en de hoofdhandeling is een pijl met een klein label in plaats van een knopvlak.

Die stapeling brengt drie regels mee. Ze zijn geen smaak: ze komen alle drie uit een fout die
tijdens het bouwen is gemeten of gezien, en ze staan hier omdat het er goed uitzag toen het fout
was.

### 1. Vol koraal verdraagt geen tekst

Wit haalt op `#E8524A` 3,66, de donkerste inkt 4,44 — allebei onder de norm. De accentcirkel mag
dus alleen in een zone waar geen tekst komt. Waar tekst overheen kan lopen is het de zachte tint,
die inkt (13,5) en inkt-zacht (6,7) ruim draagt.

Twee uitzonderingen, allebei bewust:

- **Het cijfer.** `Cijfer toon="accent"` zet vol koraal op papier (3,43). Dat mag omdat het
  kleinste formaat 30 px is, en daarboven geldt de norm voor grote tekst (3,0). Zakt dat formaat
  ooit, dan moet `Cijfer` naar `accent-diep`.
- **Vlakken zonder tekst**: matrixpunten, voortgangsbalken, de accentcirkel zelf.

Dezelfde rekensom geldt andersom: `text-accent` als **tekstkleur** haalt op papier 3,43. Kleine
tekst in de accentkleur is daarom `accent-diep` (5,54).

Deze regel is met het oog niet te controleren — vol koraal *ziet er gewoon goed uit* — en dat is te
merken: hij zat onder drie geselecteerde filterchipjes en onder zes bijschriften en links van 12 en
14 px. Beide kanten worden daarom getoetst in `src/lib/thema/__tests__/vormgevingsregels.test.ts`,
dat de bronbestanden scant op `bg-accent` met een tekstkleur ernaast, en op `text-accent` zonder
een groot lettergrootte-token in dezelfde klassenlijst.

### 2. Op de zachte tint is `inkt-licht` niet genoeg

Die haalt daar 4,43. Alles wat over een tintvlak kan vallen is `inkt-zacht` (6,65). Dat geldt ook
voor het label onder een cijfer, want een cijferblok valt regelmatig over een cirkel; `Cijfer` zet
dat label daarom zelf al op `inkt-zacht`. Op de beamer is om dezelfde reden alle secundaire tekst
`inkt-zacht`: dat scherm wordt van vier meter afstand gelezen.

### 3. Een overlappende kaart moet inhoud ontzien

In de eerste opzet bedekte het uitkomstpaneel de invoervelden waarin je net stond te typen. De
onderliggende kaart moet ruimte reserveren, en dat mag niet van oplettendheid afhangen: `Kaart`
heeft daarvoor de prop `onderruimte`.

### Twee dingen over de cirkel

De cirkel wordt vanuit de hoek verschoven met een deel van zijn **eigen breedte**, met `translate`
en niet met een procentuele `top`. Een percentage resolveert tegen de hoogte van de container, en
op een lang fasescherm schoof de cirkel daardoor honderden pixels buiten beeld — onzichtbaar, en
niet te zien in de code.

Daarnaast heeft `Cirkel` een `vanBoven`, die de bovenkant van het afsnijvlak verlaagt. Daarmee
blijft de cirkel onder de haarlijnkop of onder de teamscore, in plaats van eronder door te lopen.

## Lettertypen

Playfair Display voor display, Inter voor de rest, allebei via `next/font/google`. Die haalt ze bij
de build binnen en serveert ze vanaf het eigen domein — er gaat dus geen bezoekersdata naar Google.
Voor een corporatie die in deze game zelf over privacy bij huurdersdata praat, is dat geen detail.

## Raakvlakken

De globale regel dat elke knop minstens 44 pixels hoog is, maakte van de matrixpunten strepen. Die
punten zijn daarom een transparante knop van 44 bij 44 met een kleine ronde stip erin: het
raakvlak blijft bruikbaar op een telefoon, en de stip blijft een stip.
