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
  Database
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

const SARVAM_SPEAKERS = ['meera', 'pavithra', 'maitreyi', 'arvind', 'amol', 'amartya'];

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
  const [ttsEngine, setTtsEngine] = useState('kokoro_free'); // 'kokoro_free' | 'gnani_byok' | 'sarvam_byok'
  const [gnaniKeyInput, setGnaniKeyInput] = useState('');
  const [savedGnaniKey, setSavedGnaniKey] = useState(() => {
    try {
      return (
        localStorage.getItem('insightboard-gnani-key') ||
        sessionStorage.getItem('insightboard-gnani-key') ||
        ''
      );
    } catch {
      return '';
    }
  });
  const [sarvamKeyInput, setSarvamKeyInput] = useState('');
  const [savedSarvamKey, setSavedSarvamKey] = useState(() => {
    try {
      return localStorage.getItem('insightboard-sarvam-key') || '';
    } catch {
      return '';
    }
  });
  const [keyNotice, setKeyNotice] = useState('');

  // Data-dependent TTS state
  const [language, setLanguage] = useState('en-IN');
  const [voice, setVoice] = useState('Kaveri');
  const [speed, setSpeed] = useState(1.0);
  const [ttsBusy, setTtsBusy] = useState(false);
  const [ttsError, setTtsError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [spokenStatus, setSpokenStatus] = useState('');

  const availableVoices = useMemo(() => {
    if (ttsEngine === 'sarvam_byok') return SARVAM_SPEAKERS;
    return GNANI_VOICES_BY_LANG[language] || GNANI_VOICES_BY_LANG['en-IN'];
  }, [language, ttsEngine]);

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

  const activeGnaniKey = gnaniKeyInput.trim() || savedGnaniKey.trim();
  const activeSarvamKey = sarvamKeyInput.trim() || savedSarvamKey.trim();

  function handleSaveKey() {
    playButtonClick();
    if (ttsEngine === 'sarvam_byok') {
      const clean = sarvamKeyInput.trim();
      if (!clean) {
        setKeyNotice('Enter your Sarvam AI (Bulbul) API key first.');
        return;
      }
      try {
        localStorage.setItem('insightboard-sarvam-key', clean);
      } catch {}
      setSavedSarvamKey(clean);
      setSarvamKeyInput('');
      setKeyNotice('Sarvam AI (Bulbul) key saved in localStorage.');
      summonInsi('voice', 'insi.ai · Sarvam Bulbul TTS key ready');
      return;
    }

    const clean = gnaniKeyInput.trim();
    if (!clean) {
      setKeyNotice('Enter your Gnani API key to unlock Timbre v2.5 speech generation.');
      summonInsi('error', "Oops! Let's try again.");
      return;
    }
    try {
      localStorage.setItem('insightboard-gnani-key', clean);
      sessionStorage.setItem('insightboard-gnani-key', clean);
    } catch {}
    setSavedGnaniKey(clean);
    setGnaniKeyInput('');
    setKeyNotice('Gnani API key saved in browser. You can now generate speech for the dataset summary.');
    summonInsi('voice', 'insi.ai · Gnani Timbre v2.5 key unlocked');
  }

  function handleForgetKey() {
    playButtonClick();
    if (ttsEngine === 'sarvam_byok') {
      try {
        localStorage.removeItem('insightboard-sarvam-key');
      } catch {}
      setSavedSarvamKey('');
      setSarvamKeyInput('');
      setKeyNotice('Sarvam AI key cleared from browser.');
      return;
    }
    try {
      localStorage.removeItem('insightboard-gnani-key');
      sessionStorage.removeItem('insightboard-gnani-key');
    } catch {}
    setSavedGnaniKey('');
    setGnaniKeyInput('');
    setKeyNotice('Gnani key cleared from this browser.');
  }

  async function playFreeKokoroOrIndianBrowserVoice() {
    setTtsBusy(true);
    setTtsError('');
    setSpokenStatus('Initializing expressive neural voice…');
    summonInsi('voice', 'insi.ai · Speaking dataset summary with Zero-Key Neural TTS…');

    try {
      // Attempt Kokoro-JS ONNX WebAudio synthesis when running in English on capable browser
      if (language.startsWith('en')) {
        try {
          const kokoroMod = await import(/* @vite-ignore */ 'https://esm.run/kokoro-js');
          if (kokoroMod?.KokoroTTS) {
            setSpokenStatus('Loading Kokoro-82M ONNX Neural TTS…');
            const tts = await kokoroMod.KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-ONNX', {
              dtype: 'q8'
            });
            const audio = await tts.generate(dataSummaryScript.slice(0, 480), {
              voice: 'af_bella'
            });
            if (audio?.toBlob) {
              const wavBlob = await audio.toBlob();
              if (audioUrl) URL.revokeObjectURL(audioUrl);
              const nextUrl = URL.createObjectURL(wavBlob);
              setAudioUrl(nextUrl);
              setSpokenStatus('Kokoro-82M ONNX Neural Audio Ready (Zero Key)!');
              summonInsi('success', 'insi.ai · Kokoro neural speech ready!');
              setTtsBusy(false);
              return;
            }
          }
        } catch {
          // Graceful fallback to Indian Browser SpeechSynthesis (distinct formal executive voice)
        }
      }

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(dataSummaryScript);
        utter.lang = language;
        // Formal executive summary cadence (pitch 0.96, rate = speed) — distinct from INSI Dove's 1.18x avian voice!
        utter.pitch = 0.96;
        utter.rate = Number(speed) || 1.0;

        const voices = window.speechSynthesis.getVoices?.() || [];
        const matchedVoice =
          voices.find((v) => v.lang?.toLowerCase() === language.toLowerCase()) ||
          voices.find((v) => /en[-_]IN|hi[-_]IN/i.test(v.lang)) ||
          voices[0];
        if (matchedVoice) utter.voice = matchedVoice;

        utter.onend = () => {
          setSpokenStatus(`Completed speaking summary in ${language}.`);
        };
        window.speechSynthesis.speak(utter);
        setSpokenStatus(`Speaking dataset summary aloud (${matchedVoice?.name || language} · Zero API Key)…`);
        summonInsi('success', 'insi.ai · Speaking executive summary aloud');
      } else {
        throw new Error('Browser SpeechSynthesis is unavailable on this device.');
      }
    } catch (err) {
      setTtsError(err?.message || 'Could not play speech.');
    } finally {
      setTtsBusy(false);
    }
  }

  async function handleGenerateSpeech(e) {
    e?.preventDefault?.();
    playButtonClick();
    setTtsError('');
    setSpokenStatus('');

    if (!dataSummaryScript.trim()) {
      setTtsError('Load a dataset with records first so the summary script can be generated.');
      summonInsi('error', "Oops! Let's try again.");
      return;
    }

    if (ttsEngine === 'kokoro_free') {
      await playFreeKokoroOrIndianBrowserVoice();
      return;
    }

    if (ttsEngine === 'sarvam_byok') {
      if (!activeSarvamKey) {
        setTtsError('Enter your Sarvam AI (Bulbul) API key above or switch to the Free Kokoro / Indian Neural Voice tier.');
        return;
      }
      setTtsBusy(true);
      summonInsi('voice', `insi.ai · Synthesizing Sarvam Bulbul (${voice} · ${language})…`);
      try {
        const res = await fetch('https://api.sarvam.ai/text-to-speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-subscription-key': activeSarvamKey
          },
          body: JSON.stringify({
            inputs: [dataSummaryScript.slice(0, 500)],
            target_language_code: language,
            speaker: voice || 'meera',
            pitch: 0,
            pace: Number(speed) || 1.0,
            loudness: 1.5,
            speech_sample_rate: 22050,
            enable_preprocessing: true,
            model: 'bulbul:v1'
          })
        });
        const data = await res.json().catch(() => ({}));
        const b64 = data?.audios?.[0];
        if (!res.ok || !b64) {
          throw new Error(data?.message || data?.error || 'Sarvam Bulbul TTS synthesis failed.');
        }
        const byteChars = atob(b64);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i += 1) {
          byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const wavBlob = new Blob([new Uint8Array(byteNumbers)], { type: 'audio/wav' });
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(URL.createObjectURL(wavBlob));
        summonInsi('success', 'insi.ai · Sarvam Bulbul Indian voice ready!');
      } catch (err) {
        setTtsError(err?.message || 'Could not generate Sarvam AI speech.');
      } finally {
        setTtsBusy(false);
      }
      return;
    }

    if (!activeGnaniKey) {
      setTtsError('Enter your Gnani API key above or switch to the Free Kokoro / Indian Neural Voice option.');
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
          'x-gnani-api-key': activeGnaniKey
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
          <span className="v2-overline">EXPRESSIVE INDIAN VOICE STUDIO · KOKORO ONNX, SARVAM BULBUL &amp; GNANI TIMBRE V2.5</span>
          <h3 id="gnani-title">Data-Dependent Multilingual Voice Summary</h3>
        </div>
        <span className="gnani-status ready">ZERO-KEY + INDIAN BYOK</span>
      </div>

      <p className="v2-muted gnani-intro">
        Listen to an executive briefing generated from <strong>{datasetName || 'Active Dataset'}</strong> ({rows.length.toLocaleString()} records) using <strong>Free Kokoro / Indian Neural TTS</strong> (no API key required), <strong>Sarvam AI (Bulbul)</strong>, or <strong>Gnani Timbre v2.5</strong>.
      </p>

      {/* Voice Engine Tier Selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }} role="tablist" aria-label="Voice TTS Engine">
        <button
          type="button"
          className={`v2-button ${ttsEngine === 'kokoro_free' ? 'primary' : 'secondary'} btn-3d`}
          onClick={() => setTtsEngine('kokoro_free')}
        >
          <Volume2 size={14} /> Free Kokoro / Indian Neural (No Key)
        </button>
        <button
          type="button"
          className={`v2-button ${ttsEngine === 'gnani_byok' ? 'primary' : 'secondary'} btn-3d`}
          onClick={() => setTtsEngine('gnani_byok')}
        >
          <Headphones size={14} /> Gnani.ai Timbre v2.5 (BYOK)
        </button>
        <button
          type="button"
          className={`v2-button ${ttsEngine === 'sarvam_byok' ? 'primary' : 'secondary'} btn-3d`}
          onClick={() => setTtsEngine('sarvam_byok')}
        >
          <Languages size={14} /> Sarvam AI Bulbul (Indian BYOK)
        </button>
      </div>

      {/* Optional BYOK Key Panel for Gnani or Sarvam */}
      {ttsEngine !== 'kokoro_free' && (
        <div className="gnani-key-panel">
          <div className="gnani-key-heading">
            <KeyRound size={15} />
            <strong>
              {ttsEngine === 'sarvam_byok'
                ? 'Sarvam AI (Bulbul v1) API Key (Saved in localStorage)'
                : 'Gnani Timbre v2.5 API Key (Saved in localStorage)'}
            </strong>
            <span>{(ttsEngine === 'sarvam_byok' ? activeSarvamKey : activeGnaniKey) ? 'KEY UNLOCKED' : 'KEY REQUIRED'}</span>
          </div>
          <label className="v2-field gnani-key-field">
            <input
              type="password"
              value={ttsEngine === 'sarvam_byok' ? sarvamKeyInput : gnaniKeyInput}
              onChange={(e) =>
                ttsEngine === 'sarvam_byok' ? setSarvamKeyInput(e.target.value) : setGnaniKeyInput(e.target.value)
              }
              placeholder={
                ttsEngine === 'sarvam_byok'
                  ? savedSarvamKey
                    ? '•••••••••••••••••••••••• (Sarvam key active)'
                    : 'Enter your Sarvam AI API subscription key…'
                  : savedGnaniKey
                  ? '•••••••••••••••••••••••• (Gnani key active)'
                  : 'Enter your Gnani Timbre v2.5 API key…'
              }
              autoComplete="off"
            />
          </label>
          <div className="gnani-key-actions">
            <button type="button" className="v2-button secondary btn-3d" onClick={handleSaveKey}>
              <KeyRound size={13} /> Save Key in Browser
            </button>
            {(ttsEngine === 'sarvam_byok' ? savedSarvamKey : savedGnaniKey) && (
              <button type="button" className="v2-button secondary btn-3d" onClick={handleForgetKey}>
                <Trash2 size={13} /> Clear Key
              </button>
            )}
          </div>
          {keyNotice && <p className="gnani-key-notice" role="status">{keyNotice}</p>}
        </div>
      )}

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
          disabled={ttsBusy}
        >
          {ttsBusy ? (
            <><RefreshCw size={15} className="v2-spin" /> Synthesizing Dataset Voice Summary…</>
          ) : (
            <><Play size={15} /> {ttsEngine === 'kokoro_free' ? `Listen Now with Free Neural Voice (${language})` : `Generate & Listen (${voice} · ${language})`}</>
          )}
        </button>

        {spokenStatus && (
          <div className="gnani-audio-result" role="status">
            <div>
              <CheckCircle2 size={15} />
              <strong>{spokenStatus}</strong>
            </div>
          </div>
        )}

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
              <strong>Audio Ready ({voice} · {language})</strong>
              <span>24 kHz Audio</span>
            </div>
            <audio controls src={audioUrl} />
            <a
              href={audioUrl}
              download={`insightboard-voice-${voice.toLowerCase()}.mp3`}
              className="v2-button secondary gnani-download btn-3d"
            >
              <Download size={14} /> Download Audio
            </a>
          </div>
        )}
      </form>

      <div className="gnani-privacy">
        <ShieldCheck size={16} />
        <span>
          <strong>Distinct Executive Voice &amp; Zero-Billing Guardrail</strong>
          <small>
            Uses a formal executive pitch (0.96x) or Kokoro/Sarvam/Gnani neural models—distinct from the INSI Dove assistant&apos;s task confirmation voice.
          </small>
        </span>
      </div>
    </article>
  );
}
