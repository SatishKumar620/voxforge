import { useState, useEffect, useRef, useCallback } from "react";

const api = async (path, opts = {}) => {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
};

const VOICES = [
  { id: "en-US-marcus",  name: "Marcus",  tone: "Deep & authoritative",   accent: "American",   emoji: "🎤" },
  { id: "en-US-terrell", name: "Terrell", tone: "Bold & energetic",       accent: "American",   emoji: "🎙" },
  { id: "en-GB-alfie",   name: "Alfie",   tone: "Warm & professional",    accent: "British",    emoji: "🔊" },
  { id: "en-US-natalie", name: "Natalie", tone: "Clear & conversational", accent: "American",   emoji: "🎧" },
  { id: "en-GB-hazel",   name: "Hazel",   tone: "Rich & compelling",      accent: "British",    emoji: "🎵" },
  { id: "en-AU-jack",    name: "Jack",    tone: "Crisp & engaging",       accent: "Australian", emoji: "📻" },
];

const CATEGORIES = ["Technology","Business","Health & Wellness","Science","True Crime","Comedy","Education","Culture","Finance","Sports"];

function WaveBar({ active, i }) {
  const base = Math.sin(i * 0.7) * 0.4 + 0.6;
  return (
    <div style={{
      width: 3, borderRadius: 2,
      background: active ? "#f97316" : "#2a2218",
      height: active ? undefined : `${base * 14 + 5}px`,
      animation: active ? `wv ${0.55 + (i % 6) * 0.1}s ease-in-out infinite alternate` : "none",
      animationDelay: `${i * 0.035}s`,
      "--lo": `${base * 6 + 3}px`, "--hi": `${base * 30 + 8}px`,
      minHeight: active ? "var(--lo)" : undefined,
      maxHeight: active ? "var(--hi)" : undefined,
      transition: "background 0.3s", flexShrink: 0,
    }} />
  );
}

function Waveform({ active, bars = 32 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2.5, height: 44 }}>
      {Array.from({ length: bars }).map((_, i) => <WaveBar key={i} i={i} active={active} />)}
      <style>{`@keyframes wv{from{height:var(--lo)}to{height:var(--hi)}}`}</style>
    </div>
  );
}

function Ring({ pct, size = 52, stroke = 4, color = "#f97316" }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1a1510" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={c*(1-pct/100)}
        style={{ transition: "stroke-dashoffset 0.35s ease" }} strokeLinecap="round" />
    </svg>
  );
}

function Badge({ ok, label }) {
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:20,fontSize:11,
      background: ok?"#0d1a0d":"#1a0e00", border:`1px solid ${ok?"#1e3a1e":"#3a1e00"}`,
      color: ok?"#4ade80":"#f97316",
    }}>{ok?"✓":"✗"} {label}</span>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background:"#0e0b07", border:"1px solid #1e1a12", borderRadius:14,
      position:"relative", overflow:"hidden", ...style,
    }}>
      <div style={{ position:"absolute",inset:0,pointerEvents:"none",
        background:"linear-gradient(135deg,rgba(249,115,22,.025) 0%,transparent 55%)" }} />
      {children}
    </div>
  );
}

function Err({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ margin:"12px 0 0",padding:"10px 14px",background:"#1a0808",
      border:"1px solid #4a1a1a",borderRadius:8,color:"#f87171",fontSize:13,lineHeight:1.5 }}>
      ⚠ {msg}
    </div>
  );
}

function StepDot({ n, done, active, label }) {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:22 }}>
      <span style={{
        width:26,height:26,borderRadius:"50%",flexShrink:0,
        background: done?"#16a34a":active?"#f97316":"#1a1510",
        border:`2px solid ${done?"#16a34a":active?"#f97316":"#2a2218"}`,
        color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:11,fontWeight:700,
        animation: active?"pr 2s infinite":"none",
      }}>{done?"✓":n}</span>
      <span style={{ fontSize:12,letterSpacing:".1em",textTransform:"uppercase",
        color: done?"#6b8f6b":active?"#e8d4c0":"#4a4236" }}>{label}</span>
      <style>{`@keyframes pr{0%{box-shadow:0 0 0 0 rgba(249,115,22,.35)}70%{box-shadow:0 0 0 10px rgba(249,115,22,0)}100%{box-shadow:0 0 0 0 rgba(249,115,22,0)}}`}</style>
    </div>
  );
}

export default function App() {
  const [stage, setStage] = useState("idle");
  const [health, setHealth] = useState(null);
  const [idea, setIdea] = useState("");
  const [category, setCategory] = useState("Technology");
  const [duration, setDuration] = useState("10");
  const [voice, setVoice] = useState(VOICES[0]);
  const [pitch, setPitch] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [scriptData, setScriptData] = useState(null);
  const [scriptPct, setScriptPct] = useState(0);
  const [narPct, setNarPct] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioFilename, setAudioFilename] = useState(null);
  const [isRealAudio, setIsRealAudio] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playPct, setPlayPct] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);
  const demoRef = useRef(null);
  const [publishResult, setPublishResult] = useState(null);
  const [publishPct, setPublishPct] = useState(0);
  const [episodes, setEpisodes] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/health").then(r=>r.json()).then(setHealth).catch(()=>{});
    fetch("/api/episodes").then(r=>r.json()).then(setEpisodes).catch(()=>{});
  }, []);

  const reset = useCallback(() => {
    setStage("idle"); setScriptData(null); setScriptPct(0);
    setNarPct(0); setAudioUrl(null); setAudioFilename(null); setIsRealAudio(false);
    setPlaying(false); setPlayPct(0); setCurrentTime(0); setAudioDuration(0);
    setPublishResult(null); setPublishPct(0); setError("");
    clearInterval(demoRef.current);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src=""; }
  }, []);

  // Step 1 — Script
  const generateScript = async () => {
    if (!idea.trim()) { setError("Please enter a podcast idea first."); return; }
    setError(""); setStage("scripting"); setScriptPct(0);
    const tick = setInterval(() => setScriptPct(p => Math.min(p+1.5,88)), 100);
    try {
      const data = await api("/script/generate", { method:"POST", body:{ idea, category, duration, voiceTone:voice.tone } });
      clearInterval(tick); setScriptPct(100);
      setScriptData(data); setStage("script_done");
    } catch(e) { clearInterval(tick); setError(e.message); setStage("idle"); }
  };

  // Step 2 — Narration
  const generateNarration = async () => {
    setError(""); setStage("narrating"); setNarPct(0);
    const tick = setInterval(() => setNarPct(p => Math.min(p+0.8,88)), 150);
    try {
      const data = await api("/narration/generate", { method:"POST", body:{ script:scriptData.script, voiceId:voice.id, pitch, speed } });
      clearInterval(tick); setNarPct(100);
      setAudioUrl(data.audioUrl); setAudioFilename(data.filename);
      setIsRealAudio(true); setStage("narration_done");
    } catch(e) {
      clearInterval(tick);
      if (e.message.includes("MURF_API_KEY")) {
        setNarPct(100); setIsRealAudio(false); setStage("narration_done");
        setError("Murf API key not set — demo player shown. Add MURF_API_KEY for real audio.");
      } else { setError(e.message); setStage("script_done"); }
    }
  };

  // Step 3 — Publish
  const publishEpisode = async () => {
    setError(""); setStage("publishing"); setPublishPct(0);
    const tick = setInterval(() => setPublishPct(p => Math.min(p+2,88)), 120);
    try {
      const data = await api("/publish", { method:"POST", body:{
        title:scriptData.title, description:scriptData.description,
        tags:scriptData.tags, audioFilename, duration, category,
      }});
      clearInterval(tick); setPublishPct(100);
      setPublishResult(data); setStage("published");
      fetch("/api/episodes").then(r=>r.json()).then(setEpisodes).catch(()=>{});
    } catch(e) { clearInterval(tick); setError(e.message); setStage("narration_done"); }
  };

  // Player
  const togglePlay = () => {
    if (isRealAudio && audioRef.current) {
      if (playing) { audioRef.current.pause(); setPlaying(false); }
      else { audioRef.current.play().catch(()=>{}); setPlaying(true); }
    } else {
      if (playing) { clearInterval(demoRef.current); setPlaying(false); }
      else {
        setPlaying(true);
        demoRef.current = setInterval(() => {
          setPlayPct(p => { if(p>=100){clearInterval(demoRef.current);setPlaying(false);return 0;} return p+0.25; });
        }, 80);
      }
    }
  };

  useEffect(() => {
    const el = audioRef.current; if(!el) return;
    const onTime = () => { setCurrentTime(el.currentTime); setPlayPct((el.currentTime/el.duration)*100||0); };
    const onLoad = () => setAudioDuration(el.duration);
    const onEnd  = () => { setPlaying(false); setPlayPct(0); setCurrentTime(0); };
    el.addEventListener("timeupdate",onTime); el.addEventListener("loadedmetadata",onLoad); el.addEventListener("ended",onEnd);
    return () => { el.removeEventListener("timeupdate",onTime); el.removeEventListener("loadedmetadata",onLoad); el.removeEventListener("ended",onEnd); };
  }, [audioUrl]);

  useEffect(()=>()=>clearInterval(demoRef.current),[]);

  const fmt = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;
  const estWords = scriptData?.script ? scriptData.script.split(" ").length : 0;
  const estMins  = Math.round(estWords/150);
  const order    = ["idle","scripting","script_done","narrating","narration_done","publishing","published"];
  const isDone   = s => order.indexOf(stage) > order.indexOf(s);
  const isActive = s => stage === s;
  const rssUrl   = health?.rssUrl;

  return (
    <div style={{
      minHeight:"100vh", background:"#080806",
      fontFamily:"'DM Sans',system-ui,sans-serif", color:"#e8ddd0",
      backgroundImage:"radial-gradient(ellipse 70% 40% at 50% 0%, #1e0f00 0%, transparent 65%)",
    }}>
      <style>{`
        *{box-sizing:border-box}
        ::placeholder{color:#3a342a}
        select{appearance:none;-webkit-appearance:none;cursor:pointer}
        input[type=range]{-webkit-appearance:none;height:3px;border-radius:2px;background:#1e1a12;outline:none;cursor:pointer}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#f97316;cursor:pointer}
        .btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:none;cursor:pointer;font-family:inherit;transition:all .18s;letter-spacing:.03em;font-weight:500}
        .btn-o{background:linear-gradient(135deg,#f97316,#dc5d0c);color:#fff;border-radius:10px}
        .btn-o:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(249,115,22,.35)}
        .btn-o:disabled{opacity:.35;cursor:not-allowed;transform:none;box-shadow:none}
        .btn-g{background:transparent;color:#7a6e62;border:1px solid #242018;border-radius:8px}
        .btn-g:hover{border-color:#f97316;color:#f97316}
        .inp{width:100%;background:#0b0904;border:1px solid #221e14;border-radius:9px;color:#e8ddd0;font-family:inherit;transition:border-color .2s}
        .inp:focus{border-color:#f97316;outline:none}
        @keyframes fi{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .fi{animation:fi .45s ease forwards}
      `}</style>

      {/* Header */}
      <header style={{ maxWidth:900,margin:"0 auto",padding:"36px 20px 0",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12 }}>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          <div style={{ width:42,height:42,borderRadius:11,background:"linear-gradient(135deg,#f97316,#9a3412)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,boxShadow:"0 4px 18px rgba(249,115,22,.38)" }}>🎙</div>
          <div>
            <h1 style={{ margin:0,fontSize:26,fontWeight:700,color:"#f5ede0",letterSpacing:"-.01em" }}>
              Vox<span style={{ color:"#f97316" }}>Forge</span>
            </h1>
            <p style={{ margin:0,fontSize:10,color:"#4a4236",letterSpacing:".09em",textTransform:"uppercase" }}>AI Podcast Studio</p>
          </div>
        </div>
        <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
          {health && <><Badge ok={health.services.anthropic} label="Claude AI" /><Badge ok={health.services.murf} label="Murf Voice" /></>}
          {rssUrl && (
            <a href={rssUrl} target="_blank" rel="noreferrer"
              style={{ padding:"3px 10px",borderRadius:20,fontSize:11,background:"#0e0a1a",border:"1px solid #2a1e3a",color:"#a78bfa",textDecoration:"none" }}>
              📡 RSS Feed
            </a>
          )}
          <button className="btn btn-g" onClick={()=>setShowHistory(!showHistory)} style={{ padding:"6px 12px",fontSize:12 }}>
            📂 {episodes.length} Episodes
          </button>
        </div>
      </header>

      {/* Episode history */}
      {showHistory && (
        <div className="fi" style={{ maxWidth:900,margin:"16px auto 0",padding:"0 20px" }}>
          <Card style={{ padding:20 }}>
            <div style={{ fontSize:11,color:"#6b5f52",letterSpacing:".08em",textTransform:"uppercase",marginBottom:14 }}>Your Episodes</div>
            {episodes.length===0
              ? <p style={{ color:"#4a4236",fontSize:13,margin:0 }}>No episodes yet — create your first one!</p>
              : episodes.map(ep=>(
                <div key={ep.id} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #1a1610" }}>
                  <div>
                    <div style={{ fontSize:14,color:"#c8bfb4",marginBottom:2 }}>{ep.title}</div>
                    <div style={{ fontSize:11,color:"#4a4236" }}>{ep.category} · {ep.duration} min · {new Date(ep.publishedAt).toLocaleDateString()}</div>
                  </div>
                  {ep.audioUrl && <a href={ep.audioUrl} target="_blank" rel="noreferrer" style={{ fontSize:11,color:"#f97316",textDecoration:"none" }}>▶ Listen</a>}
                </div>
              ))
            }
            {rssUrl && (
              <div style={{ marginTop:14,padding:"10px 14px",background:"#0e0a1a",border:"1px solid #2a1e3a",borderRadius:8 }}>
                <div style={{ fontSize:11,color:"#a78bfa",marginBottom:4 }}>📡 Your RSS Feed (submit once to Spotify & Apple)</div>
                <code style={{ fontSize:11,color:"#c4b5fd",wordBreak:"break-all" }}>{rssUrl}</code>
              </div>
            )}
          </Card>
        </div>
      )}

      <main style={{ maxWidth:900,margin:"0 auto",padding:"24px 20px 60px",display:"grid",gridTemplateColumns:"190px 1fr",gap:22,alignItems:"start" }}>

        {/* Left sidebar */}
        <div style={{ position:"sticky",top:24 }}>
          <Card style={{ padding:"20px 16px" }}>
            <StepDot n={1} done={isDone("scripting")} active={isActive("scripting")||isActive("idle")} label="Write Script" />
            <StepDot n={2} done={isDone("narrating")} active={isActive("narrating")||isActive("script_done")} label="Voice" />
            <StepDot n={3} done={isDone("publishing")} active={isActive("publishing")||isActive("narration_done")} label="Publish" />
            <StepDot n={4} done={isActive("published")} active={false} label="Go Live" />
            <div style={{ borderTop:"1px solid #1a1610",paddingTop:14,marginTop:4 }}>
              <div style={{ fontSize:10,color:"#3a3228",letterSpacing:".07em",textTransform:"uppercase",marginBottom:10 }}>Powered by</div>
              {[
                {label:"Claude AI",ok:health?.services.anthropic},
                {label:"Murf Falcon",ok:health?.services.murf},
                {label:"Self-hosted RSS",ok:true},
                {label:"Spotify / Apple",ok:episodes.length>0},
              ].map(s=>(
                <div key={s.label} style={{ display:"flex",alignItems:"center",gap:7,marginBottom:7 }}>
                  <div style={{ width:5,height:5,borderRadius:"50%",background:s.ok?"#4ade80":"#f97316" }} />
                  <span style={{ fontSize:11,color:"#6b5f52" }}>{s.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Main panels */}
        <div>

          {/* Panel 1 — Idea */}
          {["idle","scripting"].includes(stage) && (
            <Card className="fi" style={{ padding:24,marginBottom:18 }}>
              <div style={{ marginBottom:18 }}>
                <label style={{ fontSize:11,color:"#6b5f52",letterSpacing:".08em",textTransform:"uppercase",display:"block",marginBottom:8 }}>Your Podcast Idea</label>
                <textarea value={idea} onChange={e=>setIdea(e.target.value)} disabled={stage==="scripting"}
                  className="inp"
                  placeholder={"What's your episode about?\n\ne.g. 'The untold story of how NASA engineers solved the Apollo 13 crisis using duct tape and math'"}
                  style={{ padding:14,fontSize:14,lineHeight:1.7,resize:"none",height:120 }} />
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18 }}>
                {[
                  {label:"Category",val:category,set:setCategory,opts:CATEGORIES},
                  {label:"Duration",val:duration,set:setDuration,opts:["5","10","15","20","30","45","60"],fmt:v=>`${v} minutes`},
                ].map(({label,val,set,opts,fmt:f})=>(
                  <div key={label}>
                    <label style={{ fontSize:11,color:"#6b5f52",letterSpacing:".08em",textTransform:"uppercase",display:"block",marginBottom:6 }}>{label}</label>
                    <select value={val} onChange={e=>set(e.target.value)} disabled={stage==="scripting"} className="inp" style={{ padding:"9px 12px",fontSize:13 }}>
                      {opts.map(o=><option key={o} value={o}>{f?f(o):o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div>
                <label style={{ fontSize:11,color:"#6b5f52",letterSpacing:".08em",textTransform:"uppercase",display:"block",marginBottom:10 }}>Voice</label>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8 }}>
                  {VOICES.map(v=>(
                    <button key={v.id} onClick={()=>setVoice(v)} disabled={stage==="scripting"}
                      style={{ background:voice.id===v.id?"#1a0e00":"#0b0904",border:`1px solid ${voice.id===v.id?"#f97316":"#1e1a12"}`,borderRadius:9,padding:"10px 8px",cursor:"pointer",textAlign:"left",transition:"all .15s" }}>
                      <div style={{ fontSize:16,marginBottom:4 }}>{v.emoji}</div>
                      <div style={{ fontSize:12,color:"#c8bfb4",fontWeight:500 }}>{v.name}</div>
                      <div style={{ fontSize:10,color:"#6b5f52",marginTop:2 }}>{v.accent}</div>
                    </button>
                  ))}
                </div>
              </div>
              <Err msg={error} />
              {stage==="scripting" ? (
                <div style={{ marginTop:18 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:7 }}>
                    <span style={{ fontSize:12,color:"#8a7e72" }}>✦ Claude AI writing your script…</span>
                    <span style={{ fontSize:12,color:"#f97316" }}>{Math.round(scriptPct)}%</span>
                  </div>
                  <div style={{ height:3,background:"#1a1610",borderRadius:2,overflow:"hidden" }}>
                    <div style={{ height:"100%",background:"linear-gradient(90deg,#f97316,#fbbf24)",width:`${scriptPct}%`,transition:"width .3s",borderRadius:2 }} />
                  </div>
                </div>
              ) : (
                <button className="btn btn-o" onClick={generateScript} style={{ marginTop:18,width:"100%",padding:13,fontSize:14 }}>
                  Generate Script with Claude AI →
                </button>
              )}
            </Card>
          )}

          {/* Panel 2 — Script result */}
          {!["idle","scripting"].includes(stage) && scriptData && (
            <Card className="fi" style={{ padding:24,marginBottom:18 }}>
              <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:16 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap" }}>
                    <span style={{ fontSize:11,padding:"2px 8px",background:"#0d1a0d",border:"1px solid #1e3a1e",borderRadius:20,color:"#4ade80" }}>✓ Script Ready</span>
                    <span style={{ fontSize:11,color:"#4a4236" }}>~{estMins} min · {estWords} words</span>
                  </div>
                  <h2 style={{ margin:0,fontSize:17,fontWeight:600,color:"#f5ede0",lineHeight:1.35 }}>{scriptData.title}</h2>
                  <p style={{ margin:"6px 0 10px",fontSize:12,color:"#6b5f52",lineHeight:1.6 }}>{scriptData.description}</p>
                  <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>
                    {(scriptData.tags||[]).map(t=><span key={t} style={{ padding:"2px 9px",background:"#120e06",border:"1px solid #2a2214",borderRadius:20,fontSize:10,color:"#8a7055" }}>{t}</span>)}
                  </div>
                </div>
                <button className="btn btn-g" onClick={reset} style={{ padding:"5px 10px",fontSize:11,flexShrink:0 }}>Reset</button>
              </div>
              <div style={{ background:"#090705",border:"1px solid #161210",borderRadius:9,padding:16,maxHeight:200,overflowY:"auto",fontSize:13,lineHeight:1.9,color:"#8a8070" }}>
                {scriptData.script}
              </div>
            </Card>
          )}

          {/* Panel 3 — Voice */}
          {["script_done","narrating"].includes(stage) && (
            <Card className="fi" style={{ padding:24,marginBottom:18 }}>
              <StepDot n={2} done={false} active={stage==="narrating"} label="Generate Voice with Murf AI" />
              <div style={{ display:"flex",alignItems:"center",gap:16,padding:"14px 18px",background:"#090705",border:"1px solid #1a1610",borderRadius:9,marginBottom:16 }}>
                <div style={{ width:46,height:46,borderRadius:"50%",background:"linear-gradient(135deg,#1e1410,#3a2810)",border:"2px solid #f97316",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>{voice.emoji}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15,color:"#e8ddd0",fontWeight:500 }}>{voice.name}</div>
                  <div style={{ fontSize:11,color:"#6b5f52" }}>{voice.tone} · {voice.accent}</div>
                </div>
                <Waveform active={stage==="narrating"} bars={24} />
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16 }}>
                {[{label:"Pitch",val:pitch,set:setPitch},{label:"Speed",val:speed,set:setSpeed}].map(({label,val,set})=>(
                  <div key={label}>
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
                      <span style={{ fontSize:11,color:"#6b5f52",letterSpacing:".07em",textTransform:"uppercase" }}>{label}</span>
                      <span style={{ fontSize:11,color:"#f97316" }}>{val>0?`+${val}`:val}</span>
                    </div>
                    <input type="range" min={-20} max={20} value={val} onChange={e=>set(+e.target.value)} style={{ width:"100%" }} disabled={stage==="narrating"} />
                  </div>
                ))}
              </div>
              {!health?.services.murf && (
                <div style={{ marginBottom:14,padding:"10px 14px",background:"#0e0a00",border:"1px solid #3a2800",borderRadius:8,fontSize:12,color:"#c89040",lineHeight:1.5 }}>
                  ⚠ MURF_API_KEY not set — demo mode only. Real audio requires a Murf account at murf.ai
                </div>
              )}
              <Err msg={error} />
              {stage==="narrating" ? (
                <div>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                    <span style={{ fontSize:12,color:"#8a7e72" }}>{health?.services.murf?"🎙 Murf Falcon synthesizing…":"🎙 Generating demo…"}</span>
                    <div style={{ position:"relative",display:"flex",alignItems:"center",justifyContent:"center" }}>
                      <Ring pct={narPct} />
                      <span style={{ position:"absolute",fontSize:10,color:"#f97316",fontWeight:700 }}>{Math.round(narPct)}%</span>
                    </div>
                  </div>
                  <div style={{ height:3,background:"#1a1610",borderRadius:2,overflow:"hidden" }}>
                    <div style={{ height:"100%",background:"linear-gradient(90deg,#f97316,#fbbf24)",width:`${narPct}%`,transition:"width .4s",borderRadius:2 }} />
                  </div>
                </div>
              ) : (
                <button className="btn btn-o" onClick={generateNarration} style={{ width:"100%",padding:13,fontSize:14 }}>
                  🎙 {health?.services.murf?"Generate Real Voice →":"Generate (Demo Mode) →"}
                </button>
              )}
            </Card>
          )}

          {/* Panel 4 — Player + Publish */}
          {["narration_done","publishing","published"].includes(stage) && (
            <Card className="fi" style={{ padding:24,marginBottom:18 }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
                <span style={{ fontSize:11,padding:"2px 10px",background:"#0d1a0d",border:"1px solid #1e3a1e",borderRadius:20,color:"#4ade80" }}>✓ Audio Ready</span>
                {isRealAudio
                  ? <span style={{ fontSize:11,padding:"2px 10px",background:"#0d1a0d",border:"1px solid #1e3a1e",borderRadius:20,color:"#4ade80" }}>Real Murf AI Audio</span>
                  : <span style={{ fontSize:11,padding:"2px 10px",background:"#1a1000",border:"1px solid #3a2800",borderRadius:20,color:"#f97316" }}>Demo Mode</span>
                }
              </div>
              {audioUrl && <audio ref={audioRef} src={audioUrl} preload="auto" />}

              {/* Player */}
              <div style={{ background:"#090705",border:"1px solid #1e1a12",borderRadius:11,padding:18,marginBottom:18 }}>
                <div style={{ display:"flex",alignItems:"center",gap:14 }}>
                  <button onClick={togglePlay} style={{ width:50,height:50,borderRadius:"50%",border:"none",cursor:"pointer",background:"linear-gradient(135deg,#f97316,#dc5d0c)",color:"#fff",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(249,115,22,.4)",flexShrink:0 }}>
                    {playing?"⏸":"▶"}
                  </button>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:7 }}>
                      <span style={{ fontSize:12,color:"#8a7e72",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"70%" }}>{scriptData?.title}</span>
                      <span style={{ fontSize:11,color:"#4a4236",flexShrink:0 }}>
                        {isRealAudio ? `${fmt(currentTime)} / ${fmt(audioDuration)}` : `0:00 / ${duration}:00`}
                      </span>
                    </div>
                    <div style={{ height:4,background:"#1a1610",borderRadius:2,overflow:"hidden",cursor:"pointer" }}
                      onClick={e=>{
                        const r=e.currentTarget.getBoundingClientRect();
                        const p=((e.clientX-r.left)/r.width)*100;
                        setPlayPct(p);
                        if(isRealAudio&&audioRef.current) audioRef.current.currentTime=(p/100)*audioRef.current.duration;
                      }}>
                      <div style={{ height:"100%",background:"linear-gradient(90deg,#f97316,#fbbf24)",width:`${playPct}%`,transition:"width .1s",borderRadius:2 }} />
                    </div>
                    <div style={{ marginTop:10 }}><Waveform active={playing} bars={36} /></div>
                  </div>
                </div>
              </div>

              {/* Meta */}
              <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:18 }}>
                {[
                  {l:"Duration",v:`${duration} min`},{l:"Voice",v:voice.name},{l:"Category",v:category},
                  {l:"Words",v:estWords.toLocaleString()},{l:"Format",v:"MP3 44.1kHz"},{l:"Engine",v:isRealAudio?"Murf AI":"Demo"},
                ].map(m=>(
                  <div key={m.l} style={{ background:"#090705",border:"1px solid #161210",borderRadius:8,padding:"10px 12px" }}>
                    <div style={{ fontSize:9,color:"#3a3228",textTransform:"uppercase",letterSpacing:".08em",marginBottom:3 }}>{m.l}</div>
                    <div style={{ fontSize:13,color:"#c8bfb4" }}>{m.v}</div>
                  </div>
                ))}
              </div>

              <Err msg={error} />

              {/* Published */}
              {stage==="published" && publishResult && (
                <div style={{ padding:18,background:"#0a1a0a",border:"1px solid #1a3a1a",borderRadius:10,marginBottom:14 }}>
                  <div style={{ fontSize:15,color:"#4ade80",marginBottom:8,fontWeight:600 }}>🎉 Episode Published!</div>
                  <div style={{ fontSize:12,color:"#4a7a4a",lineHeight:1.8,marginBottom:12 }}>
                    Your episode is live and your RSS feed is updated.<br/>
                    <strong style={{ color:"#6ab86a" }}>Submit your RSS feed once</strong> to Spotify and Apple — they'll automatically pick up every future episode.
                  </div>
                  {rssUrl && (
                    <div style={{ background:"#071207",border:"1px solid #1a3a1a",borderRadius:8,padding:"10px 12px",marginBottom:12 }}>
                      <div style={{ fontSize:10,color:"#4a7a4a",letterSpacing:".07em",textTransform:"uppercase",marginBottom:4 }}>Your RSS Feed URL</div>
                      <code style={{ fontSize:12,color:"#86efac",wordBreak:"break-all" }}>{rssUrl}</code>
                    </div>
                  )}
                  <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                    {[
                      {label:"Submit to Spotify",url:"https://podcasters.spotify.com/"},
                      {label:"Submit to Apple",url:"https://podcastsconnect.apple.com/"},
                      {label:"Submit to Amazon",url:"https://music.amazon.com/podcasts/submission"},
                    ].map(p=>(
                      <a key={p.label} href={p.url} target="_blank" rel="noreferrer"
                        style={{ padding:"5px 12px",background:"#0d1a0d",border:"1px solid #1e3a1e",borderRadius:20,fontSize:11,color:"#86efac",textDecoration:"none" }}>
                        {p.label} ↗
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Publishing progress */}
              {stage==="publishing" && (
                <div style={{ padding:14,background:"#090705",border:"1px solid #1a1610",borderRadius:9,marginBottom:14 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
                    <span style={{ fontSize:12,color:"#8a7e72" }}>📡 Publishing episode…</span>
                    <span style={{ fontSize:12,color:"#f97316" }}>{Math.round(publishPct)}%</span>
                  </div>
                  <div style={{ height:3,background:"#1a1610",borderRadius:2,overflow:"hidden" }}>
                    <div style={{ height:"100%",background:"linear-gradient(90deg,#f97316,#4ade80)",width:`${publishPct}%`,transition:"width .4s",borderRadius:2 }} />
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {stage==="narration_done" && (
                <div style={{ display:"flex",gap:10 }}>
                  {isRealAudio && (
                    <a href={audioUrl} download={`${(scriptData?.title||"episode").replace(/\s+/g,"_")}.mp3`}
                      className="btn btn-g" style={{ flex:1,padding:12,fontSize:13,textDecoration:"none" }}>
                      ⬇ Download MP3
                    </a>
                  )}
                  <button className="btn btn-o" onClick={publishEpisode} style={{ flex:2,padding:13,fontSize:14 }}>
                    📡 Publish & Update RSS →
                  </button>
                </div>
              )}

              {stage==="published" && (
                <button className="btn btn-g" onClick={reset} style={{ marginTop:12,width:"100%",padding:11,fontSize:13 }}>
                  + Create New Episode
                </button>
              )}
            </Card>
          )}

          {/* How it works when idle */}
          {stage==="idle" && (
            <Card className="fi" style={{ padding:20 }}>
              <div style={{ fontSize:11,color:"#4a4236",letterSpacing:".08em",textTransform:"uppercase",marginBottom:14 }}>How VoxForge Works</div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16 }}>
                {[
                  {icon:"🤖",title:"Claude AI writes the script",desc:"Full structured episode with intro, main content, and outro"},
                  {icon:"🎙",title:"Murf Falcon reads it",desc:"Real human-like AI voice synthesis — actual MP3 generated"},
                  {icon:"📡",title:"Self-hosted RSS feed",desc:"VoxForge generates your RSS feed — you own it, no monthly fees"},
                  {icon:"💰",title:"Submit once, earn forever",desc:"Paste your RSS to Spotify & Apple — they auto-import every episode"},
                ].map(m=>(
                  <div key={m.title} style={{ padding:"12px 14px",background:"#090705",border:"1px solid #161210",borderRadius:9 }}>
                    <div style={{ fontSize:18,marginBottom:6 }}>{m.icon}</div>
                    <div style={{ fontSize:13,color:"#c8bfb4",fontWeight:500,marginBottom:3 }}>{m.title}</div>
                    <div style={{ fontSize:11,color:"#4a4236",lineHeight:1.5 }}>{m.desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding:"12px 14px",background:"#0e0a1a",border:"1px solid #2a1e3a",borderRadius:9 }}>
                <div style={{ fontSize:12,color:"#a78bfa",fontWeight:500,marginBottom:4 }}>💜 No middleman. No monthly fees.</div>
                <div style={{ fontSize:11,color:"#6b5fa0",lineHeight:1.6 }}>
                  Your RSS feed lives on your own server. Submit it once to Spotify, Apple, Amazon — they pull new episodes automatically. Earn from Spotify's Partner Program, Apple Subscriptions, and sponsorships.
                </div>
              </div>
            </Card>
          )}

        </div>
      </main>
    </div>
  );
}
