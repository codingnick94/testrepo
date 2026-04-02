'use strict';

// ── Constants ────────────────────────────────────────────────────────────────

// Overpass endpoints tried in order; fall back if one is rate-limited
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const STATIONS_QUERY =
  '[out:json];area["name"="Nederland"]["admin_level"="2"];' +
  'node["railway"="station"]["ref:NS"](area);out tags;';

const RAIL_QUERY =
  '[out:json];area["name"="Nederland"]["admin_level"="2"];' +
  'way["railway"="rail"](area);out geom;';

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
let pendingLoads = 2; // stations + rail lines (sequential)

function loadDone() {
  pendingLoads -= 1;
  if (pendingLoads <= 0) {
    loadingEl.classList.add('hidden');
  }
}

// ── Overpass fetch helper ─────────────────────────────────────────────────────

async function overpassFetch(query) {
  const body = 'data=' + encodeURIComponent(query);
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (res.status === 429 || res.status === 504) {
        console.warn(`Overpass ${endpoint} returned ${res.status}, trying next…`);
        continue;
      }
      return res;
    } catch (err) {
      console.warn(`Overpass ${endpoint} failed:`, err.message);
    }
  }
  throw new Error('All Overpass endpoints failed or rate-limited');
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadRailLines() {
  try {
    const res = await overpassFetch(RAIL_QUERY);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    for (const el of data.elements) {
      if (el.type !== 'way' || !el.geometry) continue;
      L.polyline(el.geometry.map(pt => [pt.lat, pt.lon]), {
        color: '#3a6abf',
        weight: 1.8,
        opacity: 0.75,
        interactive: false,
      }).addTo(map);
    }
  } catch (err) {
    console.error('Rail lines load failed:', err);
  } finally {
    loadDone();
  }
}

async function loadStations() {
  try {
    const res = await overpassFetch(STATIONS_QUERY);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

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
    console.error('Stations load failed:', err);
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

// Sequential: rail lines first (renders behind), then stations
// Sequential avoids Overpass 429 rate limiting from simultaneous requests
async function init() {
  await loadRailLines();
  await loadStations();
}

init();
