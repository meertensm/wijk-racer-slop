# Wijk Racer

GTA-achtig racen in een cartoonversie van Limburg, gebouwd uit echte kaartdata. Je rijdt in een Fiat Panda Mk1 door straten van OpenStreetMap op het echte AHN-hoogtemodel, tussen beagles, zombies en de "niet poep oprapende labradoodle uitlater". Multiplayer via websocket: iedereen rijdt in dezelfde wereld.

## Vereisten

- Ruby 4 (alleen stdlib, geen gems)
- `vips` (`brew install vips`) voor het lezen van AHN-hoogtebestanden
- Een moderne browser (Chrome of Safari); three.js komt van jsDelivr

## Starten

```bash
bin/serve            # http://localhost:8765, start in Urmond
bin/serve 8765 "Markt 1, Sittard"
```

De server serveert de statische bestanden, de websocket en de wereldtegels vanaf één poort. Bij de eerste start haalt hij de plaatsgrenzen op via Nominatim en genereert hij de negen tegels rond het startadres; daarna staan die in de cache.

Besturing: pijltjes of WASD, Shift = handrem, T = fast travel, Esc = kaart. Klik op je naam linksboven om die te wijzigen.

## Hoe de wereld ontstaat

De wereld is de provincie Limburg, opgedeeld in tegels van 1 km op een vast rooster (oorsprong 50.99 N, 5.825 O). Een tegel wordt pas gemaakt als een speler in de buurt komt:

1. `TileGenerator` haalt per tegel de OSM-data op bij Overpass (gebouwen, wegen, landgebruik, bomen, winkels, plaatsnamen) en de hoogte bij PDOK AHN, als raster van 101 × 101 punten van 10 m.
2. De tegel wordt als JSON in `data/tiles/1/` gezet en aan clients geserveerd via `GET /tiles/1/TX_TZ.json`. Zolang een tegel nog gegenereerd wordt antwoordt de server `202`.
3. De client haalt de 5 × 5 tegels rond de auto op, maakt het terrein af zodra de buren binnen zijn, en bouwt grond, wegen, huizen, bomen en details in kleine stappen per frame. Tegels verder dan drie kilometer worden weer weggegooid.
4. Buiten Limburg is een tegel leeg: daar staat een onzichtbare muur.

Overpass is soms traag of overbelast; een nieuwe tegel duurt 5 tot 60 s. Een gebied vooraf in de cache zetten:

```bash
bin/generate "Markt 1, Roermond" 5     # alle tegels binnen 5 km
bin/tile 3 -2 --seams                  # één tegel plus buren maken en de naden controleren
```

## Server

`server/` is objectgeoriënteerd Ruby: `World`, `Tile`, `Building`, `Road`, `Tree`, `Car`, `Player`, `Poop`, en NPC's als `Zombie < HumanoidNpc < Npc < Entity`. De server is de waarheid: hij simuleert de NPC's van de geladen tegels op 20 Hz, detecteert aanrijdingen, kent coins toe en houdt scores per spelersnaam bij in `data/scores.json`. Clients sturen alleen hun eigen auto en renderen wat ze ontvangen.

Per NPC-klasse (`server/npcs/`) staan gedrag, beloning, dichtheid, stem en zinnen bij elkaar. Voorbeeld: `Beagle::DENSITY = 0.3` zet 30 % van de beagle-plekken aan.

Punten: elke kill is 1 coin, Speakerboy 5, een drol oprapen 0,5; de dubbele combo over de uitlater geeft twee halve coins extra. Een turbo kost 5 coins en een beagle raken zet je score op nul. Alles staat in `Game` en in `REWARD` per NPC-klasse.

Drie kills kort na elkaar maken je gezocht: een politie-Panda (`Politie`, `server/npcs/politie.rb`) verschijnt achter je en jaagt op je met sirene. Sta je langer dan een seconde stil binnen bereik, dan ben je opgepakt en verlies je de helft van je coins. Rij hem 450 m van je af en hij geeft op.

Configuratie in `server/limburg.rb`: startadres, zones per plaatsnaam (welke NPC's waar lopen) en vaste spots zoals de getatoeëerde kale man bij eet.nu.

## Geluid

`assets/sounds/` bevat CC0-opnames van Freesound (motor, remmen, botsing, blaffen, schreeuwen, zombies, hardstyle, intro); de makers staan in `assets/sounds/credits.json`. Ontbreekt een bestand, dan valt het spel terug op Web Audio-synthese.

### Stemmen (Microsoft Azure TTS)

NPC's praten met zinnen uit hun Ruby-klasse. Zonder samples gebruikt de browser zijn eigen spraaksynthese; met samples klinkt het veel beter. Render ze met Azure Speech:

```bash
AZURE_SPEECH_KEY=jouw-sleutel AZURE_SPEECH_REGION=westeurope bin/voices
```

- `AZURE_SPEECH_KEY`: de sleutel van je Azure Speech-resource (Azure Portal → Speech service → Keys and Endpoint). De sleutel wordt alleen als omgevingsvariabele gelezen en nergens opgeslagen.
- `AZURE_SPEECH_REGION`: de regio van die resource, standaard `westeurope`.

Het script schrijft `voice-<kind>-<gender>-<mood>-<n>.mp3` en `scream1-4`, `zombie1-3` naar `assets/sounds/` en slaat bestaande bestanden over. Verander je zinnen in een klasse, verwijder dan de bijbehorende mp3's en draai het script opnieuw. Stemmen: Maarten (man), Fenna (vrouw), Arnaud (Vlaams, voor de Brabanders).

## Data en credits

- Kaartdata: © OpenStreetMap-bijdragers, ODbL, via Overpass.
- Hoogte: AHN (Rijkswaterstaat) via PDOK.
- Plaatsgrenzen en geocoding: Nominatim.
- Laadschermfoto's: Wikimedia Commons, CC BY-SA 4.0 (`assets/intro/credits.json`).
- Geluiden: Freesound, CC0 (`assets/sounds/credits.json`).

`data/` (tegelcache, geocoding-cache, scores) staat niet in git.
