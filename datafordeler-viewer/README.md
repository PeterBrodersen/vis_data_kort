# Statisk Datafordeler-visning

Kopiér først `config.example.json` til `config.json`, angiv token i den nye
fil, og servér derefter mappen fra en webserver. Eksempler:

* `/#adgangsadresser?postnr=2100`
* `/#adresser?id=...`
* `/#navngivneveje?q=Rentemestervej`
* `/#vejstykker?kommunekode=0101`

Datafordelerens DAR GraphQL returnerer ikke GeoJSON og bruger EPSG:25832. Appen udvælger et begrænset feltudsnit, laver punktdata om til GeoJSON og konverterer koordinaterne til WGS84 til Leaflet.

Det er en startadapter, ikke en fuld 1:1-erstatning for alle DAWA-services. Mapping-dokumentationen angiver blandt andet, at fuzzy/q, regex, flere geografiske søgninger og GeoJSON-output ikke har en direkte GraphQL-erstatning. Token i en klienttilgængelig JSON-fil er synlig for brugerne og bør derfor være begrænset til en passende klient/brugeradgang.