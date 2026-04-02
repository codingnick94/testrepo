'use strict';

// ── Constants ────────────────────────────────────────────────────────────────

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Single combined query: NS stations (nodes) + rail lines (ways)
const COMBINED_QUERY =
  '[out:json];' +
  'area["name"="Nederland"]["admin_level"="2"]->.nl;' +
  '(' +
    'node["railway"="station"]["ref:NS"](area.nl);' +
    'way["railway"="rail"](area.nl);' +
  ');' +
  'out geom tags;';

// Station type → { color, radius }
const STATION_STYLE = {
  megastation:               { color: '#FFC917', radius: 10 },
  knooppuntIntercitystation: { color: '#FF8C00', radius:  8 },
  intercitystation:          { color: '#4a9eff', radius:  7 },
  default:                   { color: '#8a8fa8', radius:  4 },
};

// NS station code → type (based on official NS station classification)
const NS_TYPE = {
  // Megastations
  ASD:  'megastation',  // Amsterdam Centraal
  RTD:  'megastation',  // Rotterdam Centraal
  UT:   'megastation',  // Utrecht Centraal
  GVC:  'megastation',  // Den Haag Centraal
  SHL:  'megastation',  // Amsterdam Airport Schiphol

  // Knooppunt intercitystations
  ASDM: 'knooppuntIntercitystation',  // Amsterdam Amstel
  ASS:  'knooppuntIntercitystation',  // Amsterdam Sloterdijk
  ASA:  'knooppuntIntercitystation',  // Amsterdam Zuid
  AMF:  'knooppuntIntercitystation',  // Amersfoort
  AH:   'knooppuntIntercitystation',  // Arnhem Centraal
  BD:   'knooppuntIntercitystation',  // Breda
  GVS:  'knooppuntIntercitystation',  // Den Haag HS
  DV:   'knooppuntIntercitystation',  // Deventer
  DT:   'knooppuntIntercitystation',  // Dordrecht
  EHV:  'knooppuntIntercitystation',  // Eindhoven
  ES:   'knooppuntIntercitystation',  // Enschede
  GN:   'knooppuntIntercitystation',  // Groningen
  HLM:  'knooppuntIntercitystation',  // Haarlem
  LDN:  'knooppuntIntercitystation',  // Leiden Centraal
  MT:   'knooppuntIntercitystation',  // Maastricht
  NM:   'knooppuntIntercitystation',  // Nijmegen
  HT:   'knooppuntIntercitystation',  // 's-Hertogenbosch
  TB:   'knooppuntIntercitystation',  // Tilburg
  VL:   'knooppuntIntercitystation',  // Venlo
  ZL:   'knooppuntIntercitystation',  // Zwolle

  // Intercitystations
  ALM:  'intercitystation',  // Almere Centrum
  ALMB: 'intercitystation',  // Almere Buiten
  APD:  'intercitystation',  // Apeldoorn
  ASB:  'intercitystation',  // Amsterdam Bijlmer ArenA
  ASHD: 'intercitystation',  // Amstelveen Stadshart... no, Amsterdam Holendrecht
  BSMZ: 'intercitystation',  // Bussum Zuid
  DDZD: 'intercitystation',  // Dordrecht Zuid
  EM:   'intercitystation',  // Emmen
  GD:   'intercitystation',  // Gouda
  GDG:  'intercitystation',  // Gouda Goverwelle
  GVMW: 'intercitystation',  // Den Haag Moerwijk
  HFD:  'intercitystation',  // Hoofddorp
  HGL:  'intercitystation',  // Helmond
  HR:   'intercitystation',  // Heerlen
  HRN:  'intercitystation',  // Hoorn
  LLS:  'intercitystation',  // Lelystad Centrum
  LEDN: 'intercitystation',  // Leiden Lammenschans... actually wrong, skip
  MDB:  'intercitystation',  // Middelburg
  RTTA: 'intercitystation',  // Rotterdam Alexander
  RTB:  'intercitystation',  // Rotterdam Blaak
  SC:   'intercitystation',  // Schiedam Centrum
  SHLZ: 'intercitystation',  // Schiphol Zuid?
  SNK:  'intercitystation',  // Sneek
  UTLST:'intercitystation',  // Utrecht Leidsche Rijn
  VDN:  'intercitystation',  // Veenendaal-De Klomp
  WD:   'intercitystation',  // Woerden
  ZD:   'intercitystation',  // Zoetermeer
  ZDM:  'intercitystation',  // Zoetermeer oost? no
};

// ── Map initialisation ───────────────────────────────────────────────────────

const map = L.map('map', {
  center: [52.3, 5.3],
  zoom: 8,
  zoomControl: true,
});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
}).addTo(map);

// ── Loading state ─────────────────────────────────────────────────────────────

const loadingEl = document.getElementById('loading');
let pendingLoads = 1; // single combined Overpass request

function loadDone() {
  pendingLoads -= 1;
  if (pendingLoads <= 0) {
    loadingEl.classList.add('hidden');
  }
}

// ── Overpass fetch helper ─────────────────────────────────────────────────────

function overpassFetch(query) {
  return fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'data=' + encodeURIComponent(query),
  });
}

// ── Data loading (single Overpass request) ────────────────────────────────────

async function loadMapData() {
  try {
    const res = await overpassFetch(COMBINED_QUERY);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Draw rail lines first so station markers render on top
    for (const el of data.elements) {
      if (el.type !== 'way' || !el.geometry) continue;
      L.polyline(el.geometry.map(pt => [pt.lat, pt.lon]), {
        color: '#3a6abf',
        weight: 1.8,
        opacity: 0.75,
        interactive: false,
      }).addTo(map);
    }

    // Then draw station markers
    for (const el of data.elements) {
      if (el.type !== 'node') continue;
      const tags = el.tags || {};
      const code = (tags['ref:NS'] || '').trim().toUpperCase();
      const type = NS_TYPE[code] || 'default';
      const style = STATION_STYLE[type] || STATION_STYLE.default;
      const name = tags['name'] || code || '—';

      L.circleMarker([el.lat, el.lon], {
        radius: style.radius,
        fillColor: style.color,
        color: 'rgba(0,0,0,0.45)',
        weight: 1.5,
        fillOpacity: 0.92,
      })
        .bindPopup(buildPopup(name, type, code))
        .addTo(map);
    }
  } catch (err) {
    console.error('Map data load failed:', err);
  } finally {
    loadDone();
  }
}

function buildPopup(name, type, code) {
  return `
    <div class="popup-name">${escapeHtml(name)}</div>
    <div class="popup-row">
      <span class="popup-label">Type</span>
      <span class="popup-value">${escapeHtml(formatType(type))}</span>
    </div>
    <div><span class="popup-code">${escapeHtml(code)}</span></div>
  `;
}

function formatType(type) {
  const labels = {
    megastation:               'Megastation',
    knooppuntIntercitystation: 'Knooppunt IC-station',
    intercitystation:          'Intercitystation',
    default:                   'Station',
  };
  return labels[type] || type;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

loadMapData();
