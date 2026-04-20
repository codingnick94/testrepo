// TIBS-SB data model: corridor, stations, tracks, trains, signals, switches, alarms
// Coordinates are in an abstract "map" space: x 0..1600, y 0..900.
// Geography approximates Amsterdam -> Rotterdam (NS).

const STATIONS = [
  { id: "asd",  code: "Asd",  name: "Amsterdam Centraal", x: 1320, y: 140, tracks: 15, major: true },
  { id: "ass",  code: "Ass",  name: "Amsterdam Zuid",     x: 1230, y: 235, tracks: 6,  major: false },
  { id: "shl",  code: "Shl",  name: "Schiphol Airport",   x: 1140, y: 320, tracks: 6,  major: true },
  { id: "hfd",  code: "Hfd",  name: "Hoofddorp",          x: 1055, y: 380, tracks: 4,  major: false },
  { id: "ndb",  code: "Ndb",  name: "Nieuw Vennep",       x: 985,  y: 425, tracks: 2,  major: false },
  { id: "ledn", code: "Ledn", name: "Leiden Centraal",    x: 820,  y: 475, tracks: 8,  major: true },
  { id: "vst",  code: "Vst",  name: "Voorschoten",        x: 720,  y: 515, tracks: 4,  major: false },
  { id: "gv",   code: "Gvc",  name: "Den Haag Centraal",  x: 570,  y: 540, tracks: 12, major: true, branch: true },
  { id: "gvmw", code: "Gvmw", name: "Den Haag Mariahoeve",x: 650,  y: 510, tracks: 4,  major: false },
  { id: "gvh",  code: "Gvh",  name: "Den Haag HS",        x: 590,  y: 580, tracks: 8,  major: true },
  { id: "dt",   code: "Dt",   name: "Delft",              x: 520,  y: 640, tracks: 4,  major: false },
  { id: "dtz",  code: "Dtz",  name: "Delft Campus",       x: 490,  y: 680, tracks: 2,  major: false },
  { id: "rtn",  code: "Rtn",  name: "Rotterdam Noord",    x: 420,  y: 740, tracks: 2,  major: false },
  { id: "rtd",  code: "Rtd",  name: "Rotterdam Centraal", x: 340,  y: 790, tracks: 14, major: true },
];

// Track segments between stations. Each segment has parallel tracks (up/down).
// We draw as a pair of lines offset perpendicular to the segment direction.
const SEGMENTS = [
  { id: "s1",  from: "asd",  to: "ass",  tracks: 4 },
  { id: "s2",  from: "ass",  to: "shl",  tracks: 4 },
  { id: "s3",  from: "shl",  to: "hfd",  tracks: 4 },
  { id: "s4",  from: "hfd",  to: "ndb",  tracks: 2 },
  { id: "s5",  from: "ndb",  to: "ledn", tracks: 2 },
  { id: "s6",  from: "ledn", to: "vst",  tracks: 4 },
  { id: "s7",  from: "vst",  to: "gvmw", tracks: 4 },
  { id: "s8a", from: "gvmw", to: "gv",   tracks: 2 }, // branch to Den Haag CS
  { id: "s8b", from: "gvmw", to: "gvh",  tracks: 4 }, // mainline via HS
  { id: "s9",  from: "gvh",  to: "dt",   tracks: 4 },
  { id: "s10", from: "dt",   to: "dtz",  tracks: 4 },
  { id: "s11", from: "dtz",  to: "rtn",  tracks: 4 },
  { id: "s12", from: "rtn",  to: "rtd",  tracks: 4 },
];

// Signals — placed at segment endpoints (near stations), one per direction.
// state: "green" | "yellow" | "red" | "fault"
const SIGNALS = [
  { id: "sig-shl-n",  x: 1175, y: 295, dir: "N", state: "green",  label: "204/1" },
  { id: "sig-shl-s",  x: 1110, y: 345, dir: "S", state: "green",  label: "204/2" },
  { id: "sig-hfd-n",  x: 1080, y: 360, dir: "N", state: "yellow", label: "318/1" },
  { id: "sig-hfd-s",  x: 1030, y: 400, dir: "S", state: "green",  label: "318/2" },
  { id: "sig-ledn-n", x: 855,  y: 455, dir: "N", state: "red",    label: "412/1" },
  { id: "sig-ledn-s", x: 790,  y: 495, dir: "S", state: "fault",  label: "412/2" },
  { id: "sig-gvmw-e", x: 680,  y: 495, dir: "E", state: "green",  label: "507/1" },
  { id: "sig-gvh-n",  x: 615,  y: 560, dir: "N", state: "green",  label: "601/1" },
  { id: "sig-gvh-s",  x: 570,  y: 605, dir: "S", state: "yellow", label: "601/2" },
  { id: "sig-dt-n",   x: 540,  y: 620, dir: "N", state: "green",  label: "715/1" },
  { id: "sig-dt-s",   x: 500,  y: 660, dir: "S", state: "green",  label: "715/2" },
  { id: "sig-rtd-n",  x: 375,  y: 770, dir: "N", state: "green",  label: "901/1" },
];

// Switches (wissels) — at junctions near stations
const SWITCHES = [
  { id: "w-shl-01",  x: 1155, y: 308, position: "straight", label: "Shl 1A" },
  { id: "w-shl-02",  x: 1125, y: 333, position: "diverge",  label: "Shl 1B" },
  { id: "w-ledn-01", x: 840,  y: 468, position: "straight", label: "Ledn 3A" },
  { id: "w-ledn-02", x: 805,  y: 488, position: "straight", label: "Ledn 3B" },
  { id: "w-gvmw-01", x: 665,  y: 502, position: "diverge",  label: "Gvmw 1" },  // branch to Den Haag CS
  { id: "w-gvh-01",  x: 600,  y: 572, position: "straight", label: "Gvh 2A" },
  { id: "w-dt-01",   x: 525,  y: 632, position: "straight", label: "Dt 1A" },
  { id: "w-rtd-01",  x: 370,  y: 775, position: "straight", label: "Rtd 5A" },
];

// Trains. progress is 0..1 along their route. Route = list of station ids.
// type: IC=Intercity, SPR=Sprinter, ICD=IC Direct, FR=Freight
const TRAINS = [
  { id: "IC-1522", number: "1522", type: "IC",  from: "Amsterdam Centraal", to: "Rotterdam Centraal",
    route: ["asd","ass","shl","hfd","ledn","vst","gvmw","gvh","dt","dtz","rtn","rtd"],
    progress: 0.18, delay: 0, speed: 142, dir: "S" },
  { id: "SPR-4418", number: "4418", type: "SPR", from: "Rotterdam Centraal", to: "Amsterdam Centraal",
    route: ["rtd","rtn","dtz","dt","gvh","gvmw","vst","ledn","ndb","hfd","shl","ass","asd"],
    progress: 0.32, delay: 2, speed: 108, dir: "N" },
  { id: "ICD-921",  number: "921",  type: "ICD", from: "Amsterdam Centraal", to: "Rotterdam Centraal",
    route: ["asd","shl","rtd"],
    progress: 0.55, delay: 0, speed: 160, dir: "S" },
  { id: "IC-1528",  number: "1528", type: "IC",  from: "Amsterdam Centraal", to: "Den Haag Centraal",
    route: ["asd","ass","shl","hfd","ledn","vst","gvmw","gv"],
    progress: 0.72, delay: 1, speed: 95, dir: "S" },
  { id: "SPR-4420", number: "4420", type: "SPR", from: "Amsterdam Centraal", to: "Den Haag HS",
    route: ["asd","ass","shl","hfd","ndb","ledn","vst","gvmw","gvh"],
    progress: 0.88, delay: 7, speed: 62, dir: "S", warning: true },
  { id: "IC-1525",  number: "1525", type: "IC",  from: "Rotterdam Centraal", to: "Amsterdam Centraal",
    route: ["rtd","rtn","dtz","dt","gvh","gvmw","vst","ledn","hfd","shl","ass","asd"],
    progress: 0.62, delay: 0, speed: 138, dir: "N" },
  { id: "SPR-4422", number: "4422", type: "SPR", from: "Den Haag HS", to: "Rotterdam Centraal",
    route: ["gvh","dt","dtz","rtn","rtd"],
    progress: 0.25, delay: 0, speed: 88, dir: "S" },
  { id: "FR-88021", number: "88021",type: "FR",  from: "Rotterdam Centraal", to: "Amsterdam Centraal",
    route: ["rtd","rtn","dtz","dt","gvh","gvmw","vst","ledn","hfd","shl","ass","asd"],
    progress: 0.08, delay: 4, speed: 72, dir: "N" },
  { id: "IC-1530",  number: "1530", type: "IC",  from: "Amsterdam Centraal", to: "Rotterdam Centraal",
    route: ["asd","ass","shl","hfd","ledn","vst","gvmw","gvh","dt","dtz","rtn","rtd"],
    progress: 0.04, delay: 0, speed: 60, dir: "S" },
  { id: "SPR-4424", number: "4424", type: "SPR", from: "Rotterdam Centraal", to: "Den Haag HS",
    route: ["rtd","rtn","dtz","dt","gvh"],
    progress: 0.46, delay: 0, speed: 110, dir: "N" },
  { id: "ICD-923",  number: "923",  type: "ICD", from: "Rotterdam Centraal", to: "Amsterdam Centraal",
    route: ["rtd","shl","asd"],
    progress: 0.28, delay: 0, speed: 155, dir: "N" },
  { id: "IC-1532",  number: "1532", type: "IC",  from: "Den Haag Centraal", to: "Amsterdam Centraal",
    route: ["gv","gvmw","vst","ledn","hfd","shl","ass","asd"],
    progress: 0.15, delay: 0, speed: 120, dir: "N" },
];

// Alarms / faults
const ALARMS = [
  { id: "a1", severity: "alarm",   time: "14:23", code: "SIG-412/2",
    title: "Seinstoring Leiden zuid",
    desc: "Sein 412/2 meldt storing. Geen groen beeld mogelijk. Onderhoud onderweg.",
    target: { type: "signal", id: "sig-ledn-s" }, ack: false },
  { id: "a2", severity: "warning", time: "14:19", code: "TRN-4420",
    title: "Vertraging 4420 oplopend",
    desc: "Sprinter 4420 heeft +7 min vertraging. Aansluiting Gvh in gevaar.",
    target: { type: "train", id: "SPR-4420" }, ack: false },
  { id: "a3", severity: "info",    time: "14:05", code: "WRK-Hfd",
    title: "Werkzaamheden Hoofddorp",
    desc: "Spoor 2 buiten dienst tot 16:00. Omleiding via spoor 3.",
    target: { type: "segment", id: "s3" }, ack: true },
  { id: "a4", severity: "warning", time: "13:58", code: "TRN-FR-88021",
    title: "Goederentrein vertraagd",
    desc: "FR-88021 +4 min. Wacht op pad tussen Rtd en Dt.",
    target: { type: "train", id: "FR-88021" }, ack: true },
];

// Stops with scheduled/actual times for a train (used in details)
const TRAIN_STOPS = {
  "IC-1522": [
    { station: "Asd",  sched: "14:02", act: "14:02", platform: "11b", status: "vertrokken" },
    { station: "Shl",  sched: "14:16", act: "14:16", platform: "2",   status: "vertrokken" },
    { station: "Ledn", sched: "14:31", act: "14:32", platform: "5a",  status: "actueel"  },
    { station: "Gvh",  sched: "14:44", act: "14:45", platform: "8",   status: "verwacht" },
    { station: "Dt",   sched: "14:52", act: "14:53", platform: "2",   status: "verwacht" },
    { station: "Rtd",  sched: "15:04", act: "15:05", platform: "7",   status: "verwacht" },
  ],
  "SPR-4420": [
    { station: "Asd",  sched: "13:47", act: "13:47", platform: "14a", status: "vertrokken" },
    { station: "Shl",  sched: "14:02", act: "14:04", platform: "5",   status: "vertrokken" },
    { station: "Hfd",  sched: "14:09", act: "14:13", platform: "3",   status: "vertrokken" },
    { station: "Ndb",  sched: "14:14", act: "14:19", platform: "1",   status: "vertrokken" },
    { station: "Ledn", sched: "14:26", act: "14:33", platform: "6b",  status: "actueel" },
    { station: "Vst",  sched: "14:31", act: "14:38", platform: "2",   status: "verwacht" },
    { station: "Gvmw", sched: "14:36", act: "14:43", platform: "3",   status: "verwacht" },
    { station: "Gvh",  sched: "14:41", act: "14:48", platform: "4",   status: "verwacht" },
  ],
};

// Occupancy history for a section (for segment detail panel)
const OCCUPANCY_HISTORY = [
  { time: "14:32", train: "IC-1522",  event: "Bezet" },
  { time: "14:30", train: "IC-1522",  event: "Gereserveerd" },
  { time: "14:27", train: "SPR-4418", event: "Vrij"  },
  { time: "14:24", train: "SPR-4418", event: "Bezet" },
  { time: "14:19", train: "ICD-921",  event: "Vrij"  },
  { time: "14:16", train: "ICD-921",  event: "Bezet" },
  { time: "14:11", train: "IC-1520",  event: "Vrij"  },
];

// Helpers
function stationById(id){ return STATIONS.find(s=>s.id===id); }

// Interpolate train position along its route (using great-circle-ish straight segments)
function trainPosition(train){
  const pts = train.route.map(stationById).filter(Boolean);
  if (pts.length < 2) return { x: pts[0]?.x ?? 0, y: pts[0]?.y ?? 0, angle: 0 };
  // cumulative length
  const segs = [];
  let total = 0;
  for (let i=0;i<pts.length-1;i++){
    const dx = pts[i+1].x - pts[i].x, dy = pts[i+1].y - pts[i].y;
    const len = Math.hypot(dx,dy);
    segs.push({ a: pts[i], b: pts[i+1], len, start: total });
    total += len;
  }
  const target = Math.max(0, Math.min(0.9999, train.progress)) * total;
  const seg = segs.find(s => target >= s.start && target <= s.start + s.len) || segs[segs.length-1];
  const t = (target - seg.start) / seg.len;
  const x = seg.a.x + (seg.b.x - seg.a.x) * t;
  const y = seg.a.y + (seg.b.y - seg.a.y) * t;
  const angle = Math.atan2(seg.b.y - seg.a.y, seg.b.x - seg.a.x) * 180 / Math.PI;
  // perpendicular offset for up/down track
  const perpX = -Math.sin(angle * Math.PI/180);
  const perpY =  Math.cos(angle * Math.PI/180);
  const offset = train.dir === "S" ? 3.5 : -3.5;
  return { x: x + perpX*offset, y: y + perpY*offset, angle };
}

// Export to window
Object.assign(window, {
  STATIONS, SEGMENTS, SIGNALS, SWITCHES, TRAINS, ALARMS,
  TRAIN_STOPS, OCCUPANCY_HISTORY,
  stationById, trainPosition,
});
