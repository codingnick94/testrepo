'use strict';

// ── Constants ────────────────────────────────────────────────────────────────

// Fallback Overpass query (only used if rail-lines.json is not yet available).
// [!"service"] excludes yards, sidings and crossovers — smaller payload.
const RAIL_QUERY =
  '[out:json][timeout:90];' +
  'way["railway"="rail"][!"service"](50.75,3.2,53.6,7.3);' +
  'out geom;';

// Overpass mirror fallback list
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

// Station type → { color, radius }
const STATION_STYLE = {
  megastation:               { color: '#FFC917', radius: 10 },
  knooppuntIntercitystation: { color: '#FF8C00', radius:  8 },
  intercitystation:          { color: '#4a9eff', radius:  7 },
  stoptreinstation:          { color: '#8a8fa8', radius:  4 },
  default:                   { color: '#8a8fa8', radius:  4 },
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
let pendingLoads = 2; // stations (sync) + rail lines (async)

function loadDone() {
  pendingLoads -= 1;
  if (pendingLoads <= 0) {
    loadingEl.classList.add('hidden');
  }
}

// ── Station markers (from embedded static data) ───────────────────────────────

function renderStations() {
  // Deduplicate by code — keep first occurrence (higher priority types listed first)
  const seen = new Set();
  for (const station of STATIONS_DATA) {
    if (seen.has(station.code)) continue;
    seen.add(station.code);

    const style = STATION_STYLE[station.type] || STATION_STYLE.default;

    L.circleMarker([station.lat, station.lng], {
      radius: style.radius,
      fillColor: style.color,
      color: 'rgba(0,0,0,0.45)',
      weight: 1.5,
      fillOpacity: 0.92,
    })
      .bindPopup(buildPopup(station))
      .addTo(map);
  }
  loadDone();
}

function buildPopup(station) {
  return `
    <div class="popup-name">${escapeHtml(station.name)}</div>
    <div class="popup-row">
      <span class="popup-label">Type</span>
      <span class="popup-value">${escapeHtml(formatType(station.type))}</span>
    </div>
    <div><span class="popup-code">${escapeHtml(station.code)}</span></div>
  `;
}

function formatType(type) {
  const labels = {
    megastation:               'Megastation',
    knooppuntIntercitystation: 'Knooppunt IC-station',
    intercitystation:          'Intercitystation',
    stoptreinstation:          'Stoptreinstation',
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

// ── Railway lines (Overpass with localStorage cache) ──────────────────────────

const CACHE_KEY = 'nl_rail_lines';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

function getCached() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function setCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // localStorage full or unavailable — silently skip
  }
}

function drawRailLines(elements) {
  for (const el of elements) {
    if (el.type !== 'way' || !el.geometry) continue;
    L.polyline(el.geometry.map(pt => [pt.lat, pt.lon]), {
      color: '#3a6abf',
      weight: 1.8,
      opacity: 0.75,
      interactive: false,
    }).addTo(map);
  }
}

async function loadRailLines() {
  // 1. Try localStorage cache (populated on a previous visit)
  const cached = getCached();
  if (cached) {
    drawRailLines(cached);
    return;
  }

  // 2. Try the static file committed by the GitHub Actions workflow
  try {
    const res = await fetch('rail-lines.json');
    if (res.ok) {
      const data = await res.json();
      setCache(data.elements);
      drawRailLines(data.elements);
      return;
    }
  } catch { /* file not yet generated — fall through */ }

  // 3. Last resort: live Overpass query (slow, rate-limited)
  const body = 'data=' + encodeURIComponent(RAIL_QUERY);
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setCache(data.elements);
      drawRailLines(data.elements);
      return;
    } catch (err) {
      console.warn(`Overpass ${endpoint} error:`, err.message);
    }
  }
  console.error('All Overpass endpoints failed — rail lines not shown');
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

// Stations render immediately from static data (no network request)
renderStations();

// Rail lines load from Overpass in the background
loadRailLines().finally(loadDone);
