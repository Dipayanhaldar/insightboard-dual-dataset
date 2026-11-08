import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Cpu, Download, LoaderCircle, ShieldCheck, Sparkles, Volume2, Square } from 'lucide-react';
import './InstantClientAI.css';

const MODEL_ID = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
const LANGUAGES = [
  ['en-IN', 'English (India)'], ['hi-IN', 'Hindi — हिन्दी'], ['te-IN', 'Telugu — తెలుగు'],
  ['ta-IN', 'Tamil — தமிழ்'], ['kn-IN', 'Kannada — ಕನ್ನಡ'], ['ml-IN', 'Malayalam — മലയാളം'],
  ['mr-IN', 'Marathi — मराठी'], ['bn-IN', 'Bengali — বাংলা']
];
let enginePromise = null;
let engineInstance = null;

function cleanSnapshot(analytics = {}) {
  return {
    dataset: String(analytics.datasetName || 'Current dataset').slice(0, 100),
    filteredRecords: Number(analytics.recordCount) || 0,
    totalRecords: Number(analytics.sourceRecordCount) || 0,
    activeFilters: analytics.filters || {},
    fields: Array.isArray(analytics.fields) ? analytics.fields.slice(0, 24) : [],
    numericMetrics: Array.isArray(analytics.numericMetrics) ? analytics.numericMetrics.slice(0, 8) : [],
    topCategories: Array.isArray(analytics.topCategories) ? analytics.topCategories.slice(0, 8) : [],
    timeTrend: Array.isArray(analytics.timeTrend) ? analytics.timeTrend.slice(0, 10) : [],
    completeness: Array.isArray(analytics.completeness) ? analytics.completeness.slice(0, 10) : []
  };
}

export default function InstantClientAI({ analytics = {}, defaultLanguage = 'en', onSwitchToCustom = () => {} }) {
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState('');
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [language, setLanguage] = useState(defaultLanguage === 'hi' ? 'hi-IN' : defaultLanguage === 'te' ? 'te-IN' : 'en-IN');
  const [voiceLanguage, setVoiceLanguage] = useState('en-IN');
  const [speaking, setSpeaking] = useState(false);
  const engineRef = useRef(null);
  const snapshot = useMemo(() => cleanSnapshot(analytics), [analytics]);
  const [gpuState, setGpuState] = useState('checking');
  const supported = gpuState === 'ready';
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  useEffect(() => {
    let cancelled = false;
    async function detectGpu() {
      if (typeof navigator === 'undefined' || !navigator.gpu) {
        if (!cancelled) {
          setGpuState('unsupported');
          onSwitchToCustom('WebGPU is unavailable on this device/browser. Switched to Custom Key Mode.');
        }
        return;
      }
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (cancelled) return;
        if (!adapter) {
          setGpuState('unsupported');
          onSwitchToCustom('This device did not provide a usable WebGPU adapter. Switched to Custom Key Mode.');
          return;
        }
        setGpuState('ready');
      } catch {
        if (!cancelled) {
          setGpuState('unsupported');
          onSwitchToCustom('WebGPU could not initialise on this device/browser. Switched to Custom Key Mode.');
        }
      }
    }
    void detectGpu();
    return () => { cancelled = true; };
  }, [onSwitchToCustom]);

  async function loadEngine() {
    if (!supported) throw new Error('A usable WebGPU adapter is not available. Switch to Custom Key Mode or try a supported desktop browser.');
    if (engineRef.current) return engineRef.current;
    if (!enginePromise) {
      enginePromise = (async () => {
        const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm');
        const worker = new Worker(new URL('./webllm.worker.js', import.meta.url), { type: 'module' });
        try {
          const engine = await CreateWebWorkerMLCEngine(worker, MODEL_ID, {
            initProgressCallback: report => setProgress(report?.text || 'Preparing local model…')
          });
          engineInstance = engine;
          return engine;
        } catch (cause) {
          worker.terminate();
          throw cause;
        }
      })().catch(cause => {
        enginePromise = null;
        throw cause;
      });
    }
    engineRef.current = engineInstance || await enginePromise;
    return engineRef.current;
  }

  async function generate() {
    setError('');
    setStatus('loading');
    setProgress('Checking WebGPU and loading the local model…');
    try {
      const engine = await loadEngine();
      setStatus('generating');
      setProgress('Analysing aggregate dashboard metrics on this device…');
      const localeName = LANGUAGES.find(([code]) => code === language)?.[1] || 'English (India)';
      const response = await engine.chat.completions.create({
        model: MODEL_ID,
        messages: [
          { role: 'system', content: 'You are InsightBoard, a careful data analyst. Analyse only the supplied aggregate dashboard snapshot. Never claim to inspect raw records. Do not invent figures, causes or correlations. Clearly distinguish observed metrics from hypotheses. Respond in ' + localeName + '. Give a concise executive summary, 3-5 evidence-based findings, data-quality caveats, and 2 practical next steps.' },
          { role: 'user', content: 'Summarise this dashboard snapshot. Use only the numbers and labels provided.\n\n' + JSON.stringify(snapshot) }
        ],
        temperature: 0.2,
        max_tokens: 520
      });
      const text = response?.choices?.[0]?.message?.content;
      if (typeof text !== 'string' || !text.trim()) throw new Error('The local model returned an empty response. Try again.');
      setSummary(text.trim());
      setStatus('ready');
      setProgress('Completed locally. No API key or InsightBoard AI request was used.');
    } catch (cause) {
      setStatus('error');
      setError(cause?.message || 'Local AI could not start. Check WebGPU support and available device memory.');
      setProgress('');
    }
  }

  function speak() {
    if (!speechSupported || !summary) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(summary);
    utterance.lang = voiceLanguage;
    const voices = window.speechSynthesis.getVoices();
    const prefix = voiceLanguage.toLowerCase().split('-')[0];
    const voice = voices.find(item => item.lang?.toLowerCase() === voiceLanguage.toLowerCase())
      || voices.find(item => item.lang?.toLowerCase().startsWith(prefix));
    if (voice) utterance.voice = voice;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeech() {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }

  function downloadSummary() {
    const blob = new Blob([summary], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'insightboard-local-ai-summary.txt';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <article className="v2-card instant-client-ai" aria-labelledby="instant-ai-title">
      <div className="v2-card-title">
        <span className="instant-ai-icon"><Cpu size={18} /></span>
        <div><span className="v2-overline">NO API KEY · RUNS ON YOUR DEVICE</span><h3 id="instant-ai-title">Instant Client-Side AI</h3></div>
        <span className={'instant-ai-status ' + status}>{status === 'loading' ? 'LOADING MODEL' : status === 'generating' ? 'ANALYSING' : status === 'ready' ? 'LOCAL AI READY' : gpuState === 'checking' ? 'CHECKING DEVICE' : supported ? 'WEBGPU AVAILABLE' : 'WEBGPU REQUIRED'}</span>
      </div>
      <p className="v2-muted">Generate an AI explanation from dashboard aggregates with a compact Qwen model running in your browser through WebGPU. Raw dataset rows are not sent to a server.</p>
      <div className="instant-ai-facts">
        <span><ShieldCheck size={14} /> Browser-side inference</span>
        <span><Cpu size={14} /> Qwen 0.5B · quantised</span>
        <span><CheckCircle2 size={14} /> No provider key</span>
      </div>
      <div className="instant-ai-controls">
        <label className="v2-field"><span>Summary language</span><select value={language} onChange={event => setLanguage(event.target.value)}>{LANGUAGES.map(([code, label]) => <option value={code} key={code}>{label}</option>)}</select></label>
        <button type="button" className="v2-button primary" onClick={() => void generate()} disabled={!supported || status === 'loading' || status === 'generating' || !snapshot.filteredRecords}>
          {status === 'loading' || status === 'generating' ? <LoaderCircle size={15} className="v2-spin" /> : <Sparkles size={15} />}
          {status === 'loading' ? 'Loading local model…' : status === 'generating' ? 'Generating locally…' : summary ? 'Regenerate summary' : 'Load model & generate summary'}
        </button>
      </div>
      {(status === 'loading' || status === 'generating') && <div className="instant-ai-progress" role="status"><LoaderCircle size={15} className="v2-spin" /><span>{progress || 'Working locally…'}</span></div>}
      {gpuState === 'checking' && <div className="instant-ai-progress" role="status"><LoaderCircle size={15} className="v2-spin" /><span>Checking whether this device can run local AI…</span></div>}
      {gpuState === 'unsupported' && <div className="instant-ai-warning"><AlertTriangle size={15} /><span>This device/browser cannot run the local WebGPU model. InsightBoard is switching to Custom Key Mode. Your dashboard data remains in the browser.</span></div>}
      {error && <div className="instant-ai-error" role="alert"><AlertTriangle size={15} /><span>{error} You can continue with Custom Key Mode.</span><button type="button" className="v2-button secondary" onClick={() => onSwitchToCustom('Local AI could not start on this device. Switched to Custom Key Mode.')}>Switch to Custom Key Mode</button></div>}
      {summary && <section className="instant-ai-result" aria-live="polite">
        <div className="instant-ai-result-head"><strong><CheckCircle2 size={15} /> Local AI summary</strong><button type="button" className="v2-text-button" onClick={downloadSummary}><Download size={14} /> Download</button></div>
        <div className="instant-ai-summary">{summary}</div>
        <div className="instant-ai-narration">
          <label className="v2-field"><span><Volume2 size={13} /> Narration language</span><select value={voiceLanguage} onChange={event => setVoiceLanguage(event.target.value)}>{LANGUAGES.map(([code, label]) => <option value={code} key={code}>{label}</option>)}</select></label>
          {speaking
            ? <button type="button" className="v2-button secondary" onClick={stopSpeech}><Square size={14} /> Stop narration</button>
            : <button type="button" className="v2-button secondary" onClick={speak} disabled={!speechSupported}><Volume2 size={14} /> Narrate with device voice</button>}
          {!speechSupported && <small>Speech synthesis is not supported by this browser.</small>}
          <small>Uses installed browser/device voices. Voice and language availability varies by operating system and browser.</small>
        </div>
      </section>}
      <div className="instant-ai-privacy"><ShieldCheck size={15} /><span><strong>Local processing and model download</strong><small>Only aggregate KPIs, field labels, category summaries, trends and completeness metrics are provided to the local model. Raw rows remain in the dashboard. The first run downloads model files (approximately 1 GB, depending on the selected model/runtime) and stores them in browser-managed cache. No API key is needed; model inference uses your device's WebGPU resources.</small></span></div>
    </article>
  );
}
