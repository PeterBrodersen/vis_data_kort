# Statisk Datafordeler-visning

Kopiér først `config.example.json` til `config.json`, angiv et token i både
`Datafordeler`- og `Dataforsyningen`-objektet, og servér derefter mappen fra en
webserver. HTML-filen kan ikke åbnes direkte som `file://`, fordi browseren
ellers blokerer indlæsning af `config.json` og kald til API’erne. Start f.eks.
en lokal server i mappen med `python -m http.server 8000` og åbn
`http://localhost:8000/`.

* `/#adgangsadresser?id=0a3f507a-eedb-32b8-e044-0003ba298018` (Sankt Kjelds Plads 11, 2100 København Ø)
* `/#adgangsadresser?postnr=2100`
* `/#adresser?id=0000090e-e9f3-4ffe-a0a5-2852666d158c` (Østre Stationsvej 2F, Odense)
* `/#navngivneveje?q=Rentemestervej`
* `/#navngivneveje/221f77b5-6777-495d-a1a0-97fd22691c9f` (Gammel Kongevej, København)
* `/#vejstykker?id=5c963674-4eae-11e8-93fd-066cff24d637` (Abel Cathrines Gade, København)

Datafordelerens DAR GraphQL returnerer ikke GeoJSON og bruger EPSG:25832. Appen udvælger et begrænset feltudsnit, laver punktdata om til GeoJSON og konverterer koordinaterne til WGS84 til Leaflet. Baggrundskortet bruger Klimadatastyrelsens officielle Mapbox-style med MapLibre GL, så farver, flader, vejhierarki, glyphs og vejnavne bevares. Kortets maksimale zoom er 20, fordi Dataforsyningen ikke leverer tile-matrix over zoom 20; uden et Dataforsyningen-token bruges OpenStreetMap som fallback.

Det er en startadapter, ikke en fuld 1:1-erstatning for alle DAWA-services. Ikke-id-baserede opslag bruger automatisk `virkningstid`, fordi DAR v3 ellers afviser forespørgslen. `postnummer` findes på `DAR_Husnummer`, så postnummeropslag som `postnr=2100` er mulige. `navngivneveje?q=...` er et eksakt vejnavnefilter; fuzzy/q, regex, flere geografiske søgninger og GeoJSON-output har ikke en direkte GraphQL-erstatning. Token i en klienttilgængelig JSON-fil er synlig for brugerne og bør derfor være begrænset til en passende klient/brugeradgang.