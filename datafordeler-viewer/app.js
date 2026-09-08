(function () {
  'use strict';
  var map = L.map('map').setView([56.1, 10.2], 7), config;
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
  var mappings = { adgangsadresser: 'DAR_Husnummer', adresser: 'DAR_Adresse', navngivneveje: 'DAR_NavngivenVej', vejstykker: 'DAR_NavngivenVejKommunedel' };
  var fields = { DAR_Husnummer: 'id_lokalId adgangsadressebetegnelse status adgangspunkt { id_lokalId position { x y } } vejpunkt { id_lokalId position { x y } }', DAR_Adresse: 'id_lokalId adressebetegnelse status', DAR_NavngivenVej: 'id_lokalId vejnavn status vejnavnebeliggenhed_vejnavnelinje vejnavnebeliggenhed_vejnavneomraade vejtilslutningspunkter', DAR_NavngivenVejKommunedel: 'id_lokalId vejkode kommune { kode navn } status' };
  function status(message) { document.getElementById('status').textContent = message; }
  function escapeHtml(text) { var replacements = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }; return text.replace(/[&<>"']/g, function (character) { return replacements[character]; }); }
  function request() { var value = location.hash.slice(1), question = value.indexOf('?'); return { path: (question < 0 ? value : value.slice(0, question)).replace(/^\/+/, ''), query: new URLSearchParams(question < 0 ? '' : value.slice(question + 1)) }; }
  function filter(query, resource) {
    var values = [], names = { id: 'id_lokalId', q: resource === 'navngivneveje' ? 'vejnavn' : 'adgangsadressebetegnelse', vejnavn: 'vejnavn', postnr: 'postnummer', kommunekode: 'kommune' };
    query.forEach(function (value, key) { if (names[key] && value && ['format', 'overskrift', 'vispopup', 'kort'].indexOf(key) < 0) values.push(names[key] + ': { eq: ' + JSON.stringify(value) + ' }'); });
    return values.length ? ', where: { ' + values.join(', ') + ' }' : '';
  }
  function queryFor(resource, query) { var entity = mappings[resource], field = fields[entity]; if (!entity) throw new Error('Ingen DAR-mapping for ' + resource); return 'query { ' + entity + '(first: ' + (config.defaultFirst || 100) + filter(query, resource) + ') { nodes { ' + field + ' } } }'; }
  function pointFromPosition(position) { return position && position.x !== undefined ? [position.x, position.y] : null; }
  function toFeature(node, resource) {
    var point = resource === 'adgangsadresser' ? pointFromPosition(node.adgangspunkt && node.adgangspunkt.position) : null;
    if (!point) point = pointFromPosition(node.position);
    if (point) point = proj4('EPSG:25832', 'EPSG:4326', point).reverse();
    return { type: 'Feature', properties: node, geometry: point ? { type: 'Point', coordinates: point } : null };
  }
  function show(data, resource) {
    var entity = mappings[resource], nodes = data.data && data.data[entity] && data.data[entity].nodes;
    if (!nodes) throw new Error(data.errors ? data.errors.map(function (item) { return item.message; }).join('; ') : 'Uventet GraphQL-svar');
    var geojson = { type: 'FeatureCollection', features: nodes.map(function (node) { return toFeature(node, resource); }).filter(function (feature) { return feature.geometry; }) };
    var layer = L.geoJSON(geojson, { onEachFeature: function (feature, item) { item.bindPopup('<strong>' + escapeHtml(String(feature.properties.adgangsadressebetegnelse || feature.properties.adressebetegnelse || feature.properties.vejnavn || feature.properties.id_lokalId)) + '</strong>'); } }).addTo(map);
    if (layer.getBounds().isValid()) map.fitBounds(layer.getBounds());
  }
  function load() {
    var current = request(), resource = current.path.split('/')[0].toLowerCase();
    if (!current.path) { status('Brug f.eks. #adgangsadresser?postnr=2100'); return; }
    if (!config || !config.token || config.token === 'INDSAET_TOKEN_HER') { status('Angiv token i config.json'); return; }
    var body = JSON.stringify({ query: queryFor(resource, current.query) }), url = config.endpoint + '?' + encodeURIComponent(config.tokenParameter || 'apiKey') + '=' + encodeURIComponent(config.token);
    status('Henter Datafordeler-data');
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body }).then(function (response) { if (!response.ok) throw new Error('HTTP ' + response.status); return response.json(); }).then(function (data) { show(data, resource); status('Færdig'); }).catch(function (error) { status('Fejl: ' + error.message + '. Kontrollér token, mapping og CORS.'); });
  }
  fetch('config.json').then(function (response) {
    if (!response.ok) {
      if (response.status === 404) throw new Error('config.json blev ikke fundet. Kopiér config.example.json til config.json og angiv token.');
      throw new Error('Kunne ikke indlæse config.json (HTTP ' + response.status + ')');
    }
    return response.json();
  }).then(function (loaded) { config = loaded; load(); }).catch(function (error) {
    if (error instanceof SyntaxError) status('Fejl: config.json er ikke en JSON-fil (' + error.message + ')');
    else status('Fejl: ' + error.message);
  });
  window.addEventListener('hashchange', load);
}());