import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Headphones,
  Languages,
  Mic,
  MicOff,
  Play,
  Radio,
  RefreshCw,
  Send,
  Sparkles,
  Square,
  Volume2
} from 'lucide-react';
import './GnaniVoiceStudio.css';
import { buildLocalDemoSummary } from './localDemoInsights.js';

const TTS_LANGUAGES = [
  ['en-IN', 'English (India)'],
  ['hi-IN', 'Hindi — हिन्दी'],
  ['te-IN', 'Telugu — తెలుగు'],
  ['ta-IN', 'Tamil — தமிழ்'],
  ['kn-IN', 'Kannada — ಕನ್ನಡ'],
  ['ml-IN', 'Malayalam — മലയാളം'],
  ['mr-IN', 'Marathi — मराठी'],
  ['bn-IN', 'Bengali — বাংলা'],
  ['gu-IN', 'Gujarati — ગુજરાતી'],
  ['pa-IN', 'Punjabi — ਪੰਜਾਬੀ']
];

function floatTo16BitPCMBase64(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i += 1) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export default function GnaniVoiceStudio({
  rows = [],
  fields = [],
  datasetName = '',
  analytics = {},
  onApplyTranscriptFilter
}) {
  // 1. Microphone Audio Transcription state (gemini-3.5-transcribe)
  const [isRecordingTranscribe, setIsRecordingTranscribe] = useState(false);
  const [transcribeBusy, setTranscribeBusy] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [transcribeNotice, setTranscribeNotice] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const speechRecRef = useRef(null);
  const speechInterimRef = useRef('');

  // 2. Real-time Live Voice Conversation state (gemini-3.8-live)
  const [liveActive, setLiveActive] = useState(false);
  const [liveStatus, setLiveStatus] = useState('Ready for real-time voice conversation');
  const [livePrompt, setLivePrompt] = useState('');
  const [liveTurns, setLiveTurns] = useState([]);
  const [liveBusy, setLiveBusy] = useState(false);
  const liveWsRef = useRef(null);
  const inputAudioCtxRef = useRef(null);
  const outputAudioCtxRef = useRef(null);
  const micStreamRef = useRef(null);
  const nextStartTimeRef = useRef(0);

  // 3. Multilingual Spoken Briefing state
  const [ttsLanguage, setTtsLanguage] = useState('en-IN');
  const [speed, setSpeed] = useState(1);
  const [briefingText, setBriefingText] = useState('');

  useEffect(() => {
    const langMap = {
      'en-IN': 'en',
      'hi-IN': 'hi',
      'te-IN': 'te',
      'ta-IN': 'ta',
      'kn-IN': 'kn',
      'ml-IN': 'ml',
      'mr-IN': 'mr',
      'bn-IN': 'bn',
      'gu-IN': 'gu',
      'pa-IN': 'pa'
    };
    const generated = buildLocalDemoSummary(analytics, langMap[ttsLanguage] || 'en').slice(0, 2400);
    setBriefingText(generated);
  }, [analytics, ttsLanguage, datasetName, rows.length, fields.length]);

  useEffect(() => {
    return () => {
      stopLiveSession();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
    };
  }, []);

  function speakTextAloud(textToSpeak, langCode = 'en-IN') {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(String(textToSpeak || '').slice(0, 600));
      utterance.lang = langCode;
      utterance.rate = Number(speed) || 1;
      window.speechSynthesis.speak(utterance);
    } catch {}
  }

  function playPcm24kChunk(base64Data) {
    try {
      if (!outputAudioCtxRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        outputAudioCtxRef.current = new AudioCtx({ sampleRate: 24000 });
        nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
      }
      const ctx = outputAudioCtxRef.current;
      const binary = atob(base64Data);
      const len = binary.length;
      const int16 = new Int16Array(len / 2);
      const view = new DataView(new ArrayBuffer(len));
      for (let i = 0; i < len; i += 1) view.setUint8(i, binary.charCodeAt(i));
      for (let i = 0; i < int16.length; i += 1) int16[i] = view.getInt16(i * 2, true);

      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i += 1) float32[i] = int16[i] / 32768;

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;
    } catch {}
  }

  async function startMicrophoneTranscription() {
    setTranscribeNotice('');
    speechInterimRef.current = '';
    try {
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRec) {
        const rec = new SpeechRec();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = ttsLanguage || 'en-IN';
        rec.onresult = (event) => {
          let combined = '';
          for (let i = 0; i < event.results.length; i += 1) {
            combined += event.results[i][0].transcript + ' ';
          }
          speechInterimRef.current = combined.trim();
        };
        try { rec.start(); speechRecRef.current = rec; } catch {}
      }

      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          await submitAudioForTranscription(blob, speechInterimRef.current);
        };
        recorder.start();
        setIsRecordingTranscribe(true);
        setTranscribeNotice('Recording microphone audio… Click Stop & Transcribe when finished.');
      } else {
        await submitAudioForTranscription(null, `Summarize top metrics and outliers for ${datasetName}`);
      }
    } catch {
      await submitAudioForTranscription(null, `Analyze ${datasetName} key segments and performance leaders`);
    }
  }

  function stopMicrophoneTranscription() {
    setIsRecordingTranscribe(false);
    try { speechRecRef.current?.stop?.(); } catch {}
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      void submitAudioForTranscription(null, speechInterimRef.current);
    }
  }

  async function submitAudioForTranscription(audioBlob, clientTranscript = '') {
    setTranscribeBusy(true);
    setTranscribeNotice('Transcribing audio with gemini-3.5-transcribe…');
    try {
      let base64Audio = '';
      let mimeType = 'audio/webm';
      if (audioBlob && audioBlob.size > 0) {
        mimeType = audioBlob.type || 'audio/webm';
        base64Audio = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = String(reader.result || '');
            resolve(res.includes(',') ? res.split(',')[1] : '');
          };
          reader.readAsDataURL(audioBlob);
        });
      }

      const response = await fetch('/api/ai/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: base64Audio,
          mimeType,
          clientTranscript,
          datasetName
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not transcribe audio.');
      setTranscriptText(data.transcript || '');
      setTranscribeNotice(`Transcribed via ${data.model || 'gemini-3.5-transcribe'}.`);
    } catch (err) {
      setTranscribeNotice(err?.message || 'Transcription failed.');
    } finally {
      setTranscribeBusy(false);
    }
  }

  async function startLiveSession() {
    if (liveActive) {
      stopLiveSession();
      return;
    }
    setLiveStatus('Connecting to Gemini Live API (gemini-3.8-live)…');
    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/api/live`);
      liveWsRef.current = ws;

      ws.onopen = async () => {
        setLiveActive(true);
        setLiveStatus('Live Voice Session Active (gemini-3.8-live) — Speak or ask a question below');
        try {
          if (navigator.mediaDevices?.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            micStreamRef.current = stream;
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const inputCtx = new AudioCtx({ sampleRate: 16000 });
            inputAudioCtxRef.current = inputCtx;
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            source.connect(processor);
            processor.connect(inputCtx.destination);
            processor.onaudioprocess = (e) => {
              if (liveWsRef.current?.readyState === WebSocket.OPEN) {
                const pcm64 = floatTo16BitPCMBase64(e.inputBuffer.getChannelData(0));
                liveWsRef.current.send(JSON.stringify({ audio: pcm64 }));
              }
            };
          }
        } catch {}
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.audio) {
            playPcm24kChunk(msg.audio);
          }
          if (msg.inputTranscript) {
            setLiveTurns((prev) => [...prev.slice(-6), { role: 'user', text: msg.inputTranscript }]);
          }
          if (msg.outputTranscript) {
            setLiveTurns((prev) => [...prev.slice(-6), { role: 'assistant', text: msg.outputTranscript }]);
            speakTextAloud(msg.outputTranscript, ttsLanguage);
          }
          if (msg.interrupted) {
            nextStartTimeRef.current = 0;
          }
        } catch {}
      };

      ws.onclose = () => {
        setLiveActive(false);
        setLiveStatus('Live voice session ended');
      };
    } catch {
      setLiveActive(false);
      setLiveStatus('Ready for voice conversation');
    }
  }

  function stopLiveSession() {
    setLiveActive(false);
    setLiveStatus('Live voice session paused');
    try { liveWsRef.current?.close?.(); } catch {}
    liveWsRef.current = null;
    try { micStreamRef.current?.getTracks()?.forEach((t) => t.stop()); } catch {}
    micStreamRef.current = null;
    try { inputAudioCtxRef.current?.close?.(); } catch {}
    inputAudioCtxRef.current = null;
  }

  async function sendLiveConversationalTurn(e) {
    e?.preventDefault?.();
    const text = livePrompt.trim() || `What are the top insights in ${datasetName}?`;
    setLiveBusy(true);
    setLiveTurns((prev) => [...prev.slice(-6), { role: 'user', text }]);
    setLivePrompt('');

    try {
      if (liveWsRef.current?.readyState === WebSocket.OPEN) {
        liveWsRef.current.send(JSON.stringify({ text, snapshot: analytics }));
      }
      const res = await fetch('/api/ai/live-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, snapshot: analytics })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.reply) {
        setLiveTurns((prev) => [...prev.slice(-6), { role: 'assistant', text: data.reply }]);
        speakTextAloud(data.reply, ttsLanguage);
      }
    } catch {} finally {
      setLiveBusy(false);
    }
  }

  return (
    <article className="v2-card gnani-studio" aria-labelledby="gnani-title">
      <div className="v2-card-title gnani-title-row">
        <div className="gnani-mark"><Headphones size={19} /></div>
        <div className="gnani-heading-copy">
          <span className="v2-overline">REAL-TIME VOICE &amp; AUDIO INTELLIGENCE</span>
          <h3 id="gnani-title">Live Voice Conversation &amp; Audio Transcription Studio</h3>
        </div>
        <span className="gnani-status ready">ACTIVE</span>
      </div>
      <p className="v2-muted gnani-intro">
        Converse in real time with your active dataset using <strong>gemini-3.8-live</strong>, transcribe spoken voice notes with <strong>gemini-3.5-transcribe</strong>, or listen to multilingual executive briefings.
      </p>

      {/* Section 1: Real-Time Voice Conversation (gemini-3.8-live Live API) */}
      <div className="gnani-key-panel" style={{ marginBottom: 14 }}>
        <div className="gnani-key-heading">
          <Radio size={16} />
          <strong>Real-Time Voice Conversation (gemini-3.8-live Live API)</strong>
          <span>{liveActive ? 'LIVE STREAMING' : 'READY'}</span>
        </div>
        <p>{liveStatus}</p>
        <div className="gnani-key-actions" style={{ marginBottom: 10 }}>
          <button
            type="button"
            className={`v2-button ${liveActive ? 'secondary' : 'primary'}`}
            onClick={() => void startLiveSession()}
          >
            {liveActive ? <MicOff size={14} /> : <Mic size={14} />}
            {liveActive ? 'End Live Voice Stream' : 'Start Live Voice Session'}
          </button>
          <button
            type="button"
            className="v2-button secondary"
            onClick={() => void sendLiveConversationalTurn()}
            disabled={liveBusy}
          >
            <Sparkles size={14} /> Ask Live Voice Assistant About {datasetName || 'Dataset'}
          </button>
        </div>

        <form onSubmit={sendLiveConversationalTurn} style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={livePrompt}
            onChange={(e) => setLivePrompt(e.target.value)}
            placeholder={`Speak or type a question for gemini-3.8-live about ${datasetName || 'active data'}…`}
            aria-label="Live voice conversation prompt"
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
          />
          <button type="submit" className="v2-button primary" disabled={liveBusy}>
            {liveBusy ? <RefreshCw size={14} className="v2-spin" /> : <Send size={14} />} Send
          </button>
        </form>

        {liveTurns.length > 0 && (
          <div className="v2-summary" style={{ marginTop: 10 }} aria-live="polite">
            <h4>Live Conversation Transcript (gemini-3.8-live)</h4>
            {liveTurns.map((turn, idx) => (
              <p key={idx} style={{ margin: '4px 0', fontSize: 12.5 }}>
                <strong>{turn.role === 'user' ? 'You: ' : 'Live Assistant: '}</strong>
                {turn.text}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Microphone Audio Transcription (gemini-3.5-transcribe) */}
      <div className="gnani-key-panel" style={{ marginBottom: 14 }}>
        <div className="gnani-key-heading">
          <Mic size={16} />
          <strong>Microphone Audio Transcription (gemini-3.5-transcribe)</strong>
          <span>{isRecordingTranscribe ? 'RECORDING' : 'SPEECH-TO-TEXT'}</span>
        </div>
        <p>Record voice notes or spoken queries with your microphone and transcribe them into text using <code>gemini-3.5-transcribe</code>.</p>
        <div className="gnani-key-actions">
          {!isRecordingTranscribe ? (
            <button
              type="button"
              className="v2-button primary"
              onClick={() => void startMicrophoneTranscription()}
              disabled={transcribeBusy}
            >
              <Mic size={14} /> Record Microphone Audio
            </button>
          ) : (
            <button
              type="button"
              className="v2-button secondary"
              onClick={stopMicrophoneTranscription}
            >
              <Square size={14} /> Stop &amp; Transcribe Audio
            </button>
          )}
          <button
            type="button"
            className="v2-button secondary"
            onClick={() => void submitAudioForTranscription(null, `Executive voice memo for ${datasetName}: review top segment performance and statistical outliers.`)}
            disabled={transcribeBusy}
          >
            {transcribeBusy ? <RefreshCw size={14} className="v2-spin" /> : <CheckCircle2 size={14} />}
            Transcribe Sample Voice Note
          </button>
        </div>
        {transcribeNotice && <p className="gnani-key-notice" role="status">{transcribeNotice}</p>}
        {transcriptText && (
          <div className="v2-summary" style={{ marginTop: 10 }} aria-live="polite">
            <h4>Audio Transcription Output (gemini-3.5-transcribe)</h4>
            <p style={{ margin: '4px 0 8px' }}>{transcriptText}</p>
            {onApplyTranscriptFilter && (
              <button
                type="button"
                className="v2-button secondary"
                onClick={() => onApplyTranscriptFilter(transcriptText)}
              >
                Use Transcript in Dashboard Search
              </button>
            )}
          </div>
        )}
      </div>

      {/* Section 3: Multilingual Spoken Executive Briefing */}
      <div className="gnani-form">
        <label className="v2-field">
          <span><Languages size={13} /> Briefing Language</span>
          <select value={ttsLanguage} onChange={(e) => setTtsLanguage(e.target.value)}>
            {TTS_LANGUAGES.map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
        </label>
        <label className="v2-field">
          <span>Active Dataset Spoken Summary ({datasetName || 'Current Dataset'})</span>
          <textarea
            rows={4}
            value={briefingText}
            onChange={(e) => setBriefingText(e.target.value)}
            aria-label="Spoken dataset summary"
          />
        </label>
        <div className="gnani-speed">
          <label htmlFor="gnani-speed">Speech speed</label>
          <input
            id="gnani-speed"
            type="range"
            min="0.85"
            max="1.15"
            step="0.05"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          />
          <output htmlFor="gnani-speed">{Number(speed).toFixed(2)}×</output>
        </div>
        <button
          className="v2-button primary"
          type="button"
          onClick={() => speakTextAloud(briefingText, ttsLanguage)}
          disabled={!briefingText.trim()}
        >
          <Play size={15} /> Play Spoken Executive Briefing
        </button>
      </div>
    </article>
  );
}
