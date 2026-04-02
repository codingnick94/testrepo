'use strict';

// ── Constants ────────────────────────────────────────────────────────────────

const STATIONS_CSV_URL =
  'https://opendata.rijdendetreinen.nl/public/stations/stations-2024-09-nl.csv';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const OVERPASS_QUERY =
  '[out:json];area["name"="Nederland"]["admin_level"="2"];' +
  'way["railway"="rail"](area);out geom;';

// Station type → { color, radius }
const STATION_STYLE = {
  megastation:                 { color: '#FFC917', radius: 10 },
  knooppuntIntercitystation:   { color: '#FF8C00', radius:  8 },
  intercitystation:            { color: '#4a9eff', radius:  7 },
  sneltreinstation:            { color: '#8a8fa8', radius:  5 },
  stoptreinstation:            { color: '#8a8fa8', radius:  4 },
  facultatiefStation:          { color: '#8a8fa8', radius:  4 },
  default:                     { color: '#8a8fa8', radius:  4 },
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
let pendingLoads = 2; // stations + rail lines

function loadDone() {
  pendingLoads -= 1;
  if (pendingLoads <= 0) {
    loadingEl.classList.add('hidden');
  }
}

// ── CSV parser ────────────────────────────────────────────────────────────────

/**
 * Parse a CSV string into an array of objects using the first row as headers.
 * Handles double-quoted fields (including those containing commas).
 */
function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  // Auto-detect delimiter: semicolon (common in Dutch data) or comma
  const delimiter = lines[0].includes(';') ? ';' : ',';

  const headers = splitCSVLine(lines[0], delimiter);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = splitCSVLine(line, delimiter);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h.trim()] = (values[idx] ?? '').trim();
    });
    rows.push(obj);
  }

  return rows;
}

function splitCSVLine(line, delimiter = ',') {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

// ── Station markers ───────────────────────────────────────────────────────────

async function loadStations() {
  try {
    const res = await fetch(STATIONS_CSV_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const rows = parseCSV(text);
    const nlRows = rows.filter(r => r['country'] === 'NL');
    console.log('[stations] total rows:', rows.length, '| NL rows:', nlRows.length);
    if (rows.length > 0) console.log('[stations] columns:', Object.keys(rows[0]));

    nlRows
      .forEach(station => {
        const lat = parseFloat(station['geo_lat']);
        const lng = parseFloat(station['geo_lng']);
        if (isNaN(lat) || isNaN(lng)) return;

        const type = station['type'] || 'default';
        const style = STATION_STYLE[type] || STATION_STYLE.default;

        const marker = L.circleMarker([lat, lng], {
          radius: style.radius,
          fillColor: style.color,
          color: 'rgba(0,0,0,0.45)',
          weight: 1.5,
          fillOpacity: 0.92,
        }).addTo(map);

        marker.bindPopup(buildPopup(station, type));
      });
  } catch (err) {
    console.error('[stations] load failed:', err);
  } finally {
    loadDone();
  }
}

function buildPopup(station, type) {
  const name = escapeHtml(station['name_long'] || station['name'] || '—');
  const code = escapeHtml(station['code'] || '—');
  const typeLabel = escapeHtml(formatType(type));

  return `
    <div class="popup-name">${name}</div>
    <div class="popup-row">
      <span class="popup-label">Type</span>
      <span class="popup-value">${typeLabel}</span>
    </div>
    <div><span class="popup-code">${code}</span></div>
  `;
}

function formatType(type) {
  const map = {
    megastation:               'Megastation',
    knooppuntIntercitystation: 'Knooppunt IC-station',
    intercitystation:          'Intercitystation',
    sneltreinstation:          'Sneltreinstation',
    stoptreinstation:          'Stoptreinstation',
    facultatiefStation:        'Facultatief station',
  };
  return map[type] || type;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Railway lines ─────────────────────────────────────────────────────────────

async function loadRailLines() {
  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(OVERPASS_QUERY),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const railLayer = L.layerGroup().addTo(map);

    for (const element of data.elements) {
      if (element.type !== 'way' || !element.geometry) continue;
      const latlngs = element.geometry.map(pt => [pt.lat, pt.lon]);
      L.polyline(latlngs, {
        color: '#3a6abf',
        weight: 1.8,
        opacity: 0.75,
        interactive: false,
      }).addTo(railLayer);
    }

    // Push rail layer below markers by bringing markers to front
    railLayer.bringToBack();
  } catch (err) {
    console.error('Rail lines load failed:', err);
  } finally {
    loadDone();
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

loadStations();
loadRailLines();
