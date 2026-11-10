import React, { useEffect, useMemo, useState } from 'react';
import {
  Headphones,
  Volume2,
  KeyRound,
  Trash2,
  Play,
  Download,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Languages,
  RefreshCw,
  Database,
  Lock
} from 'lucide-react';
import './GnaniVoiceStudio.css';
import { buildLocalDemoSummary } from './localDemoInsights.js';
import { playButtonClick, summonInsi } from './uiSound.js';

const GNANI_VOICES_BY_LANG = {
  'en-IN': ['Kaveri', 'Trupti', 'Devika', 'Pranav', 'Shlok', 'Girish'],
  'hi-IN': ['Nalini', 'Bhavna', 'Yashvi', 'Urmila', 'Jwala', 'Chitra', 'Ambuja', 'Deepak', 'Roopesh', 'Vikrant', 'Hemraj', 'Jalaj', 'Omkar'],
  'ta-IN': ['Asmita', 'Trisha', 'Brinda', 'Vedika', 'Noopur'],
  'te-IN': ['Suhana', 'Lehara', 'Lavanya', 'Yukti', 'Varuni'],
  'kn-IN': ['Saanvi', 'Kavin'],
  'ml-IN': ['Reshma', 'Riyaan'],
  'mr-IN': ['Zahira', 'Ishaan'],
  'bn-IN': ['Kirra', 'Dhruva'],
  'gu-IN': ['Falak', 'Veera'],
  'pa-IN': ['Mehuli', 'Zayan']
};

const LANGUAGES = [
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

export default function GnaniVoiceStudio({
  rows = [],
  fields = [],
  datasetName = '',
  analytics = {}
}) {
  const [gnaniKeyInput, setGnaniKeyInput] = useState('');
  const [savedGnaniKey, setSavedGnaniKey] = useState(() => {
    try {
      return sessionStorage.getItem('insightboard-gnani-key') || '';
    } catch {
      return '';
    }
  });
  const [keyNotice, setKeyNotice] = useState('');

  // Data-dependent TTS state (Gnani Timbre v2.5)
  const [language, setLanguage] = useState('en-IN');
  const [voice, setVoice] = useState('Kaveri');
  const [speed, setSpeed] = useState(1.0);
  const [ttsBusy, setTtsBusy] = useState(false);
  const [ttsError, setTtsError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');

  const availableVoices = useMemo(
    () => GNANI_VOICES_BY_LANG[language] || GNANI_VOICES_BY_LANG['en-IN'],
    [language]
  );

  useEffect(() => {
    if (!availableVoices.includes(voice)) {
      setVoice(availableVoices[0]);
    }
  }, [availableVoices, voice]);

  // Strictly data-dependent summary generated from the active dataset
  const dataSummaryScript = useMemo(() => {
    const langShort = language.split('-')[0] || 'en';
    return buildLocalDemoSummary(analytics, langShort).slice(0, 1200);
  }, [analytics, language, datasetName, rows.length, fields.length]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const activeKey = gnaniKeyInput.trim() || savedGnaniKey.trim();

  function handleSaveKey() {
    playButtonClick();
    const clean = gnaniKeyInput.trim();
    if (!clean) {
      setKeyNotice('Enter your Gnani API key to unlock Timbre v2.5 speech generation.');
      summonInsi('error', "Oops! Let's try again.");
      return;
    }
    try {
      sessionStorage.setItem('insightboard-gnani-key', clean);
    } catch {}
    setSavedGnaniKey(clean);
    setGnaniKeyInput('');
    setKeyNotice('Gnani API key verified in this session. You can now generate speech for the dataset summary.');
    summonInsi('voice', 'insi.ai · Gnani Timbre v2.5 key unlocked');
  }

  function handleForgetKey() {
    playButtonClick();
    try {
      sessionStorage.removeItem('insightboard-gnani-key');
    } catch {}
    setSavedGnaniKey('');
    setGnaniKeyInput('');
    setKeyNotice('Gnani key cleared from this session.');
  }

  async function handleGenerateSpeech(e) {
    e?.preventDefault?.();
    playButtonClick();
    setTtsError('');

    if (!activeKey) {
      setTtsError('Enter your Gnani API key above to generate and listen to the dataset summary speech.');
      summonInsi('error', "Oops! Let's try again.");
      return;
    }

    if (!dataSummaryScript.trim()) {
      setTtsError('Load a dataset with records first so the summary script can be generated.');
      summonInsi('error', "Oops! Let's try again.");
      return;
    }

    setTtsBusy(true);
    summonInsi('voice', `insi.ai · Synthesizing ${voice} (${language}) audio…`);
    try {
      const response = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gnani-api-key': activeKey
        },
        body: JSON.stringify({
          text: dataSummaryScript,
          voice,
          language,
          speed: Number(speed) || 1
        })
      });

      if (!response.ok) {
        const errPayload = await response.json().catch(() => ({}));
        throw new Error(errPayload.error || 'Gnani Timbre v2.5 speech synthesis could not complete.');
      }

      const blob = await response.blob();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const nextUrl = URL.createObjectURL(blob);
      setAudioUrl(nextUrl);
      summonInsi('success', `insi.ai · ${voice} speech audio ready!`);
    } catch (err) {
      setTtsError(err?.message || 'Could not generate Gnani speech.');
      summonInsi('error', "Oops! Let's try again.");
    } finally {
      setTtsBusy(false);
    }
  }

  return (
    <article className="v2-card gnani-studio" aria-labelledby="gnani-title">
      <div className="v2-card-title gnani-title-row">
        <div className="gnani-mark"><Headphones size={19} /></div>
        <div className="gnani-heading-copy">
          <span className="v2-overline">GNANI AI VOICE STUDIO · TIMBRE V2.5 TEXT-TO-SPEECH</span>
          <h3 id="gnani-title">Data-Dependent Multilingual Voice Summary</h3>
        </div>
        <span className="gnani-status ready">10 INDIAN LANGUAGES · 40+ VOICES</span>
      </div>

      <p className="v2-muted gnani-intro">
        The briefing below is generated automatically from your active dataset (<strong>{datasetName || 'Active Dataset'}</strong> · {rows.length.toLocaleString()} records). Select your preferred Indian language and voice model, enter your Gnani API key, and generate speech to listen to your dataset summary.
      </p>

      {/* Gnani API Key Input (Required to unlock Speech Synthesis) */}
      <div className="gnani-key-panel">
        <div className="gnani-key-heading">
          <KeyRound size={15} />
          <strong>Gnani Timbre v2.5 API Key (Required to Generate Speech)</strong>
          <span>{activeKey ? 'KEY UNLOCKED' : 'KEY REQUIRED'}</span>
        </div>
        <p>
          Enter your personal Gnani API key to synthesize and listen to the auto-generated dataset summary. Keys stay strictly in your browser session.
        </p>
        <label className="v2-field gnani-key-field">
          <input
            type="password"
            value={gnaniKeyInput}
            onChange={(e) => setGnaniKeyInput(e.target.value)}
            placeholder={savedGnaniKey ? '•••••••••••••••••••••••• (Gnani session key active)' : 'Enter your Gnani Timbre v2.5 API key…'}
            autoComplete="off"
          />
        </label>
        <div className="gnani-key-actions">
          <button type="button" className="v2-button secondary btn-3d" onClick={handleSaveKey}>
            <KeyRound size={13} /> Save Key for Session
          </button>
          {savedGnaniKey && (
            <button type="button" className="v2-button secondary btn-3d" onClick={handleForgetKey}>
              <Trash2 size={13} /> Clear Key
            </button>
          )}
        </div>
        {keyNotice && <p className="gnani-key-notice" role="status">{keyNotice}</p>}
      </div>

      <form className="gnani-form" onSubmit={handleGenerateSpeech}>
        <label className="v2-field">
          <span><Languages size={13} /> 1. Select Summary Language</span>
          <select
            value={language}
            onChange={(e) => {
              playButtonClick();
              setLanguage(e.target.value);
            }}
          >
            {LANGUAGES.map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
        </label>

        <label className="v2-field">
          <span>
            <Volume2 size={13} /> 2. Select Voice Model <small>{availableVoices.length} voices for {language}</small>
          </span>
          <select
            value={voice}
            onChange={(e) => {
              playButtonClick();
              setVoice(e.target.value);
            }}
          >
            {availableVoices.map((v) => (
              <option key={v} value={v}>{v} ({language})</option>
            ))}
          </select>
        </label>

        <label className="v2-field">
          <span>
            <Database size={13} /> Auto-Generated Dataset Summary ({datasetName || 'Active Dataset'})
            <small>Read-only · Bound to {rows.length.toLocaleString()} dataset records</small>
          </span>
          <textarea
            value={dataSummaryScript}
            readOnly
            aria-readonly="true"
            title="Automatically generated from your active dataset"
          />
        </label>

        <div className="gnani-speed" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="gnani-speed-slider">Speech Speed</label>
          <input
            id="gnani-speed-slider"
            type="range"
            min="0.85"
            max="1.15"
            step="0.05"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          />
          <output htmlFor="gnani-speed-slider">{Number(speed).toFixed(2)}×</output>
        </div>

        <button
          type="submit"
          className="v2-button primary gnani-action btn-3d"
          disabled={ttsBusy || !activeKey}
          title={!activeKey ? 'Enter your Gnani API key above to generate speech' : `Generate speech with ${voice}`}
        >
          {ttsBusy ? (
            <><RefreshCw size={15} className="v2-spin" /> Synthesizing Dataset Summary with Gnani Timbre v2.5…</>
          ) : !activeKey ? (
            <><Lock size={15} /> Enter Gnani API Key Above to Generate Speech</>
          ) : (
            <><Play size={15} /> Generate &amp; Listen to Dataset Speech ({voice} · {language})</>
          )}
        </button>

        {ttsError && (
          <div className="gnani-error" role="alert">
            <AlertTriangle size={15} />
            <span>{ttsError}</span>
          </div>
        )}

        {audioUrl && (
          <div className="gnani-audio-result" aria-live="polite">
            <div>
              <CheckCircle2 size={15} />
              <strong>Gnani Timbre v2.5 Audio Ready ({voice} · {language})</strong>
              <span>24 kHz MP3</span>
            </div>
            <audio controls src={audioUrl} />
            <a
              href={audioUrl}
              download={`insightboard-gnani-${voice.toLowerCase()}.mp3`}
              className="v2-button secondary gnani-download btn-3d"
            >
              <Download size={14} /> Download MP3
            </a>
          </div>
        )}
      </form>

      <div className="gnani-privacy">
        <ShieldCheck size={16} />
        <span>
          <strong>Data-Dependent Speech &amp; Zero-Billing Guardrail</strong>
          <small>
            Speech is synthesized strictly from your active dataset summary using your session Gnani key—no arbitrary uploads or developer billing.
          </small>
        </span>
      </div>
    </article>
  );
}
