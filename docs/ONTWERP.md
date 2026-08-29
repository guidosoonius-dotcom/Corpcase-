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

## Iconen

De iconen komen uit Google's Material Symbols (Apache 2.0), maar niet als lettertype: de subset
weegt al snel enkele megabytes voor een handvol glyphs, en `next/font/google` kent het bovendien
niet als gewoon lettertype. In plaats daarvan staan de padgegevens van een klein, met de hand
gekozen setje losse in `src/components/icoon.tsx` — dezelfde constructie als de handgetekende pijl
in `PijlActie` en de halftoon in `decoratie.tsx`. Geen extra verzoek naar Google, geen megabytes
voor een paar honderd bytes aan SVG-paden.

Terughoudend toegepast: een icoon staat er alleen waar het een handeling of status verduidelijkt
die de tekst zelf niet snel genoeg overbrengt — waarschuwen dat je voorloopt op de groep, tonen of
verbergen van de privé-rolopdracht, kopiëren van de uitnodiging, opnieuw meevolgen met de groep.
Geen icoon naast een label dat zichzelf al uitlegt; dat zou de redactionele, tekstgedreven toon
van de rest verstoren.

## Raakvlakken

De globale regel dat elke knop minstens 44 pixels hoog is, maakte van de matrixpunten strepen. Die
punten zijn daarom een transparante knop van 44 bij 44 met een kleine ronde stip erin: het
raakvlak blijft bruikbaar op een telefoon, en de stip blijft een stip.

## Animatie

Drie plekken, met opzet niet meer: een lift en een duik op elk klikbaar element (hover/press,
globaal in `globals.css`), kengetallen die zichtbaar optellen naar hun nieuwe waarde in plaats van
te verspringen (`useTelOp`, in `Cijfer` en de teamscore in `Sessiebalk`), en een heel langzame
ademhaling op de decoratieve cirkels. Verspreid over de hele app in plaats van op één uitgelicht
moment — dat past bij een instrument dat een dagdeel meegaat, niet bij een demo.

**`transform`, nooit de losse eigenschappen `translate`/`scale`/`rotate`.** Tailwind 4 vertaalt
zijn eigen positionerings-utility's (`translate-x-1/3` voor de cirkels, `-translate-x-1/2` voor de
matrixpunten) naar díe losse eigenschappen, niet naar `transform`. Was de hover-lift of de
ademhaling ook met `translate`/`scale` geschreven, dan overschreef hij zonder waarschuwing de
eigen positionering van precies die elementen — de matrixpunten waren van hun plek geschoven bij
elke hover. `transform` raakt geen van beide en telt er zuiver bovenop. Geverifieerd door de
gebouwde CSS na te lezen (`.translate-x-1\/3{translate:var(--tw-translate-x) ...}`) én door een
matrixpunt voor en na een hover op de pixel te vergelijken.

**`useTelOp` telt alleen echte getallen op.** `Cijfer` accepteert ook al opgemaakte tekst (een
bandbreedte als "€ 91.500 – € 208.500"); daar is niets om naartoe te tellen, dus die gaat ongewijzigd
door. De hook regelt `prefers-reduced-motion` zelf met `window.matchMedia`, want de globale
CSS-regel onderaan dit bestand vangt alleen CSS-transities en -animaties af, geen
requestAnimationFrame-lussen.

**De ademhaling staat achter `motion-safe:`**, net als de rest van de bewuste beweging achter de
globale `prefers-reduced-motion`-regel. Wie liever geen beweging ziet, ziet ook deze niet.
