(function () {
  'use strict';
  var map = L.map('map', { maxZoom: 20 }).setView([56.1, 10.2], 7), config;
  function addBackground() {
    var dataforsyningen = config.Dataforsyningen || {};
    if (!dataforsyningen.token || dataforsyningen.token === 'INDSAET_TOKEN_HER') {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
      return;
    }
    var styleUrl = 'https://cdn.dataforsyningen.dk/assets/vector_tiles_assets/latest/styles/official/3857_skaermkort_klassisk.json';
    fetch(styleUrl).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }).then(function (style) {
      Object.keys(style.sources || {}).forEach(function (sourceName) {
        var source = style.sources[sourceName];
        source.maxzoom = 20;
        if (source.tiles) source.tiles = source.tiles.map(function (tileUrl) {
          var separator = tileUrl.indexOf('?') < 0 ? '?' : '&';
          return tileUrl + separator + 'token=' + encodeURIComponent(dataforsyningen.token);
        });
      });
      L.maplibreGL({ style: style, attributionControl: { customAttribution: '&copy; Klimadatastyrelsen / Dataforsyningen' } }).addTo(map);
    }).catch(function () {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    });
  }
  proj4.defs('EPSG:25832', '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs');
  var mappings = { adgangsadresser: 'DAR_Husnummer', adresser: 'DAR_Adresse', navngivneveje: 'DAR_NavngivenVej', vejstykker: 'DAR_NavngivenVejKommunedel' };
  var fields = { DAR_Husnummer: 'id_lokalId adgangsadressebetegnelse status adgangspunkt vejpunkt', DAR_Adresse: 'id_lokalId adressebetegnelse status husnummer', DAR_NavngivenVej: 'id_lokalId vejnavn status vejnavnebeliggenhed_vejnavnelinje { wkt } vejnavnebeliggenhed_vejnavneomraade { wkt }', DAR_NavngivenVejKommunedel: 'id_lokalId vejkode kommune status navngivenVej' };
  function status(message) { document.getElementById('status').textContent = message; }
  function errorMessage(error) { return error && error.message ? error.message : String(error); }
  function escapeHtml(text) { var replacements = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }; return text.replace(/[&<>"']/g, function (character) { return replacements[character]; }); }
  function request() { var value = location.hash.slice(1), question = value.indexOf('?'); return { path: (question < 0 ? value : value.slice(0, question)).replace(/^\/+/, ''), query: new URLSearchParams(question < 0 ? '' : value.slice(question + 1)) }; }
  function filter(query, resource, postnummerIds) {
    var values = [], names = { id: 'id_lokalId', q: resource === 'navngivneveje' ? 'vejnavn' : 'adgangsadressebetegnelse', vejnavn: 'vejnavn', kommunekode: 'kommune' };
    query.forEach(function (value, key) { if (names[key] && value && ['format', 'overskrift', 'vispopup', 'kort'].indexOf(key) < 0) values.push(names[key] + ': { eq: ' + JSON.stringify(value) + ' }'); });
    if (postnummerIds && postnummerIds.length) values.push('postnummer: { in: [' + postnummerIds.map(JSON.stringify).join(', ') + '] }');
    return values.length ? ', where: { ' + values.join(', ') + ' }' : '';
  }
  function queryFor(resource, query, postnummerIds) {
    var entity = mappings[resource], field = fields[entity], hasId;
    if (!entity) throw new Error('Ingen DAR-mapping for ' + resource);
    hasId = query.get('id');
    var datafordeler = config.Datafordeler || {};
    if (hasId) return { query: 'query { ' + entity + '(first: ' + (datafordeler.defaultFirst || 100) + filter(query, resource, postnummerIds) + ') { nodes { ' + field + ' } } }' };
    return { query: 'query($virkningstid: DafDateTime!) { ' + entity + '(first: ' + (datafordeler.defaultFirst || 100) + ', virkningstid: $virkningstid' + filter(query, resource, postnummerIds) + ') { nodes { ' + field + ' } } }', variables: { virkningstid: new Date().toISOString() } };
  }
  function postnummerQuery(value) { return 'query($virkningstid: DafDateTime!) { DAR_Postnummer(first: 10, virkningstid: $virkningstid, where: { postnr: { eq: ' + JSON.stringify(value) + ' } }) { nodes { id_lokalId } } }'; }
  function pointQuery(ids) { return 'query { DAR_Adressepunkt(first: ' + ids.length + ', where: { id_lokalId: { in: [' + ids.map(JSON.stringify).join(', ') + '] } }) { nodes { id_lokalId position { wkt } } } }'; }
  function husnummerQuery(ids) { return 'query { DAR_Husnummer(first: ' + ids.length + ', where: { id_lokalId: { in: [' + ids.map(JSON.stringify).join(', ') + '] } }) { nodes { id_lokalId adgangspunkt vejpunkt } } }'; }
  function namedRoadQuery(ids) { return 'query { DAR_NavngivenVej(first: ' + ids.length + ', where: { id_lokalId: { in: [' + ids.map(JSON.stringify).join(', ') + '] } }) { nodes { id_lokalId vejnavn status vejnavnebeliggenhed_vejnavnelinje { wkt } vejnavnebeliggenhed_vejnavneomraade { wkt } } } }'; }
  function loadNamedRoadGeometry(data) {
    var nodes = data.data && data.data.DAR_NavngivenVej && data.data.DAR_NavngivenVej.nodes;
    if (!nodes) return Promise.reject(new Error(data.errors ? data.errors.map(function (item) { return item.message; }).join('; ') : 'Uventet GraphQL-svar'));
    return Promise.all(nodes.map(function (node) {
      var url = 'https://api.dataforsyningen.dk/navngivneveje/' + encodeURIComponent(node.id_lokalId) + '?format=geojson&geometri=begge';
      return fetch(url).then(function (response) { if (!response.ok) throw new Error('HTTP ' + response.status); return response.json(); }).then(function (feature) {
        node.__geojsonGeometry = feature.geometry;
      }).catch(function () {});
    })).then(function () { return data; });
  }
  function graphQl(query, variables) {
    var datafordeler = config.Datafordeler || {};
    var body = JSON.stringify({ query: query, variables: variables }), url = datafordeler.endpoint + '?' + encodeURIComponent(datafordeler.tokenParameter || 'apiKey') + '=' + encodeURIComponent(datafordeler.token);
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body }).then(function (response) { if (!response.ok) throw new Error('HTTP ' + response.status); return response.json(); });
  }
  function usablePoint(point) { return point && point.position && geometryFromWkt(point.position.wkt); }
  function loadAddressPoints(data, resource) {
    var entity = mappings[resource], nodes = data.data && data.data[entity] && data.data[entity].nodes, ids;
    if (!nodes) return Promise.reject(new Error(data.errors ? data.errors.map(function (item) { return item.message; }).join('; ') : 'Uventet GraphQL-svar'));
    ids = nodes.map(function (node) { return resource === 'adresser' ? node.husnummer : (node.adgangspunkt || node.vejpunkt); }).filter(function (id, index, values) { return id && values.indexOf(id) === index; });
    if (!ids.length) return Promise.resolve(data);
    var pointsRequest = resource === 'adresser' ? graphQl(husnummerQuery(ids)).then(function (husnummerData) {
      var husnumre = husnummerData.data && husnummerData.data.DAR_Husnummer && husnummerData.data.DAR_Husnummer.nodes;
      if (!husnumre) throw new Error(husnummerData.errors ? husnummerData.errors.map(function (item) { return item.message; }).join('; ') : 'Uventet GraphQL-svar fra DAR_Husnummer');
      nodes.forEach(function (node) { var husnummer = husnumre.filter(function (item) { return item.id_lokalId === node.husnummer; })[0]; if (husnummer) node.adgangspunkt = husnummer.adgangspunkt || husnummer.vejpunkt; });
      ids = nodes.map(function (node) { return node.adgangspunkt; }).filter(function (id, index, values) { return id && values.indexOf(id) === index; });
      return ids.length ? graphQl(pointQuery(ids)) : { data: { DAR_Adressepunkt: { nodes: [] } } };
    }) : graphQl(pointQuery(ids));
    return pointsRequest.then(function (pointsData) {
      var points = pointsData.data && pointsData.data.DAR_Adressepunkt && pointsData.data.DAR_Adressepunkt.nodes;
      if (!points) throw new Error(pointsData.errors ? pointsData.errors.map(function (item) { return item.message; }).join('; ') : 'Uventet GraphQL-svar fra DAR_Adressepunkt');
      nodes.forEach(function (node) { var candidates = points.filter(function (item) { return item.id_lokalId === node.adgangspunkt || item.id_lokalId === node.vejpunkt; }); var point = candidates.filter(usablePoint)[0]; if (point) node.position = point.position; });
      return data;
    });
  }
  function loadRoadGeometry(data) {
    var nodes = data.data && data.data.DAR_NavngivenVejKommunedel && data.data.DAR_NavngivenVejKommunedel.nodes;
    var ids = nodes && nodes.map(function (node) { return node.navngivenVej; }).filter(function (id, index, values) { return id && values.indexOf(id) === index; });
    if (!nodes) return Promise.reject(new Error(data.errors ? data.errors.map(function (item) { return item.message; }).join('; ') : 'Uventet GraphQL-svar'));
    if (!ids.length) return Promise.resolve(data);
    return graphQl(namedRoadQuery(ids)).then(function (roadsData) {
      var roads = roadsData.data && roadsData.data.DAR_NavngivenVej && roadsData.data.DAR_NavngivenVej.nodes;
      if (!roads) throw new Error(roadsData.errors ? roadsData.errors.map(function (item) { return item.message; }).join('; ') : 'Uventet GraphQL-svar fra DAR_NavngivenVej');
      nodes.forEach(function (node) { var road = roads.filter(function (item) { return item.id_lokalId === node.navngivenVej; })[0]; if (road) { node.vejnavn = road.vejnavn; node.vejnavnebeliggenhed_vejnavnelinje = road.vejnavnebeliggenhed_vejnavnelinje; node.vejnavnebeliggenhed_vejnavneomraade = road.vejnavnebeliggenhed_vejnavneomraade; } });
      return data;
    });
  }
  function pointFromPosition(position) { return position && position.x !== undefined ? [position.x, position.y] : null; }
  function projectedPair(pair) { var values = pair.trim().split(/\s+/).map(Number); return proj4('EPSG:25832', 'EPSG:4326', [values[0], values[1]]); }
  function geometryFromWkt(wkt) {
    if (!wkt) return null;
    var match = /^([A-Z]+)\s*\((.*)\)$/i.exec(wkt.trim()), type, body, groups;
    if (!match) return null;
    type = match[1].toUpperCase();
    body = match[2];
    if (type === 'POINT') { if (/^0(?:\.0+)?\s+0(?:\.0+)?$/i.test(body.trim())) return null; return { type: 'Point', coordinates: projectedPair(body) }; }
    if (type === 'LINESTRING') return { type: 'LineString', coordinates: body.split(',').map(projectedPair) };
    groups = []; body.replace(/\(([^()]*)\)/g, function (_, group) { groups.push(group.split(',').map(projectedPair)); return _; });
    if (type === 'MULTILINESTRING') return { type: 'MultiLineString', coordinates: groups };
    if (type === 'POLYGON') return { type: 'Polygon', coordinates: groups };
    return null;
  }
  function toFeature(node, resource) {
    var point = resource === 'adgangsadresser' ? pointFromPosition(node.adgangspunkt && node.adgangspunkt.position) : null;
    var geometry = node.__geojsonGeometry || (point ? { type: 'Point', coordinates: proj4('EPSG:25832', 'EPSG:4326', point) } : null);
    if (!geometry) geometry = geometryFromWkt(node.position && node.position.wkt);
    if (!geometry) geometry = geometryFromWkt(node.vejnavnebeliggenhed_vejnavnelinje && node.vejnavnebeliggenhed_vejnavnelinje.wkt);
    if (!geometry) geometry = geometryFromWkt(node.vejnavnebeliggenhed_vejnavneomraade && node.vejnavnebeliggenhed_vejnavneomraade.wkt);
    return { type: 'Feature', properties: node, geometry: geometry };
  }
  function show(data, resource) {
    var entity = mappings[resource], nodes = data.data && data.data[entity] && data.data[entity].nodes;
    if (!nodes) throw new Error(data.errors ? data.errors.map(function (item) { return item.message; }).join('; ') : 'Uventet GraphQL-svar');
    var seen = {};
    nodes = nodes.filter(function (node) { var key = node.id_lokalId + ':' + node.status; if (seen[key]) return false; seen[key] = true; return true; });
    var geojson = { type: 'FeatureCollection', features: nodes.map(function (node) { return toFeature(node, resource); }).filter(function (feature) { return feature.geometry; }) };
    var layer = L.geoJSON(geojson, { onEachFeature: function (feature, item) { item.bindPopup('<strong>' + escapeHtml(String(feature.properties.adgangsadressebetegnelse || feature.properties.adressebetegnelse || feature.properties.vejnavn || feature.properties.id_lokalId)) + '</strong>'); } }).addTo(map);
    if (layer.getBounds().isValid()) map.fitBounds(layer.getBounds());
  }
  function load() {
    var current = request(), parts = current.path.split('/'), resource = parts[0].toLowerCase();
    if (parts[1] && !current.query.get('id')) current.query.set('id', decodeURIComponent(parts[1]));
    if (!current.path) { status('Brug f.eks. #adgangsadresser?postnr=2100'); return; }
    var datafordeler = config.Datafordeler || {};
    if (!config || !datafordeler.token || datafordeler.token === 'INDSAET_TOKEN_HER') { status('Angiv Datafordeler-token i config.json'); return; }
    var requestData, requestPromise;
    status('Henter Datafordeler-data');
    if (resource === 'adgangsadresser' && current.query.get('postnr')) {
      requestPromise = graphQl(postnummerQuery(current.query.get('postnr')), { virkningstid: new Date().toISOString() }).then(function (postnummerData) {
        var postnumre = postnummerData.data && postnummerData.data.DAR_Postnummer && postnummerData.data.DAR_Postnummer.nodes;
        if (!postnumre) throw new Error(postnummerData.errors ? postnummerData.errors.map(function (item) { return item.message; }).join('; ') : 'Uventet GraphQL-svar fra DAR_Postnummer');
        postnumre = postnumre.map(function (item) { return item.id_lokalId; }).filter(function (id, index, ids) { return id && ids.indexOf(id) === index; });
        if (!postnumre.length) return { data: { DAR_Husnummer: { nodes: [] } } };
        requestData = queryFor(resource, current.query, postnumre);
        return graphQl(requestData.query, requestData.variables);
      });
    } else {
      requestData = queryFor(resource, current.query);
      requestPromise = graphQl(requestData.query, requestData.variables);
    }
    requestPromise.then(function (data) { if (resource === 'adgangsadresser' || resource === 'adresser') return loadAddressPoints(data, resource); if (resource === 'vejstykker') return loadRoadGeometry(data); if (resource === 'navngivneveje') return loadNamedRoadGeometry(data); return data; }).then(function (data) { show(data, resource); status('Færdig'); }).catch(function (error) { status('Fejl: ' + errorMessage(error) + '. Kontrollér token, mapping og CORS.'); });
  }
  fetch('config.json').then(function (response) {
    if (!response.ok) {
      if (response.status === 404) throw new Error('config.json blev ikke fundet. Kopiér config.example.json til config.json og angiv token.');
      throw new Error('Kunne ikke indlæse config.json (HTTP ' + response.status + ')');
    }
    return response.json();
  }).then(function (loaded) { config = loaded; addBackground(); load(); }).catch(function (error) {
    if (location.protocol === 'file:') status('Åbn appen via en lokal webserver, ikke direkte som file://. Kør f.eks. py -m http.server 8000 i denne mappe.');
    else if (error instanceof SyntaxError) status('Fejl: config.json er ikke en JSON-fil (' + errorMessage(error) + ')');
    else status('Fejl: ' + errorMessage(error));
  });
  window.addEventListener('hashchange', load);
}());