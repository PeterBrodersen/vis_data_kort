(function () {
  'use strict';
  var map = L.map('map').setView([56.1, 10.2], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);

  function status(message) { document.getElementById('status').textContent = message; }
  function requestFromHash() {
    var value = window.location.hash.slice(1), question = value.indexOf('?');
    return { path: (question < 0 ? value : value.slice(0, question)).replace(/^\/+/, ''), query: new URLSearchParams(question < 0 ? '' : value.slice(question + 1)) };
  }
  function endpoint(request) {
    var parts = request.path.split('/').filter(Boolean), query = new URLSearchParams(request.query);
    if (!parts.length) return null;
    query.set('format', 'geojson');
    if (parts[0].toLowerCase() === 'navngivneveje') query.set('geometri', 'begge');
    return 'https://api.dataforsyningen.dk/' + parts.map(encodeURIComponent).join('/') + '?' + query.toString();
  }
  function escapeHtml(text) { var replacements = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }; return text.replace(/[&<>"']/g, function (character) { return replacements[character]; }); }
  function popup(feature) {
    var properties = feature.properties || {}, heading = properties.navn || properties.adressebetegnelse || properties.betegnelse || properties.nr || properties.kode || properties.id;
    var rows = Object.keys(properties).slice(0, 12);
    return '<strong>' + escapeHtml(String(heading || 'Objekt')) + '</strong><br>' + rows.map(function (key) { var item = properties[key]; return '<small>' + escapeHtml(key) + ': ' + escapeHtml(item === null || item === undefined ? '' : typeof item === 'object' ? JSON.stringify(item) : String(item)) + '</small>'; }).join('<br>');
  }
  function loadMulti(request) {
    var layers;
    try { layers = JSON.parse(request.query.get('lag')); } catch (error) { throw new Error('lag skal være gyldig JSON'); }
    return Promise.all(layers.map(function (item) { var params = new URLSearchParams(item.parametre || {}); return fetch(endpoint({ path: item.ressource, query: params })).then(function (response) { if (!response.ok) throw new Error('HTTP ' + response.status); return response.json(); }); })).then(function (data) {
      var group = L.featureGroup();
      data.forEach(function (item) { L.geoJSON(item, { onEachFeature: function (feature, layer) { layer.bindPopup(popup(feature)); } }).addTo(group); });
      if (group.getBounds().isValid()) map.fitBounds(group.getBounds());
    });
  }
  function load() {
    var request = requestFromHash();
    if (!request.path) { status('Angiv et DAWA-endpoint efter #, f.eks. #vejstykker?kommunekode=0101'); return; }
    if (request.path.toLowerCase() === 'multi') { status('Henter lag'); loadMulti(request).then(function () { status('Færdig'); }).catch(function (error) { status('Fejl: ' + error.message); }); return; }
    var url = endpoint(request);
    status('Henter data');
    fetch(url).then(function (response) { if (!response.ok) throw new Error('HTTP ' + response.status); return response.json(); }).then(function (data) {
      var layer = L.geoJSON(data, { onEachFeature: function (feature, item) { item.bindPopup(popup(feature)); } }).addTo(map);
      if (layer.getBounds().isValid()) map.fitBounds(layer.getBounds());
      status('Færdig');
    }).catch(function (error) { status('Fejl: ' + error.message + '. Kontroller CORS og endpointet.'); });
  }
  window.addEventListener('hashchange', load);
  load();
}());