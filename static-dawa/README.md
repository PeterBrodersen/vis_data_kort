# Statisk DAWA-visning

Åbn `index.html` via en statisk webserver. Eksempler:

* `/#navngivneveje/31ac106c-aaa1-3184-e044-0003ba298018`
* `/#vejstykker?kommunekode=0101`
* `/#adgangsadresser?vejnavn=Roskildevej`
* `/#multi?lag=[{"ressource":"postnumre","parametre":{"nr":"2100"}}]`

URL'en efter `#` omsættes til et kald mod DAWA med `format=geojson`. Der bruges ingen Node-pakker eller build-trin. Hvis DAWA ikke accepterer browserkald fra den valgte host, kræves en proxy.