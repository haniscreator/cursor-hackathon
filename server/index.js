/**
 * cursor-hackathon/server/index.js
 *
 * Express server for AI Virtual Tour (Ollama + ElevenLabs)
 *
 * - Node 18+ (uses global fetch). If your Node lacks fetch, install node-fetch and adapt.
 * - Place .env.local or .env in same folder with keys described below.
 *
 * ENV (examples in .env.local):
 *  PORT=3001
 *  OLLAMA_URL=http://localhost:11434
 *  OLLAMA_MODEL=phi3:latest
 *  ELEVENLABS_KEY=your_key_here
 *  ELEVENLABS_VOICE=alloy
 *  USE_MOCK=false
 */

require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ------------------ Config ------------------
const PORT = process.env.PORT || 3001;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'phi3:latest';
const ELEVENLABS_KEY = process.env.ELEVENLABS_KEY || '';
const ELEVENLABS_VOICE = process.env.ELEVENLABS_VOICE || 'alloy';
const USE_MOCK = process.env.USE_MOCK === 'true' || false;
const OUTPUT_DIR = path.join(__dirname, 'outputs');
const MUSIC_DIR = path.join(__dirname, 'music');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(MUSIC_DIR)) fs.mkdirSync(MUSIC_DIR, { recursive: true });

// Allow local frontends - extend as needed
const ALLOWED_ORIGINS = ['http://localhost:3000', 'http://localhost:5173'];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  else res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ------------------ Helpers ------------------
const lengthToTokens = (len) => {
  if (!len) return 300;
  const l = String(len).toLowerCase();
  if (l.includes('short')) return 200;
  if (l.includes('medium')) return 400;
  if (l.includes('long')) return 800;
  // numeric durations (seconds) -> tokens approx
  if (!isNaN(Number(len))) {
    const secs = Number(len);
    if (secs <= 15) return 120;
    if (secs <= 30) return 220;
    return 400;
  }
  return 400;
};

function extractJSONFrom(text) {
  if (!text || typeof text !== 'string') return null;
  let s = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  s = s.replace(/^\s*(JSON:|Output:)\s*/i, '');
  const start = s.indexOf('{');
  if (start === -1) return null;
  let depth = 0, end = -1;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return null;
  const candidate = s.slice(start, end + 1);
  try { return JSON.parse(candidate); } catch (e1) {
    try { const cleaned = candidate.replace(/,(\s*[}\]])/g, '$1'); return JSON.parse(cleaned); } catch (e2) {
      try { const ascii = candidate.replace(/[^\x00-\x7F]/g, ''); const cleaned2 = ascii.replace(/,(\s*[}\]])/g, '$1'); return JSON.parse(cleaned2); } catch (e3) {
        return null;
      }
    }
  }
}

// ------------------ Health ------------------
app.get('/api/health', async (req, res) => {
  const health = { status: 'ok', ollama: 'unknown', elevenlabs: ELEVENLABS_KEY ? 'configured' : 'missing', mock: USE_MOCK };
  try {
    const probe = [`${OLLAMA_URL}/api/generate`, `${OLLAMA_URL}/v1/completions`, `${OLLAMA_URL}/v1/generate`, `${OLLAMA_URL}/generate`, `${OLLAMA_URL}/`];
    let ok = false;
    for (const url of probe) {
      try {
        const r = await fetch(url, { method: 'GET' }).catch(() => null);
        if (r && r.ok) { ok = true; break; }
      } catch (e) {}
    }
    health.ollama = ok ? 'ok' : 'unreachable';
  } catch (e) {
    health.ollama = 'unreachable';
  }
  res.json(health);
});

// ------------------ Generate Script ------------------
// Accepts body: { inputText, mood, duration }
// Returns: { script, source, endpoint }
app.post('/api/generate-script', async (req, res) => {
  try {
    const inputText = req.body.inputText || req.body.topic || req.body.text || '';
    const mood = req.body.mood || req.body.tone || 'professional';
    const duration = req.body.duration || req.body.length || 'short';

    if (!inputText || String(inputText).trim().length === 0) return res.status(400).json({ error: 'Missing inputText' });

    if (USE_MOCK) {
      return res.json({ script: `Mock ${mood} script for: ${inputText}`, source: 'mock' });
    }

    // New prompt for short voiceover scripts (duration in seconds or length string)
    const targetDesc = isNaN(Number(duration)) ? duration : `${duration} seconds (~${Math.round((Number(duration) * 5) + 30)} words approx)`;
    const prompt = `
You are a creative voiceover script writer who specializes in short, engaging spoken clips.

Task:
- Write a single, spoken-friendly narration about: "${inputText}"
- Mood/style: ${mood}
- Target duration: ${targetDesc}
- Keep it natural for a human narrator and suitable for TTS.
- Use around the appropriate word count for the duration. Keep it to one paragraph. No headings, no JSON, no labels.
Return ONLY the narration text.
`.trim();

    const endpoints = [
      `${OLLAMA_URL}/api/generate`,
      `${OLLAMA_URL}/v1/completions`,
      `${OLLAMA_URL}/v1/generate`,
      `${OLLAMA_URL}/generate`
    ];

    let scriptText = null;
    let lastErr = null;
    let usedEp = null;

    for (const ep of endpoints) {
      try {
        const r = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: OLLAMA_MODEL,
            prompt,
            max_tokens: lengthToTokens(duration),
            temperature: 0.85
          })
        });

        if (!r.ok) {
          lastErr = `${ep} -> ${r.status} ${r.statusText}`;
          continue;
        }

        const ct = (r.headers.get('content-type') || '').toLowerCase();

        if (ct.includes('application/x-ndjson') || ct.includes('text/event-stream')) {
          // streaming NDJSON reader
          const reader = r.body.getReader();
          const decoder = new TextDecoder();
          let buf = '';
          let assembled = '';
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            let nl;
            while ((nl = buf.indexOf('\n')) !== -1) {
              const line = buf.slice(0, nl).trim();
              buf = buf.slice(nl + 1);
              if (!line) continue;
              try {
                const obj = JSON.parse(line);
                if (obj?.response) assembled += obj.response;
              } catch (e) {
                // ignore partially-formed lines
              }
            }
          }
          if (buf.trim()) {
            try {
              const leftover = JSON.parse(buf.trim());
              if (leftover?.response) assembled += leftover.response;
            } catch (e) {}
          }
          scriptText = assembled.trim();
        } else {
          const text = await r.text();
          let j = null;
          try { j = JSON.parse(text); } catch (e) { /* not json */ }
          if (j) {
            if (j?.choices && Array.isArray(j.choices) && j.choices[0]?.text) scriptText = j.choices[0].text;
            else if (j?.output && typeof j.output === 'string') scriptText = j.output;
            else if (Array.isArray(j?.output)) scriptText = j.output.join(' ');
            else if (j?.generated_text) scriptText = j.generated_text;
            else scriptText = JSON.stringify(j);
          } else {
            scriptText = text;
          }
        }

        usedEp = ep;
        break;
      } catch (err) {
        lastErr = String(err);
        continue;
      }
    }

    if (!scriptText) return res.status(502).json({ error: 'Ollama unreachable', detail: lastErr || 'no response' });

    return res.json({ script: scriptText.trim(), source: 'ollama', endpoint: usedEp });
  } catch (err) {
    console.error('generate-script error:', err);
    return res.status(500).json({ error: 'internal error', detail: String(err) });
  }
});

// ------------------ TTS with optional BG music ------------------
// Accepts: { script, voice, format, backgroundMusic (filename in server/music/ or remote URL), bgVolume (0-1), returnType ('url'|'base64') }
// Returns: { audioUrl } or { audioBase64 }
// ------------------
// TTS endpoint with optional background music mixing
// Accepts body: {
//   script, voice, format, backgroundMusic (filename under server/bg/ or remote URL),
//   bgVolume (0.0-1.0), returnType: 'url'|'base64'
// }
// Returns: { audioUrl } or { audioBase64 }

// ------------------
// Simple TTS endpoint (ElevenLabs only, no BG mixing)
// Accepts body: { script, voice, format='mp3', returnType='url'|'base64' }
// Returns: { audioUrl } or { audioBase64 }
app.post('/api/tts', async (req, res) => {
    try {
      const {
        script = '',
        voice = ELEVENLABS_VOICE || 'alloy',
        format = 'mp3',
        returnType = 'url' // 'url' or 'base64'
      } = req.body || {};
  
      if (!script || String(script).trim().length === 0) {
        return res.status(400).json({ error: 'Missing script' });
      }
  
      // MOCK short-circuit
      if (USE_MOCK) {
        const mockFile = path.join(__dirname, 'mock-responses.json');
        if (fs.existsSync(mockFile)) {
          const mocks = JSON.parse(fs.readFileSync(mockFile, 'utf8'));
          const key = Object.keys(mocks)[0];
          const mp3 = mocks[key].mp3;
          const out = `/outputs/${mp3}`;
          return res.json({ audioUrl: `http://localhost:${PORT}${out}`, source: 'mock' });
        }
        return res.status(501).json({ error: 'Mock audio not configured' });
      }
  
      // No ElevenLabs key -> tell client to fallback to browser TTS
      if (!ELEVENLABS_KEY) {
        return res.json({ fallback: true, message: 'No ElevenLabs key configured. Use browser TTS.' });
      }
  
      // Call ElevenLabs TTS
      const ttsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}`;
      const ttsResp = await fetch(ttsUrl, {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({ text: script })
      });
  
      if (!ttsResp.ok) {
        const detail = await ttsResp.text().catch(() => '');
        console.error('ElevenLabs error:', ttsResp.status, detail);
        return res.status(502).json({ error: 'ElevenLabs error', detail });
      }
  
      const arrayBuffer = await ttsResp.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const filename = `tts_${Date.now()}.mp3`;
      const filepath = path.join(OUTPUT_DIR, filename);
      fs.writeFileSync(filepath, buffer);
  
      if (returnType === 'base64') {
        return res.json({ audioBase64: buffer.toString('base64'), mime: 'audio/mpeg', source: 'elevenlabs' });
      }
  
      const audioUrl = `http://localhost:${PORT}/outputs/${filename}`;
      return res.json({ audioUrl, source: 'elevenlabs' });
  
    } catch (err) {
      console.error('tts error:', err);
      return res.status(500).json({ error: 'tts error', detail: String(err) });
    }
  });
  
  


// ------------------ Serve outputs and root ------------------
app.use('/outputs', express.static(OUTPUT_DIR));
app.get('/', (req, res) => res.send('Cursor Hackathon: AI Tour Server'));

// ------------------ Start ------------------
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`OLLAMA_URL=${OLLAMA_URL}, OLLAMA_MODEL=${OLLAMA_MODEL}, ELEVENLABS=${ELEVENLABS_KEY ? 'yes' : 'no'}, USE_MOCK=${USE_MOCK}`);
});
