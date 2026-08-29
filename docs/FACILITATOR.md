# Een sessie begeleiden

Praktische handleiding voor wie Corpcase inzet bij een corporatie.

## Vooraf

**Kies de speelduur.** Kort (60–90 min) past in een MT-overleg, halve dag geeft ruimte voor
discussie, hele dag laat je alles doorrekenen. De app past kaartaantallen, verplichte velden en de
investeringsruimte hierop aan.

**Loop de cijfers na.** De DUWO-gegevens komen uit publieke bronnen en zijn nog niet geverifieerd;
de rekenkundige uitgangspunten (uurtarief, dagopbrengst, volumes) zijn aannames. Zie
[`content/BRONNEN.md`](../content/BRONNEN.md). Vervang ze door de echte cijfers van de corporatie
en de sessie wordt meteen een stuk scherper. Dat kan zonder code aan te raken.

**Verdeel de rollen.** Zes rollen, elk met een eigen bril. Zorg dat in elk geval de
informatiemanager en iemand namens de bewoners vertegenwoordigd zijn — dat zijn de twee stemmen
die anders het snelst wegvallen.

**Stuur de link vooraf.** Fase 1 kan asynchroon: deelnemers markeren op hun eigen moment wat ze
herkennen. Dat scheelt in de sessie een half uur en levert een beter startpunt op, omdat mensen
dan niet ter plekke hun eerste gedachte moeten formuleren.

## Tijdens de sessie

Zet het beamerscherm (`/sessie/<id>/scherm`) op de grote schermen. Zelf werk je op
`/sessie/<id>/beheer`; daar staan de join-code, de fasebesturing en het overzicht van waar het
hapert. Bewaar ook de beheercode die daar onder "Beheertoegang" staat — daarmee kom je op een
ander apparaat, in een nieuwe browser, of nadat je een collega het laat overnemen, weer als
facilitator binnen via `/facilitator`. Anders dan de sessiecode is dit geen code om rond te
sturen: wie hem heeft, kan de fase verzetten en de sessie verwijderen.

**Jij zet de gezamenlijke stand.** Deelnemers volgen die automatisch mee, maar kunnen ook zelf
door de fasetabs klikken — vooruitbladeren om te zien wat eraan komt, of terugbladeren naar iets
dat nog niet af is. Wie zichzelf zo voor de groep uit zet, ziet daar een waarschuwing bij op zijn
eigen scherm; op het beheerscherm zie je het bij "Wie is er" terug als een etiket bij hun naam.
Dat is geen storing — vaak is het iemand die alvast rondkijkt — maar bij drie mensen die alle
drie ergens anders zitten, is dat het moment om ze weer bij elkaar te roepen.

Wat op het beheerscherm om aandacht vraagt:

- **Het gesprek is nog smal.** Weinig CORA-domeinen geraakt betekent meestal dat het team praat
  over waar het toch al mee bezig was. Goede interventie: laat de domein-lens openslaan en vraag
  welk domein het meest wordt overgeslagen.
- **Huurderstypen die nergens terugkomen.** Vraag wie er namens die bewoner aan tafel zit.
- **Open hulpvragen.** Lees er één hardop voor. Meestal weet iemand aan tafel het antwoord binnen
  dertig seconden, en dat is precies het moment waarop het spel zijn werk doet.
- **Budget overschreden.** Niet direct corrigeren. Vraag wat er dan afvalt; daar zit het gesprek.

## Drie momenten die het meeste opleveren

1. **De eerste doorrekening.** Zodra er een bedrag met een bandbreedte op het scherm staat, komt
   het gesprek over aannames vanzelf. Laat het team de driverwaarden aanpassen tot ze er zelf
   achter staan — dat invullen ís de oefening, niet de uitkomst.
2. **De realiteitscheck.** Wanneer het budget halveert of de functionaris gegevensbescherming
   bezwaar maakt, blijkt of de prioritering echt gedragen is. Dwing een besluit af: aanpassen of
   onderbouwd handhaven. Niet beslissen is de enige verkeerde uitkomst.
3. **De onthulling van de rolopdrachten.** Elke rol had een geheime opdracht. Als die van de
   informatiemanager niet gehaald is, staan er use cases in het portfolio zonder benoemde
   databron. Dat is geen spelmoment maar een bevinding.

## Na afloop

Het rapport (`/sessie/<id>/rapport`) print je of bewaar je als pdf. Het bevat bewust ook wat er
níét klopt: onvolledige doorrekeningen, een overschreden budget, gemiste huurderstypen en elke
aanname die iemand expliciet heeft gemaakt. Dat is wat het bruikbaar maakt in een RvC-gesprek.

## Als het netwerk het laat afweten

De app kent een offline modus waarin de sessie in het geheugen van de eigen server leeft. Start
hem lokaal met `NEXT_PUBLIC_OPSLAG=lokaal npm run dev` en laat deelnemers via hetzelfde
wifi-netwerk verbinden. Let op: die sessie is weg zodra de server stopt, en werkt alleen als
iedereen dezelfde server gebruikt. Voor een normale sessie is Supabase de bedoelde modus.
