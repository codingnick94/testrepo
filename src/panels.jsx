// TIBS-SB panels: top bar, sidebar (layers/filter/alarms), detail pane

const { useMemo } = React;

// ---------- TOP BAR ----------
function TopBar({ theme, onTheme, search, onSearch, onResult, time, active, trainsTotal, alarmsCount }) {
  const results = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.trim().toLowerCase();
    return window.TRAINS.filter(t =>
      t.number.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      t.type.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [search]);

  return (
    <div style={{
      display: "flex", alignItems: "center", height: 56,
      padding: "0 16px", background: "var(--bg-1)",
      borderBottom: "1px solid var(--border)",
      gap: 16, flexShrink: 0, position: "relative", zIndex: 10,
    }}>
      {/* Logo / system name */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 6,
          background: "var(--accent)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontWeight: 700, fontSize: 12,
          fontFamily: "var(--font-mono)",
        }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 3 L6 15 M18 3 L18 15 M6 9 L18 9 M9 21 L6 15 M15 21 L18 15"/>
            <circle cx="9" cy="13" r="0.8" fill="white" stroke="none"/>
            <circle cx="15" cy="13" r="0.8" fill="white" stroke="none"/>
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.02em" }}>TIBS-SB</div>
          <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
            Treininformatie &amp; Besturingssysteem
          </div>
        </div>
      </div>

      <div style={{ width: 1, height: 28, background: "var(--border)" }} />

      {/* Active post / region */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Post</span>
        <span style={{ fontSize: 12, fontWeight: 600 }}>Randstad Zuid</span>
        <span style={{
          marginLeft: 4, padding: "2px 6px", borderRadius: 3,
          background: "var(--accent-soft)", color: "var(--accent)",
          fontSize: 10, fontWeight: 600, fontFamily: "var(--font-mono)",
        }}>ASD — RTD</span>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginLeft: 12, flex: "0 1 320px" }}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"
             style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-3)" }}>
          <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input value={search} onChange={(e) => onSearch(e.target.value)}
          placeholder="Zoek treinnummer of dienst…"
          style={{
            width: "100%", height: 34, padding: "0 10px 0 30px",
            background: "var(--bg-2)", border: "1px solid var(--border)",
            borderRadius: 5, color: "var(--text-1)",
            fontFamily: "var(--font-mono)", fontSize: 12,
            outline: "none",
          }} />
        {results.length > 0 && (
          <div style={{
            position: "absolute", top: 38, left: 0, right: 0,
            background: "var(--bg-1)", border: "1px solid var(--border)",
            borderRadius: 5, boxShadow: "0 6px 24px rgba(0,0,0,0.2)",
            maxHeight: 260, overflow: "auto", zIndex: 20,
          }}>
            {results.map(t => (
              <div key={t.id}
                onClick={() => { onResult({ type: "train", id: t.id }); onSearch(""); }}
                style={{
                  padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid var(--border)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 12 }}>
                    {t.type} {t.number}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>{t.from} → {t.to}</div>
                </div>
                {t.delay > 0 && (
                  <span style={{
                    padding: "2px 6px", borderRadius: 3, fontSize: 10, fontWeight: 600,
                    background: t.delay >= 5 ? "var(--alarm-soft)" : "rgba(245,181,68,0.15)",
                    color: t.delay >= 5 ? "var(--alarm)" : "var(--warn)",
                    fontFamily: "var(--font-mono)",
                  }}>
                    +{t.delay}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* Status pills */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <StatusPill label="Treinen" value={trainsTotal} tone="info" />
        <StatusPill label="Storingen" value={alarmsCount} tone={alarmsCount > 0 ? "alarm" : "ok"} />
        <StatusPill label="Op tijd" value="83%" tone="warn" />
      </div>

      <div style={{ width: 1, height: 28, background: "var(--border)" }} />

      {/* Clock */}
      <div style={{ fontFamily: "var(--font-mono)", textAlign: "right" }}>
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.02em" }}>{time}</div>
        <div style={{ fontSize: 10, color: "var(--text-3)" }}>{active}</div>
      </div>

      {/* Theme toggle */}
      <button onClick={onTheme} style={{
        width: 34, height: 34, border: "1px solid var(--border)",
        borderRadius: 5, background: "var(--bg-2)", color: "var(--text-1)",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
      }} title="Thema wisselen">
        {theme === "dark" ? (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        )}
      </button>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "4px 10px",
        borderRadius: 20, background: "var(--bg-2)", border: "1px solid var(--border)",
      }}>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--accent)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontWeight: 600, fontSize: 11, fontFamily: "var(--font-ui)" }}>JV</div>
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ fontSize: 11, fontWeight: 600 }}>J. Verhoeven</div>
          <div style={{ fontSize: 9.5, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>Treindienstleider</div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ label, value, tone }) {
  const tones = {
    info: { bg: "var(--accent-soft)", fg: "var(--accent)" },
    ok:   { bg: "rgba(60,201,138,0.12)", fg: "var(--ok)" },
    warn: { bg: "rgba(245,181,68,0.15)", fg: "var(--warn)" },
    alarm:{ bg: "var(--alarm-soft)", fg: "var(--alarm)" },
  }[tone];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "4px 10px", borderRadius: 20,
      background: tones.bg, color: tones.fg,
    }}>
      <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{label}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 12 }}>{value}</span>
    </div>
  );
}

// ---------- SIDEBAR ----------
function Sidebar({ layers, onLayers, filter, onFilter, alarms, onAlarmClick, onAckAlarm }) {
  return (
    <div style={{
      width: 280, background: "var(--bg-1)",
      borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column", flexShrink: 0,
      overflow: "hidden",
    }}>
      <SidebarSection title="Lagen" icon="layers">
        <LayerToggle label="Treinen" active={layers.trains}
          onClick={() => onLayers({ ...layers, trains: !layers.trains })} />
        <LayerToggle label="Seinen" active={layers.signals}
          onClick={() => onLayers({ ...layers, signals: !layers.signals })} />
        <LayerToggle label="Wissels" active={layers.switches}
          onClick={() => onLayers({ ...layers, switches: !layers.switches })} />
        <LayerToggle label="Werkzaamheden" active={layers.works}
          onClick={() => onLayers({ ...layers, works: !layers.works })} />
      </SidebarSection>

      <SidebarSection title="Filter treinen">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {["alle","IC","ICD","SPR","FR"].map(t => (
            <button key={t} onClick={() => onFilter(t)}
              style={{
                padding: "4px 10px", fontSize: 11, fontWeight: 600,
                border: "1px solid " + (filter === t ? "var(--accent)" : "var(--border)"),
                borderRadius: 4,
                background: filter === t ? "var(--accent-soft)" : "var(--bg-2)",
                color: filter === t ? "var(--accent)" : "var(--text-2)",
                fontFamily: "var(--font-mono)", cursor: "pointer",
              }}>{t.toUpperCase()}</button>
          ))}
        </div>
      </SidebarSection>

      <SidebarSection title={`Storingen & meldingen (${alarms.filter(a => !a.ack).length})`} flex>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, overflow: "auto", paddingRight: 2 }}>
          {alarms.map(a => <AlarmCard key={a.id} a={a} onClick={() => onAlarmClick(a)} onAck={() => onAckAlarm(a.id)} />)}
        </div>
      </SidebarSection>
    </div>
  );
}

function SidebarSection({ title, children, flex, icon }) {
  return (
    <div style={{
      padding: "12px 14px",
      borderBottom: "1px solid var(--border)",
      display: "flex", flexDirection: "column", gap: 8,
      flex: flex ? 1 : "initial",
      minHeight: 0, overflow: "hidden",
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
        color: "var(--text-3)",
      }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, overflow: "hidden", flex: flex ? 1 : "initial", minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}

function LayerToggle({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "6px 8px", border: "none", borderRadius: 4,
      background: "transparent", color: "var(--text-1)",
      cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 12,
      textAlign: "left",
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
      <div style={{
        width: 30, height: 16, borderRadius: 9,
        background: active ? "var(--accent)" : "var(--bg-3)",
        position: "relative", transition: "background 0.15s",
      }}>
        <div style={{
          position: "absolute", top: 2, left: active ? 16 : 2,
          width: 12, height: 12, borderRadius: "50%",
          background: "white", transition: "left 0.15s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }} />
      </div>
      <span>{label}</span>
    </button>
  );
}

function AlarmCard({ a, onClick, onAck }) {
  const tones = {
    alarm:   { bg: "var(--alarm-soft)", fg: "var(--alarm)", bar: "var(--alarm)" },
    warning: { bg: "rgba(245,181,68,0.12)", fg: "var(--warn)", bar: "var(--warn)" },
    info:    { bg: "var(--bg-2)", fg: "var(--text-2)", bar: "var(--accent)" },
  }[a.severity];
  return (
    <div onClick={onClick} style={{
      display: "flex", gap: 10, padding: "8px 10px",
      background: a.ack ? "var(--bg-2)" : tones.bg,
      borderRadius: 5, cursor: "pointer",
      border: "1px solid " + (a.ack ? "var(--border)" : "transparent"),
      opacity: a.ack ? 0.55 : 1, position: "relative",
    }}>
      <div style={{ width: 3, borderRadius: 2, background: tones.bar, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, fontFamily: "var(--font-mono)",
            color: tones.fg, letterSpacing: "0.05em" }}>{a.code}</span>
          <span style={{ fontSize: 9.5, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{a.time}</span>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2, color: "var(--text-1)" }}>{a.title}</div>
        <div style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.35 }}>{a.desc}</div>
        {!a.ack && (
          <button onClick={(e) => { e.stopPropagation(); onAck(); }} style={{
            marginTop: 6, padding: "3px 8px", fontSize: 10, fontWeight: 600,
            border: "1px solid " + tones.fg, borderRadius: 3,
            background: "transparent", color: tones.fg, cursor: "pointer",
            fontFamily: "var(--font-mono)", letterSpacing: "0.05em",
          }}>BEVESTIGEN</button>
        )}
      </div>
    </div>
  );
}

// ---------- DETAIL PANEL ----------
function DetailPanel({ selection, onClose }) {
  if (!selection) return null;
  let content = null;
  if (selection.type === "train")   content = <TrainDetail id={selection.id} />;
  if (selection.type === "signal")  content = <SignalDetail id={selection.id} />;
  if (selection.type === "switch")  content = <SwitchDetail id={selection.id} />;
  if (selection.type === "segment") content = <SegmentDetail id={selection.id} />;
  if (selection.type === "station") content = <StationDetail id={selection.id} />;
  return (
    <div style={{
      width: 360, background: "var(--bg-1)",
      borderLeft: "1px solid var(--border)",
      display: "flex", flexDirection: "column", flexShrink: 0,
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 14px", borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
          textTransform: "uppercase", color: "var(--text-3)" }}>Detail</div>
        <button onClick={onClose} style={{
          width: 24, height: 24, border: "none", borderRadius: 3,
          background: "transparent", color: "var(--text-2)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onMouseEnter={e=>e.currentTarget.style.background="var(--bg-hover)"}
           onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>{content}</div>
    </div>
  );
}

function KV({ k, v, mono }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: 11, color: "var(--text-3)" }}>{k}</span>
      <span style={{ fontSize: 12, fontWeight: 500,
        fontFamily: mono ? "var(--font-mono)" : "var(--font-ui)", color: "var(--text-1)" }}>{v}</span>
    </div>
  );
}

function TrainDetail({ id }) {
  const t = window.TRAINS.find(x => x.id === id);
  if (!t) return null;
  const stops = window.TRAIN_STOPS[id] || [];
  const typeColor = { IC: "var(--accent)", ICD: "#9167e6", SPR: "var(--ok)", FR: "var(--text-2)" }[t.type];
  return (
    <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
          <span style={{
            padding: "3px 7px", fontSize: 10, fontWeight: 700,
            background: typeColor, color: "white", borderRadius: 3,
            fontFamily: "var(--font-mono)", letterSpacing: "0.05em",
          }}>{t.type}</span>
          <span style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{t.number}</span>
          {t.delay > 0 && (
            <span style={{
              marginLeft: "auto", padding: "3px 8px", borderRadius: 3,
              background: t.delay >= 5 ? "var(--alarm-soft)" : "rgba(245,181,68,0.15)",
              color: t.delay >= 5 ? "var(--alarm)" : "var(--warn)",
              fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)",
            }}>+{t.delay} min</span>
          )}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-2)" }}>
          {t.from} → <b style={{ color: "var(--text-1)" }}>{t.to}</b>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <MetricBox label="Snelheid" value={`${t.speed}`} unit="km/u" />
        <MetricBox label="Richting" value={t.dir === "S" ? "Zuid" : "Noord"} />
        <MetricBox label="Voortgang" value={`${(t.progress*100).toFixed(0)}`} unit="%" />
        <MetricBox label="Vertraging" value={`+${t.delay}`} unit="min"
          tone={t.delay >= 5 ? "alarm" : t.delay > 0 ? "warn" : "ok"} />
      </div>

      <div>
        <div style={sectionLbl}>Dienstregeling</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {stops.map((s, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "20px 1fr auto auto",
              alignItems: "center", gap: 8, padding: "7px 0",
              borderBottom: i < stops.length-1 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%",
                  background: s.status === "vertrokken" ? "var(--text-3)"
                            : s.status === "actueel" ? "var(--accent)" : "var(--bg-3)",
                  border: s.status === "actueel" ? "2px solid var(--accent)" : "1px solid var(--border-strong)",
                  boxShadow: s.status === "actueel" ? "0 0 0 3px var(--accent-soft)" : "none",
                }} />
                {i < stops.length-1 && (
                  <div style={{ width: 1, flex: 1, minHeight: 6,
                    background: s.status === "vertrokken" ? "var(--text-3)" : "var(--border)" }} />
                )}
              </div>
              <div style={{ fontSize: 12, fontWeight: 500,
                color: s.status === "vertrokken" ? "var(--text-3)" : "var(--text-1)" }}>{s.station}</div>
              <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-3)" }}>
                spoor {s.platform}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11,
                color: s.act !== s.sched ? "var(--warn)" : "var(--text-1)", textAlign: "right" }}>
                {s.sched !== s.act && <span style={{ textDecoration: "line-through", color: "var(--text-3)", marginRight: 5 }}>{s.sched}</span>}
                {s.act}
              </div>
            </div>
          ))}
          {stops.length === 0 && <div style={{ fontSize: 11, color: "var(--text-3)", padding: "6px 0" }}>Geen halteinformatie beschikbaar.</div>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <ActionBtn>Volg trein</ActionBtn>
        <ActionBtn>Plaats routeverzoek</ActionBtn>
      </div>
    </div>
  );
}

function SignalDetail({ id }) {
  const sig = window.SIGNALS.find(s => s.id === id);
  if (!sig) return null;
  const stateLabel = { green: "Groen — rijden", yellow: "Geel — remmen", red: "Rood — stop", fault: "STORING" }[sig.state];
  const stateColor = { green: "var(--signal-green)", yellow: "var(--signal-yellow)", red: "var(--signal-red)", fault: "var(--alarm)" }[sig.state];
  return (
    <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 2 }}>Sein</div>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{sig.label}</div>
        <div style={{ fontSize: 12, color: "var(--text-2)" }}>Richting {sig.dir === "N" ? "Noord" : sig.dir === "S" ? "Zuid" : "Oost"}</div>
      </div>
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: 14, background: "var(--bg-2)", borderRadius: 6,
        border: "1px solid var(--border)",
      }}>
        <div style={{ width: 44, height: 72, background: "var(--bg-3)", borderRadius: 4,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
          border: "1px solid var(--border-strong)" }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%",
            background: sig.state === "red" || sig.state === "fault" ? stateColor : "var(--bg-0)",
            boxShadow: sig.state === "red" ? "0 0 10px var(--signal-red)" : "none" }} />
          <div style={{ width: 14, height: 14, borderRadius: "50%",
            background: sig.state === "yellow" ? stateColor : "var(--bg-0)",
            boxShadow: sig.state === "yellow" ? "0 0 8px var(--signal-yellow)" : "none" }} />
          <div style={{ width: 14, height: 14, borderRadius: "50%",
            background: sig.state === "green" ? stateColor : "var(--bg-0)",
            boxShadow: sig.state === "green" ? "0 0 8px var(--signal-green)" : "none" }} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Status</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: stateColor }}>{stateLabel}</div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
            sinds {sig.state === "fault" ? "14:23" : "14:31"}
          </div>
        </div>
      </div>

      <div>
        <div style={sectionLbl}>Eigenschappen</div>
        <KV k="Type" v="Hoofdsein" />
        <KV k="Baanvak" v={sig.dir === "N" ? "Ledn-Ass" : "Ass-Rtd"} mono />
        <KV k="Kilometrering" v="34.812" mono />
        <KV k="Baanvlak" v="Beschikbaar" />
        <KV k="Laatste wijziging" v="14:18" mono />
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <ActionBtn>Overrule: groen</ActionBtn>
        <ActionBtn danger>Stophandeling</ActionBtn>
      </div>
    </div>
  );
}

function SwitchDetail({ id }) {
  const sw = window.SWITCHES.find(s => s.id === id);
  if (!sw) return null;
  return (
    <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 2 }}>Wissel</div>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{sw.label}</div>
      </div>
      <div style={{ padding: 14, background: "var(--bg-2)", borderRadius: 6, border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Stand</div>
        <div style={{ display: "flex", gap: 8 }}>
          <StandBtn active={sw.position === "straight"} label="Rechtdoor" />
          <StandBtn active={sw.position === "diverge"} label="Afbuigend" />
        </div>
        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 8, fontFamily: "var(--font-mono)" }}>
          Vergrendeld • laatste omloop 14:11
        </div>
      </div>
      <div>
        <div style={sectionLbl}>Eigenschappen</div>
        <KV k="Type" v="Engels wissel" />
        <KV k="Bediening" v="Centraal" />
        <KV k="Storingsvrij" v="94 dagen" mono />
        <KV k="Verwarming" v="Aan · 8°C" mono />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <ActionBtn>Rijweg instellen</ActionBtn>
        <ActionBtn>Ontkoppelen</ActionBtn>
      </div>
    </div>
  );
}

function SegmentDetail({ id }) {
  const seg = window.SEGMENTS.find(s => s.id === id);
  if (!seg) return null;
  const a = window.stationById(seg.from);
  const b = window.stationById(seg.to);
  return (
    <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 2 }}>Baanvak</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{a?.code} — {b?.code}</div>
        <div style={{ fontSize: 12, color: "var(--text-2)" }}>{a?.name} ↔ {b?.name}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <MetricBox label="Sporen" value={String(seg.tracks)} />
        <MetricBox label="Lengte" value="12,4" unit="km" />
        <MetricBox label="Max snelheid" value="140" unit="km/u" />
        <MetricBox label="Beveiliging" value="ATB-EG" />
      </div>
      <div>
        <div style={sectionLbl}>Bezettingsgeschiedenis</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {window.OCCUPANCY_HISTORY.map((h, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "48px 1fr auto",
              gap: 8, padding: "6px 0",
              borderBottom: i < window.OCCUPANCY_HISTORY.length-1 ? "1px solid var(--border)" : "none",
            }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>{h.time}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 500 }}>{h.train}</span>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 3,
                background: h.event === "Bezet" ? "var(--accent-soft)"
                          : h.event === "Gereserveerd" ? "rgba(145,103,230,0.15)"
                          : "rgba(60,201,138,0.12)",
                color: h.event === "Bezet" ? "var(--accent)"
                     : h.event === "Gereserveerd" ? "#9167e6" : "var(--ok)",
                fontFamily: "var(--font-mono)",
              }}>{h.event.toUpperCase()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StationDetail({ id }) {
  const s = window.stationById(id);
  if (!s) return null;
  return (
    <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 2 }}>Station</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{s.name}</div>
        <div style={{ fontSize: 12, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>{s.code.toUpperCase()}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <MetricBox label="Sporen" value={String(s.tracks)} />
        <MetricBox label="Type" value={s.major ? "Hoofd" : "Tussen"} />
      </div>
      <div style={{ fontSize: 11, color: "var(--text-3)" }}>
        Klik op een sein, wissel of baanvak in de buurt voor meer details.
      </div>
    </div>
  );
}

function MetricBox({ label, value, unit, tone }) {
  const tones = {
    ok: "var(--ok)", warn: "var(--warn)", alarm: "var(--alarm)",
  };
  return (
    <div style={{
      padding: "10px 12px", background: "var(--bg-2)",
      border: "1px solid var(--border)", borderRadius: 5,
    }}>
      <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginTop: 4 }}>
        <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-mono)",
          color: tone ? tones[tone] : "var(--text-1)" }}>{value}</span>
        {unit && <span style={{ fontSize: 11, color: "var(--text-3)" }}>{unit}</span>}
      </div>
    </div>
  );
}

function StandBtn({ active, label }) {
  return (
    <div style={{
      flex: 1, padding: "8px 10px", textAlign: "center",
      border: "1px solid " + (active ? "var(--accent)" : "var(--border)"),
      background: active ? "var(--accent-soft)" : "var(--bg-1)",
      color: active ? "var(--accent)" : "var(--text-2)",
      fontSize: 11, fontWeight: 600, borderRadius: 4,
      fontFamily: "var(--font-mono)",
    }}>{label.toUpperCase()}</div>
  );
}

function ActionBtn({ children, danger }) {
  return (
    <button style={{
      flex: 1, padding: "8px 10px", fontSize: 11, fontWeight: 600,
      border: "1px solid " + (danger ? "var(--alarm)" : "var(--border-strong)"),
      borderRadius: 4,
      background: danger ? "transparent" : "var(--bg-2)",
      color: danger ? "var(--alarm)" : "var(--text-1)",
      cursor: "pointer", fontFamily: "var(--font-ui)",
      letterSpacing: "0.02em",
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = danger ? "var(--alarm-soft)" : "var(--bg-hover)"}
    onMouseLeave={(e) => e.currentTarget.style.background = danger ? "transparent" : "var(--bg-2)"}>
      {children}
    </button>
  );
}

const sectionLbl = {
  fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
  color: "var(--text-3)", marginBottom: 6,
};

Object.assign(window, { TopBar, Sidebar, DetailPanel });
