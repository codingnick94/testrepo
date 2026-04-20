// Map view — SVG with pan/zoom, tracks, signals, switches, trains

const { useRef, useState, useEffect, useMemo, useCallback } = React;

// Occupancy: which segments are occupied by which trains, based on progress.
function computeOccupancy(trains) {
  const occ = {}; // segmentId -> [{trainId, dir}]
  for (const t of trains) {
    if (t.route.length < 2) continue;
    const pts = t.route;
    // find which consecutive station pair the train is on (approx via progress)
    const segs = [];
    let total = 0;
    for (let i=0;i<pts.length-1;i++){
      const a = window.stationById(pts[i]);
      const b = window.stationById(pts[i+1]);
      if (!a || !b) continue;
      const len = Math.hypot(b.x-a.x, b.y-a.y);
      segs.push({ from: pts[i], to: pts[i+1], len, start: total });
      total += len;
    }
    const target = t.progress * total;
    const cur = segs.find(s => target >= s.start && target <= s.start + s.len);
    if (!cur) continue;
    // find the SEGMENTS entry matching this pair (either direction)
    const s = window.SEGMENTS.find(s =>
      (s.from === cur.from && s.to === cur.to) ||
      (s.from === cur.to && s.to === cur.from));
    if (!s) continue;
    occ[s.id] = occ[s.id] || [];
    occ[s.id].push({ trainId: t.id, dir: t.dir, warning: t.warning });
  }
  return occ;
}

// Render tracks: pair of parallel lines per segment
function TrackSegment({ seg, occupancy, layers, selection, onClick }) {
  const a = window.stationById(seg.from);
  const b = window.stationById(seg.to);
  if (!a || !b) return null;
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const ux = dx/len, uy = dy/len;       // along
  const px = -uy, py = ux;               // perpendicular

  const occ = occupancy[seg.id] || [];
  const isFault = seg.id === "s6"; // Leiden-Voorschoten (signal fault area)

  const isSelected = selection?.type === "segment" && selection.id === seg.id;

  // two parallel lines (up / down)
  const offsets = [-3.5, 3.5];
  const lines = offsets.map((off, i) => {
    const ax = a.x + px*off, ay = a.y + py*off;
    const bx = b.x + px*off, by = b.y + py*off;
    const trainOnThis = occ.find(o => (i===0 ? o.dir === "N" : o.dir === "S"));
    let color = "var(--track-free)";
    if (isFault && i===1) color = "var(--track-fault)";
    else if (trainOnThis?.warning) color = "var(--warn)";
    else if (trainOnThis) color = "var(--track-occupied)";
    return (
      <line key={i} x1={ax} y1={ay} x2={bx} y2={by}
            stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    );
  });

  // sleepers (tiny cross hatches) — subtle
  const sleepers = [];
  const nSleepers = Math.floor(len/22);
  for (let k=1; k<nSleepers; k++){
    const tk = k/nSleepers;
    const cx = a.x + dx*tk, cy = a.y + dy*tk;
    sleepers.push(
      <line key={k} x1={cx + px*5} y1={cy + py*5} x2={cx - px*5} y2={cy - py*5}
            stroke="var(--border)" strokeWidth="0.6" opacity="0.55" />
    );
  }

  return (
    <g className="track-seg" data-seg-id={seg.id} style={{ cursor: "pointer" }}
       onClick={(e) => { e.stopPropagation(); onClick({ type: "segment", id: seg.id }); }}>
      {/* hit area */}
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth="18" />
      {sleepers}
      {lines}
      {isSelected && (
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="var(--accent)" strokeWidth="14" opacity="0.18" strokeLinecap="round" />
      )}
    </g>
  );
}

function StationGlyph({ s, selected, onClick }) {
  const r = s.major ? 9 : 5.5;
  return (
    <g style={{ cursor: "pointer" }}
       onClick={(e) => { e.stopPropagation(); onClick({ type: "station", id: s.id }); }}>
      {selected && <circle cx={s.x} cy={s.y} r={r+8} fill="var(--accent)" opacity="0.18" />}
      <circle cx={s.x} cy={s.y} r={r+2.5} fill="var(--bg-1)" stroke="var(--border-strong)" strokeWidth="1.2" />
      <circle cx={s.x} cy={s.y} r={r} fill={s.major ? "var(--text-1)" : "var(--text-2)"} />
      {s.major && <circle cx={s.x} cy={s.y} r={r-3.5} fill="var(--bg-1)" />}
      <text x={s.x + (s.id==="gv" || s.id==="gvh" || s.id==="rtd" ? -14 : 14)}
            y={s.y + 4}
            textAnchor={s.id==="gv" || s.id==="gvh" || s.id==="rtd" ? "end" : "start"}
            fontSize={s.major ? 12 : 10.5}
            fontWeight={s.major ? 600 : 500}
            fill="var(--text-1)"
            style={{ pointerEvents: "none", fontFamily: "var(--font-ui)" }}>
        {s.name}
      </text>
      {s.major && (
        <text x={s.x + (s.id==="gv" || s.id==="gvh" || s.id==="rtd" ? -14 : 14)}
              y={s.y + 17}
              textAnchor={s.id==="gv" || s.id==="gvh" || s.id==="rtd" ? "end" : "start"}
              fontSize="9.5" fill="var(--text-3)"
              style={{ pointerEvents: "none", fontFamily: "var(--font-mono)" }}>
          {s.code.toUpperCase()} · {s.tracks} sporen
        </text>
      )}
    </g>
  );
}

function Signal({ sig, selected, onClick }) {
  const stateColor = {
    green: "var(--signal-green)",
    yellow: "var(--signal-yellow)",
    red: "var(--signal-red)",
    fault: "var(--alarm)",
  }[sig.state];
  const pulse = sig.state === "fault" || sig.state === "red";
  return (
    <g style={{ cursor: "pointer" }}
       onClick={(e) => { e.stopPropagation(); onClick({ type: "signal", id: sig.id }); }}>
      {selected && <circle cx={sig.x} cy={sig.y} r="13" fill="var(--accent)" opacity="0.22" />}
      <rect x={sig.x-3.5} y={sig.y-7} width="7" height="14" rx="1.2"
            fill="var(--bg-1)" stroke="var(--border-strong)" strokeWidth="0.8" />
      <circle cx={sig.x} cy={sig.y-3.5} r="2.3" fill={stateColor}>
        {pulse && (
          <animate attributeName="opacity" values="1;0.35;1" dur="1.4s" repeatCount="indefinite" />
        )}
      </circle>
      <circle cx={sig.x} cy={sig.y+2.5} r="1.8"
              fill={sig.state === "yellow" ? "var(--signal-yellow)" : "var(--bg-3)"} />
      {sig.state === "fault" && (
        <text x={sig.x} y={sig.y-10} textAnchor="middle" fontSize="8" fontWeight="600"
              fill="var(--alarm)" style={{ fontFamily: "var(--font-mono)" }}>
          ⚠
        </text>
      )}
    </g>
  );
}

function Switch({ sw, selected, onClick }) {
  return (
    <g style={{ cursor: "pointer" }}
       onClick={(e) => { e.stopPropagation(); onClick({ type: "switch", id: sw.id }); }}>
      {selected && <circle cx={sw.x} cy={sw.y} r="10" fill="var(--accent)" opacity="0.22" />}
      <rect x={sw.x-4} y={sw.y-4} width="8" height="8"
            fill="var(--bg-1)" stroke="var(--text-2)" strokeWidth="1" transform={`rotate(45 ${sw.x} ${sw.y})`} />
      <circle cx={sw.x} cy={sw.y} r="1.6"
              fill={sw.position === "diverge" ? "var(--warn)" : "var(--ok)"} />
    </g>
  );
}

function Train({ train, selected, onClick }) {
  const p = window.trainPosition(train);
  const typeColor = {
    IC:  "var(--accent)",
    ICD: "#9167e6",
    SPR: "var(--ok)",
    FR:  "var(--text-2)",
  }[train.type] || "var(--accent)";

  // direction arrow
  const rad = p.angle * Math.PI / 180;
  const len = 18;

  return (
    <g style={{ cursor: "pointer" }}
       onClick={(e) => { e.stopPropagation(); onClick({ type: "train", id: train.id }); }}>
      {selected && (
        <circle cx={p.x} cy={p.y} r="16" fill="var(--accent)" opacity="0.22">
          <animate attributeName="r" values="14;22;14" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.32;0.05;0.32" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
      <g transform={`translate(${p.x} ${p.y}) rotate(${p.angle})`}>
        {/* body */}
        <rect x="-9" y="-4.5" width="18" height="9" rx="2" fill={typeColor}
              stroke={train.warning ? "var(--warn)" : "var(--bg-0)"} strokeWidth={train.warning ? 1.6 : 0.8} />
        {/* nose */}
        <polygon points="9,-4.5 13,0 9,4.5" fill={typeColor}
                 stroke={train.warning ? "var(--warn)" : "var(--bg-0)"} strokeWidth={train.warning ? 1.6 : 0.8} />
        {/* windows */}
        <rect x="-6" y="-2.5" width="3" height="5" fill="rgba(255,255,255,0.4)" rx="0.3" />
        <rect x="-1.5" y="-2.5" width="3" height="5" fill="rgba(255,255,255,0.4)" rx="0.3" />
        <rect x="3" y="-2.5" width="3" height="5" fill="rgba(255,255,255,0.4)" rx="0.3" />
      </g>
      {/* label */}
      <g transform={`translate(${p.x + Math.cos(rad - Math.PI/2)*14}, ${p.y + Math.sin(rad - Math.PI/2)*14})`}>
        <rect x="-22" y="-7" width="44" height="14" rx="2" fill="var(--bg-1)"
              stroke={train.warning ? "var(--warn)" : "var(--border)"} strokeWidth="1" />
        <text x="0" y="3" textAnchor="middle" fontSize="9.5" fontWeight="600"
              fill="var(--text-1)" style={{ fontFamily: "var(--font-mono)" }}>
          {train.type} {train.number}
        </text>
      </g>
      {train.delay > 0 && (
        <g transform={`translate(${p.x + Math.cos(rad + Math.PI/2)*12}, ${p.y + Math.sin(rad + Math.PI/2)*12})`}>
          <rect x="-12" y="-6" width="24" height="12" rx="6"
                fill={train.delay >= 5 ? "var(--alarm)" : "var(--warn)"} />
          <text x="0" y="3" textAnchor="middle" fontSize="9" fontWeight="700"
                fill="white" style={{ fontFamily: "var(--font-mono)" }}>
            +{train.delay}
          </text>
        </g>
      )}
    </g>
  );
}

// Background — stylized coast / land / grid
function MapBackground() {
  return (
    <g>
      <rect x="0" y="0" width="1600" height="900" fill="var(--map-water)" />
      {/* land mass — rough Randstad shape */}
      <path d="M 0,0 L 1600,0 L 1600,900 L 1200,900 L 1150,850 L 1020,810
               L 920,760 L 820,720 L 720,680 L 620,640 L 500,600 L 380,560
               L 280,500 L 180,420 L 120,340 L 80,240 L 40,140 L 0,60 Z"
            fill="var(--map-land)" />
      {/* coastline accent */}
      <path d="M 0,60 L 40,140 L 80,240 L 120,340 L 180,420 L 280,500 L 380,560
               L 500,600 L 620,640 L 720,680 L 820,720 L 920,760 L 1020,810 L 1150,850 L 1200,900"
            fill="none" stroke="var(--border)" strokeWidth="1" opacity="0.6" />
      {/* grid */}
      <g opacity="0.35">
        {Array.from({length: 16}).map((_,i) => (
          <line key={"v"+i} x1={i*100} y1="0" x2={i*100} y2="900" stroke="var(--grid)" strokeWidth="0.5" />
        ))}
        {Array.from({length: 9}).map((_,i) => (
          <line key={"h"+i} x1="0" y1={i*100} x2="1600" y2={i*100} stroke="var(--grid)" strokeWidth="0.5" />
        ))}
      </g>
      {/* region labels */}
      <text x="60" y="70" fontSize="10" fill="var(--text-3)"
            style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.15em" }}>NOORDZEE</text>
      <text x="1400" y="500" fontSize="10" fill="var(--text-3)"
            style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.15em" }}>UTRECHT →</text>
      <text x="760" y="80" fontSize="11" fill="var(--text-2)"
            style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.2em", fontWeight: 600 }}>
        CORRIDOR · ASD — RTD
      </text>
    </g>
  );
}

function MapView({ trains, selection, onSelect, layers }) {
  const containerRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef(null);

  const occupancy = useMemo(() => computeOccupancy(trains), [trains]);

  const onPointerDown = (e) => {
    if (e.target.closest(".track-seg") || e.target.closest("[data-interactive]")) return;
    setIsDragging(true);
    dragState.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y };
    containerRef.current?.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!isDragging || !dragState.current) return;
    const dx = e.clientX - dragState.current.x;
    const dy = e.clientY - dragState.current.y;
    setTransform(t => ({ ...t, x: dragState.current.tx + dx, y: dragState.current.ty + dy }));
  };
  const onPointerUp = (e) => {
    setIsDragging(false);
    dragState.current = null;
    containerRef.current?.releasePointerCapture?.(e.pointerId);
  };
  const onWheel = (e) => {
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(t => {
      const newK = Math.max(0.5, Math.min(4, t.k * scaleFactor));
      const ratio = newK / t.k;
      return {
        k: newK,
        x: mx - (mx - t.x) * ratio,
        y: my - (my - t.y) * ratio,
      };
    });
  };

  const zoom = (factor) => {
    setTransform(t => {
      const rect = containerRef.current.getBoundingClientRect();
      const mx = rect.width/2;
      const my = rect.height/2;
      const newK = Math.max(0.5, Math.min(4, t.k * factor));
      const ratio = newK / t.k;
      return { k: newK, x: mx - (mx - t.x) * ratio, y: my - (my - t.y) * ratio };
    });
  };
  const resetView = () => setTransform({ x: 0, y: 0, k: 1 });

  return (
    <div ref={containerRef}
         onPointerDown={onPointerDown}
         onPointerMove={onPointerMove}
         onPointerUp={onPointerUp}
         onPointerCancel={onPointerUp}
         onWheel={onWheel}
         onClick={() => onSelect(null)}
         style={{
           position: "relative",
           width: "100%", height: "100%",
           background: "var(--map-bg)",
           overflow: "hidden",
           cursor: isDragging ? "grabbing" : "grab",
           touchAction: "none",
         }}>
      <svg viewBox="0 0 1600 900"
           preserveAspectRatio="xMidYMid meet"
           width="100%" height="100%"
           style={{
             transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
             transformOrigin: "0 0",
             transition: isDragging ? "none" : "transform 0.18s ease-out",
           }}>
        <MapBackground />

        {/* track segments */}
        <g>
          {window.SEGMENTS.map(seg =>
            <TrackSegment key={seg.id} seg={seg}
              occupancy={occupancy} layers={layers}
              selection={selection} onClick={onSelect} />
          )}
        </g>

        {/* switches */}
        {layers.switches && (
          <g>
            {window.SWITCHES.map(sw =>
              <Switch key={sw.id} sw={sw}
                selected={selection?.type === "switch" && selection.id === sw.id}
                onClick={onSelect} />
            )}
          </g>
        )}

        {/* signals */}
        {layers.signals && (
          <g>
            {window.SIGNALS.map(sig =>
              <Signal key={sig.id} sig={sig}
                selected={selection?.type === "signal" && selection.id === sig.id}
                onClick={onSelect} />
            )}
          </g>
        )}

        {/* stations */}
        <g>
          {window.STATIONS.map(s =>
            <StationGlyph key={s.id} s={s}
              selected={selection?.type === "station" && selection.id === s.id}
              onClick={onSelect} />
          )}
        </g>

        {/* trains */}
        {layers.trains && (
          <g>
            {trains.map(t =>
              <Train key={t.id} train={t}
                selected={selection?.type === "train" && selection.id === t.id}
                onClick={onSelect} />
            )}
          </g>
        )}

        {/* works marker */}
        {layers.works && (
          <g data-interactive>
            <rect x="1020" y="350" width="60" height="28" rx="3"
                  fill="var(--warn)" opacity="0.15"
                  stroke="var(--warn)" strokeDasharray="3 2" strokeWidth="1" />
            <text x="1050" y="368" textAnchor="middle" fontSize="9" fontWeight="600"
                  fill="var(--warn)" style={{ fontFamily: "var(--font-mono)" }}>WERK</text>
          </g>
        )}
      </svg>

      {/* Zoom controls */}
      <div data-interactive style={{
        position: "absolute", right: 16, bottom: 16,
        display: "flex", flexDirection: "column", gap: 4,
        background: "var(--bg-1)", border: "1px solid var(--border)",
        borderRadius: 6, padding: 4, boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
      }}>
        <button onClick={(e)=>{e.stopPropagation(); zoom(1.3);}} style={zoomBtn}>＋</button>
        <button onClick={(e)=>{e.stopPropagation(); zoom(0.77);}} style={zoomBtn}>−</button>
        <button onClick={(e)=>{e.stopPropagation(); resetView();}} style={{...zoomBtn, fontSize: 10}}>⟲</button>
      </div>

      {/* Zoom level indicator */}
      <div data-interactive style={{
        position: "absolute", right: 16, top: 16,
        padding: "4px 8px", background: "var(--bg-1)",
        border: "1px solid var(--border)", borderRadius: 4,
        fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-2)",
      }}>
        ZOOM {(transform.k*100).toFixed(0)}%
      </div>

      {/* Legend */}
      <div data-interactive style={{
        position: "absolute", left: 16, bottom: 16,
        padding: "8px 12px", background: "var(--bg-1)",
        border: "1px solid var(--border)", borderRadius: 6,
        fontSize: 10.5, display: "flex", gap: 14, alignItems: "center",
      }}>
        <span style={legendLabel}><span style={{...legendSwatch, background: "var(--track-occupied)"}}/>Bezet</span>
        <span style={legendLabel}><span style={{...legendSwatch, background: "var(--track-free)"}}/>Vrij</span>
        <span style={legendLabel}><span style={{...legendSwatch, background: "var(--track-fault)"}}/>Storing</span>
        <span style={{width: 1, height: 14, background: "var(--border)"}}/>
        <span style={legendLabel}><span style={{...legendSwatch, background: "var(--accent)", borderRadius: 2}}/>IC</span>
        <span style={legendLabel}><span style={{...legendSwatch, background: "#9167e6", borderRadius: 2}}/>ICD</span>
        <span style={legendLabel}><span style={{...legendSwatch, background: "var(--ok)", borderRadius: 2}}/>SPR</span>
        <span style={legendLabel}><span style={{...legendSwatch, background: "var(--text-2)", borderRadius: 2}}/>FR</span>
      </div>
    </div>
  );
}

const zoomBtn = {
  width: 28, height: 28, border: "none", borderRadius: 4,
  background: "var(--bg-2)", color: "var(--text-1)",
  fontSize: 14, fontWeight: 600, cursor: "pointer",
  fontFamily: "var(--font-ui)",
};
const legendLabel = { display: "inline-flex", alignItems: "center", gap: 5, color: "var(--text-2)" };
const legendSwatch = { width: 12, height: 3, borderRadius: 2, display: "inline-block" };

window.MapView = MapView;
