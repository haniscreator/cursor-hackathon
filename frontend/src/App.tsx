// src/App.tsx
import React, { useState, useRef } from "react";
import "./index.css";
import Comparator from "./Comparator";

export default function App() {
  // --- updated state for Script & Voice tool ---
  const [inputText, setInputText] = useState(
    "Bright 2-bedroom condo in Nimmanhaemin, 65 sqm, 2 baths, balcony with city view, furnished, modern kitchen, 5-minute walk to cafes."
  );

  // tone -> mood
  const [mood, setMood] = useState("cinematic");
  // length -> duration (seconds)
  const [duration, setDuration] = useState<number>(15);

  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [lastSource, setLastSource] = useState("");
  const [error, setError] = useState<string | null>(null);

  // background music selection (filename in server/music/ or remote URL)
  const [backgroundMusic, setBackgroundMusic] = useState<string>("");
  const [bgVolume, setBgVolume] = useState<number>(0.18);
  const [useBgMusic, setUseBgMusic] = useState<boolean>(false);
  const [returnTypeBase64, setReturnTypeBase64] = useState<boolean>(true);

  // API base (frontend) - default to server port 3001 set earlier
  const apiBase = (import.meta.env.VITE_API_BASE as string) || "http://localhost:3001";
  console.log("API base:", apiBase);

  // map mood -> ElevenLabs voice id (edit to match your ElevenLabs voices)
  const moodToVoice: Record<string, string> = {
    cinematic: "alloy",
    professional: "alloy",
    friendly: "alloy",
    inspiring: "alloy",
    dramatic: "alloy",
  };

  // Generate script (sends inputText, mood, duration)
  async function handleGenerateScript() {
    setError(null);
    setAudioUrl("");
    setLoading(true);
    try {
      const body = {
        inputText,
        mood,
        duration,
      };
      const resp = await fetch(`${apiBase}/api/generate-script`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await resp.json().catch(() => null);
      if (!resp.ok) {
        setError(json?.error || `Failed to generate script (${resp.status})`);
        setScript("");
      } else {
        setScript((json?.script || "").trim());
        setLastSource(json?.source || "");
      }
    } catch (err: any) {
      setError(String(err));
      setScript("");
    } finally {
      setLoading(false);
    }
  }

  // Generate TTS (supports background music mixing, requests base64 by default for immediate playback)
  async function handleGenerateTts() {
    setError(null);
    if (!script) return setError("No script to convert to speech. Generate first.");
    setTtsLoading(true);
    setAudioUrl("");
    try {
      const voice = moodToVoice[mood] || "alloy";
      const body: any = {
        script,
        voice,
        format: "mp3",
        returnType: returnTypeBase64 ? "base64" : "url",
      };
      if (useBgMusic && backgroundMusic) {
        body.backgroundMusic = backgroundMusic;
        body.bgVolume = bgVolume;
      }

      const resp = await fetch(`${apiBase}/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await resp.json().catch(() => null);
      if (!resp.ok) {
        setError(json?.error || `TTS failed (${resp?.detail || resp?.status || "unknown"})`);
        setTtsLoading(false);
        return;
      }

      // fallback / browser instruction
      if (json?.fallback || json?.method === "browser-speech") {
        if (window.speechSynthesis) {
          const utter = new SpeechSynthesisUtterance(script);
          utter.rate = 1.0;
          utter.pitch = 1.0;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utter);
          setLastSource("browser-speech");
        } else {
          setError("Browser does not support speechSynthesis");
        }
        setTtsLoading(false);
        return;
      }

      // server returned URL
      if (json?.audioUrl && !returnTypeBase64) {
        setAudioUrl(json.audioUrl);
        setLastSource(json.source || "server");
        setTimeout(() => {
          if (audioRef.current) audioRef.current.load();
        }, 50);
        setTtsLoading(false);
        return;
      }

      // server returned base64
      if (json?.audioBase64) {
        const byteCharacters = atob(json.audioBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setLastSource(json.source || "elevenlabs");
        setTimeout(() => {
          if (audioRef.current) audioRef.current.load();
          // auto-play small clips (optional)
          try {
            audioRef.current?.play().catch(() => {});
          } catch (e) {}
        }, 50);
        setTtsLoading(false);
        return;
      }

      setError("No audio returned from server");
    } catch (err: any) {
      setError(String(err));
    } finally {
      setTtsLoading(false);
    }
  }

  function handlePlayBackup() {
    if (script && window.speechSynthesis) {
      const utter = new SpeechSynthesisUtterance(script);
      utter.rate = 1.0;
      utter.pitch = 1.0;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
      setLastSource("backup-browser");
    }
  }

  // --- navigation state ---
  const [route, setRoute] = useState<"tour" | "compare">("tour");

  return (
    <div className="app-root">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="logo">AI Tour ( Hackathon )</div>
          <nav className="nav">
          </nav>
        </div>
      </header>

      <main style={{ width: "100%" }}>
        {route === "tour" ? (
          <div className="container">
            <h1 className="title">AI Virtual Tour — Script & Voice</h1>

            <label className="label">Listing or topic</label>
            <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} rows={4} className="input textarea" />

            <div className="row">
              <div className="col">
                <label className="label">Mood</label>
                <select value={mood} onChange={(e) => setMood(e.target.value)} className="input select">
                  <option value="cinematic">Cinematic</option>
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="inspiring">Inspiring</option>
                  <option value="dramatic">Dramatic</option>
                </select>
              </div>

              <div className="col">
                <label className="label">Duration (seconds)</label>
                <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="input select">
                  <option value={15}>15 (short promo)</option>
                  <option value={30}>30 (extended)</option>
                  <option value={45}>45</option>
                </select>
              </div>

              <div className="col action-col">
                <button onClick={handleGenerateScript} className="btn primary" disabled={loading}>
                  {loading ? "Generating..." : "Generate Script"}
                </button>
              </div>
            </div>

            <div className="block">
              <label className="label">Generated script (editable)</label>
              <textarea value={script} onChange={(e) => setScript(e.target.value)} rows={8} className="input textarea" />
            </div>

            <div className="block">
              <label className="label">Background music (optional)</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={useBgMusic}
                  onChange={(e) => setUseBgMusic(e.target.checked)}
                />
                <input
                  type="text"
                  placeholder="music filename in server/music/ (e.g. ambient_loop.mp3) or remote URL"
                  value={backgroundMusic}
                  onChange={(e) => setBackgroundMusic(e.target.value)}
                  className="input"
                  style={{ flex: 1 }}
                />
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                <label style={{ marginRight: 8 }}>BG Volume</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={bgVolume}
                  onChange={(e) => setBgVolume(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <div style={{ width: 48, textAlign: "right" }}>{Math.round(bgVolume * 100)}%</div>
              </div>

              <div style={{ marginTop: 8 }}>
                <label>
                  <input type="checkbox" checked={returnTypeBase64} onChange={(e) => setReturnTypeBase64(e.target.checked)} />
                  {" "}Request base64 (inline playback)
                </label>
              </div>
            </div>

            <div className="row actions">
  <button onClick={handleGenerateTts} disabled={ttsLoading} className="btn success">
    {ttsLoading ? "Generating voice..." : "Generate Voice"}
  </button>

  {/* <button onClick={handlePlayBackup} className="btn neutral">
    Play Backup (browser)
  </button> */}

  {audioUrl && (
    <a href={audioUrl} download className="link" style={{ marginLeft: 12 }}>
      Download MP3
    </a>
  )}

  {/* --- Added buttons (no functionality yet) --- */}
  <button className="btn neutral" style={{ marginLeft: 12 }}>
    Download Audio
  </button>

  <button className="btn neutral" style={{ marginLeft: 12 }}>
    Download Script
  </button>
</div>


            <div className="block">
              {audioUrl && (
                <audio ref={audioRef} controls className="audio-player" style={{ width: "100%" }}>
                  <source src={audioUrl} />
                  Your browser does not support the audio element.
                </audio>
              )}
            </div>

            <div className="meta">
              {/* <div>Last source: {lastSource || "none"}</div> */}
              {error && <div className="error">Error: {error}</div>}
            </div>
          </div>
        ) : (
          <div className="container">
            <Comparator apiBase={apiBase} />
          </div>
        )}
      </main>

      <footer className="footer">
        <div>API base: {apiBase}</div>
        <div>Tip: if ElevenLabs is not configured on the server, use "Play Backup" which uses the browser's speechSynthesis.</div>
      </footer>
    </div>
  );
}
