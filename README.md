# Corpcase

Serious business game waarmee bestuur en management van een woningcorporatie door de ogen van het
eigen jaarverslag, de eigen huurders en de eigen uitdagingen tot use cases komen — en die
vervolgens waarderen, prioriteren en op een roadmap zetten.

De game doorloopt vijf fases: **verkennen → identificatie → waardebepaling → prioritering →
roadmap**, en eindigt in een deelbaar rapport. Meerdere spelers spelen samen: één teamscore, geen
ranglijst tussen collega's.

DUWO is de eerste voorbeeldcorporatie.

## Opzet

| Map | Inhoud |
|---|---|
| `content/` | De inhoudelijke bibliotheek: corporatieprofiel, signaalkaarten, use cases, waardemodel, spelinstellingen. Bewerkbaar zonder één regel code. |
| `src/lib/content/` | Zod-schema's en de loader die de content valideert bij het inlezen. |
| `src/lib/waarde/` | De rekenmotor voor business cases, scorekaarten, matrix en budget. |
| `src/app/` | De Next.js-applicatie: spelerview (telefoon), facilitator, beamerview, rapport. |

## Content aanpassen

De contentbestanden staan bewust los van de code, zodat eigen use cases of corporatiedata er zo in
kunnen. Na een wijziging:

```bash
npm run content:check   # valideert vorm én kruisverwijzingen tussen de bestanden
```

Zie [`content/BRONNEN.md`](content/BRONNEN.md) voor de herkomst van elk cijfer en wat nog
geverifieerd moet worden. Elk kengetal draagt zijn eigen bron en een `geverifieerd`-vlag; de game
toont die en presenteert nooit een aanname als feit.

## Twee ontwerpregels in de rekenmotor

1. **Een ontbrekende invoer wordt nooit stilzwijgend nul.** De uitkomst is dan `onbekend`, met de
   namen van de velden die missen. Een business case die stil 0 euro toont is gevaarlijker dan geen
   business case.
2. **Elke uitkomst is een bandbreedte** (laag / verwacht / hoog). Eén hard getal suggereert een
   precisie die er niet is en kost geloofwaardigheid aan de bestuurstafel.

## Ontwikkelen

```bash
npm install
npm run dev            # http://localhost:3000
npm run content:check  # contentvalidatie
npm test               # unittests op de rekenmotor
npm run lint
npm run build
```
