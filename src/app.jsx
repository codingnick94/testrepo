// TIBS-SB main app

const { useState, useEffect, useMemo, useCallback } = React;

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("tibs-theme") || "dark");
  const [selection, setSelection] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("alle");
  const [layers, setLayers] = useState({
    trains: true, signals: true, switches: true, works: true,
  });
  const [alarms, setAlarms] = useState(window.ALARMS);
  const [tick, setTick] = useState(0);
  const [clock, setClock] = useState("14:32:18");

  // apply theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("tibs-theme", theme);
  }, [theme]);

  // animate trains (nudge progress)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // tick clock
  useEffect(() => {
    const id = setInterval(() => {
      const base = new Date();
      base.setHours(14, 32, 18);
      base.setSeconds(base.getSeconds() + tick);
      const hh = String(base.getHours()).padStart(2,"0");
      const mm = String(base.getMinutes()).padStart(2,"0");
      const ss = String(base.getSeconds()).padStart(2,"0");
      setClock(`${hh}:${mm}:${ss}`);
    }, 250);
    return () => clearInterval(id);
  }, [tick]);

  const trains = useMemo(() => {
    const speedFactor = (window.__TWEAKS?.trainSpeed ?? 1);
    const animated = window.TRAINS.map(t => ({
      ...t,
      // slowly advance progress — clamp so they don't fly off
      progress: Math.min(0.995, t.progress + (tick * 0.0004 * speedFactor)),
    }));
    return filter === "alle" ? animated : animated.filter(t => t.type === filter);
  }, [tick, filter]);

  const handleAlarmClick = useCallback((a) => {
    if (a.target) setSelection(a.target);
  }, []);
  const handleAckAlarm = useCallback((id) => {
    setAlarms(list => list.map(a => a.id === id ? { ...a, ack: true } : a));
  }, []);

  const activeAlarmsCount = alarms.filter(a => !a.ack).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-0)" }}>
      <window.TopBar
        theme={theme}
        onTheme={() => setTheme(t => t === "dark" ? "light" : "dark")}
        search={search}
        onSearch={setSearch}
        onResult={(sel) => setSelection(sel)}
        time={clock}
        active="ma 20 apr · dienst 042"
        trainsTotal={trains.length}
        alarmsCount={activeAlarmsCount}
      />

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <window.Sidebar
          layers={layers} onLayers={setLayers}
          filter={filter} onFilter={setFilter}
          alarms={alarms}
          onAlarmClick={handleAlarmClick}
          onAckAlarm={handleAckAlarm}
        />
        <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
          <window.MapView
            trains={trains}
            selection={selection}
            onSelect={setSelection}
            layers={layers}
          />
          {/* subtle status bar at bottom of map */}
          <div style={{
            position: "absolute", left: 16, top: 16,
            padding: "8px 12px", background: "var(--bg-1)",
            border: "1px solid var(--border)", borderRadius: 6,
            display: "flex", gap: 14, alignItems: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ok)",
                boxShadow: "0 0 6px var(--ok)" }} />
              <span style={{ fontSize: 11, fontWeight: 600 }}>Systeem operationeel</span>
            </div>
            <div style={{ width: 1, height: 14, background: "var(--border)" }} />
            <span style={{ fontSize: 10.5, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
              TIBS-SB v4.2.1 · Laatste sync {clock}
            </span>
          </div>
        </div>
        <window.DetailPanel
          selection={selection}
          onClose={() => setSelection(null)}
        />
      </div>
    </div>
  );
}

// Wait until all sibling babel scripts have attached their exports to window
function mount() {
  if (!window.MapView || !window.TopBar || !window.Sidebar || !window.DetailPanel || !window.TRAINS) {
    return setTimeout(mount, 30);
  }
  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
}
mount();
