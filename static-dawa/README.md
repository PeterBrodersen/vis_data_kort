# Statisk DAWA-visning

Kopiér først `config.example.json` til `config.json` og angiv et
Dataforsyningen-token. Åbn ikke `index.html` direkte som `file://`, fordi
browseren blokerer `config.json` og API-kald fra den oprindelse. Start f.eks.
`py -m http.server 8000` i mappen og åbn derefter `http://localhost:8000/`.
Eksempler:

* `/#navngivneveje/31ac106c-aaa1-3184-e044-0003ba298018`
* `/#vejstykker?kommunekode=0101`
* `/#adgangsadresser?vejnavn=Roskildevej`
* `/#multi?lag=[{"ressource":"postnumre","parametre":{"nr":"2100"}}]`

URL'en efter `#` omsættes til et kald mod DAWA med `format=geojson`. Baggrundskortet bruger Dataforsyningens officielle Mapbox-style via MapLibre GL, så kortets farver, flader og vejnavne vises korrekt. Kortets maksimale zoom er 20, fordi Dataforsyningen ikke leverer tile-matrix over zoom 20. Der bruges ingen Node-pakker eller build-trin. Hvis DAWA ikke accepterer browserkald fra den valgte host, kræves en proxy.