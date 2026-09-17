# Vis data på kort

Grundet brugen af OpenStreetMap-kort skal tjenesterne køres via en webserver.
Det er nødvendigt, for at browseren sender den krævede `Referer`-header med
forespørgslerne.

## Tjenester

### `datafordeler-viewer`

En statisk HTML- og JavaScript-udgave, der slår data op i Datafordeleren i
stedet for DAWA. Angiv token i `config.json`, og servér derefter mappen fra en
webserver.

Denne udgave er en startadapter og er ikke en fuld 1:1-erstatning for alle
DAWA-services. Tokenet i `config.json` er synligt for klienterne og bør derfor
begrænses til en passende klient- eller brugeradgang.

### `static-dawa`

En statisk HTML- og JavaScript-udgave af den oprindelige visning. Den bruger
DAWA som datakilde og kan køres uden Node, installation eller build-trin.
URL-parametre angives efter `#`, eksempelvis:

```text
/#vejstykker?kommunekode=0101
```

Mappen skal blot serveres fra en webserver.

## Redirect

Da URL-parametrene nu angives efter `#`, kan det give mening at konfigurere webserveren til at viderestille requests til ressourcer, der ikke findes (fx `/vejstykker?kommunekode=0101`) til samme sti, blot med `#` foran (fx til `#/vejstykker?kommunekode=0101`). Dette vil gøre det lettere at videreføre legacy-requests.


## Oprindelig tjeneste

`vis2.aws.dk` er forældet, men den oprindelige kode er grundlaget for de to
nye tjenester ovenfor.

Den oprindelige Node-tjeneste kan fortsat bygges og startes sådan:

```text
npm run build
node index.js {kortforsyningsbruger} {password} {port}
```

## Udarbejdelse

Tjenesterne er lavet ved hjælp af GitHub Copilot og GPT-5.6 Luna.