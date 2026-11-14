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
  ['en-IN', 'Indian English'], ['hi-IN', 'Hindi — हिन्दी'], ['bn-IN', 'Bengali — বাংলা'],
  ['te-IN', 'Telugu — తెలుగు'], ['ta-IN', 'Tamil — தமிழ்'], ['kn-IN', 'Kannada — ಕನ್ನಡ'],
  ['ml-IN', 'Malayalam — മലയാളം'], ['mr-IN', 'Marathi — मराठी'], ['gu-IN', 'Gujarati — ગુજરાતી'],
  ['pa-IN', 'Punjabi — ਪੰਜਾਬੀ'], ['or-IN', 'Odia — ଓଡ଼ିଆ'], ['as-IN', 'Assamese — অসমীয়া'],
  ['ur-IN', 'Urdu — اردو'], ['sa-IN', 'Sanskrit — संस्कृतम्'], ['mni-IN', 'Manipuri'],
  ['brx-IN', 'Bodo'], ['kok-IN', 'Konkani'], ['mai-IN', 'Maithili'], ['doi-IN', 'Dogri'],
  ['ne-IN', 'Nepali — नेपाली'], ['sat-IN', 'Santali'], ['sd-IN', 'Sindhi — سنڌي']
];

const FEMALE_VOICE_NAME = /female|woman|girl|aarti|aditi|anjali|asha|bhavna|charvi|chitra|devika|divya|heera|jahnavi|jaya|kavitha|kaveri|kavya|lekha|lalitha|malini|mary|meera|neerja|neha|nalini|priya|reshma|riya|sita|sneha|sunita|swara|trupti|vaidehi|vidya|suhana|lavanya|yukti|varuni|asmita|trisha|brinda|zahira|kirra|falak|mehuli/i;

function isLikelyFemaleVoice(voice) {
  return FEMALE_VOICE_NAME.test(`${voice?.name || ''} ${voice?.voiceURI || ''}`);
}

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
        localStorage.getItem('insightboard-gnani-key') || ''
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
  const [browserVoices, setBrowserVoices] = useState([]);
  const [browserVoiceURI, setBrowserVoiceURI] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return undefined;
    const refresh = () => setBrowserVoices(window.speechSynthesis.getVoices?.() || []);
    refresh();
    window.speechSynthesis.addEventListener?.('voiceschanged', refresh);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', refresh);
  }, []);

  const languageBrowserVoices = useMemo(() => {
    const prefix = language.split('-')[0].toLowerCase();
    return browserVoices.filter((item) => String(item.lang || '').toLowerCase().startsWith(prefix));
  }, [browserVoices, language]);
  const femaleBrowserVoices = useMemo(
    () => languageBrowserVoices.filter(isLikelyFemaleVoice),
    [languageBrowserVoices]
  );

  useEffect(() => {
    if (!femaleBrowserVoices.some((item) => item.voiceURI === browserVoiceURI)) {
      setBrowserVoiceURI(femaleBrowserVoices[0]?.voiceURI || '');
    }
  }, [femaleBrowserVoices, browserVoiceURI]);

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
        setKeyNotice('Enter your Indian language voice API key first.');
        return;
      }
      try {
        localStorage.setItem('insightboard-sarvam-key', clean);
      } catch {}
      setSavedSarvamKey(clean);
      setSarvamKeyInput('');
      setKeyNotice('Indian language voice key saved in localStorage.');
      summonInsi('voice', 'insi.ai · Indian language voice key ready');
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
    } catch {}
    setSavedGnaniKey('');
    setGnaniKeyInput('');
    setKeyNotice('Gnani key cleared from this browser.');
  }

  async function playFreeKokoroOrIndianBrowserVoice() {
    setTtsBusy(true);
    setTtsError('');
    setSpokenStatus('Preparing a free female voice from this device…');
    try {
      if (typeof window === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
        throw new Error('This browser does not provide text-to-speech. Try Chrome on Android or install a device voice engine.');
      }
      const voices = window.speechSynthesis.getVoices?.() || [];
      const prefix = language.split('-')[0].toLowerCase();
      const matching = voices.filter((item) => String(item.lang || '').toLowerCase().startsWith(prefix));
      const female = matching.filter(isLikelyFemaleVoice);
      const chosen = female.find((item) => item.voiceURI === browserVoiceURI) || female[0];
      if (!chosen) {
        const installed = matching.map((item) => item.name).filter(Boolean);
        throw new Error(installed.length
          ? `No clearly identifiable female ${language} voice is installed. Available device voices: ${installed.join(', ')}. Install a female voice for this language in your device Text-to-speech settings, then reload InsightBoard.`
          : `No ${language} voice is installed on this device. Install its voice data in Android Settings → Text-to-speech output, then reload InsightBoard.`);
      }
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(dataSummaryScript);
      utter.lang = language;
      utter.voice = chosen;
      utter.pitch = 1.04;
      utter.rate = Number(speed) || 1;
      utter.onend = () => setSpokenStatus(`Finished · ${chosen.name} · ${language} · free device voice`);
      utter.onerror = (event) => setTtsError(event?.error || 'The selected device voice could not speak this text.');
      window.speechSynthesis.speak(utter);
      setSpokenStatus(`Speaking with ${chosen.name} · ${language} · female voice preferred · no API key`);
      summonInsi('success', 'insi.ai · Free device voice started');
    } catch (err) {
      setTtsError(err?.message || 'Could not play speech.');
      setSpokenStatus('');
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
        setTtsError('Enter your Indian language voice API key above or switch to the free local/browser voice tier.');
        return;
      }
      setTtsBusy(true);
      summonInsi('voice', `insi.ai · Synthesizing Indian-language speech (${voice} · ${language})…`);
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
          throw new Error(data?.message || data?.error || 'Indian-language speech synthesis failed.');
        }
        const byteChars = atob(b64);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i += 1) {
          byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const wavBlob = new Blob([new Uint8Array(byteNumbers)], { type: 'audio/wav' });
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(URL.createObjectURL(wavBlob));
        summonInsi('success', 'insi.ai · Indian-language voice ready!');
      } catch (err) {
        setTtsError(err?.message || 'Could not generate Indian-language speech.');
      } finally {
        setTtsBusy(false);
      }
      return;
    }

    if (!activeGnaniKey) {
      setTtsError('Enter your Gnani API key above or switch to the free local/browser voice option.');
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
          <span className="v2-overline">MULTILINGUAL INDIAN VOICE STUDIO · FREE DEVICE VOICE</span>
          <h3 id="gnani-title">Data-Dependent Multilingual Voice Summary</h3>
        </div>
        <span className="gnani-status ready">FREE DEVICE VOICE</span>
      </div>

      <p className="v2-muted gnani-intro">
        Listen to an executive briefing generated from <strong>{datasetName || 'Active Dataset'}</strong> ({rows.length.toLocaleString()} records) using <strong>Free device text-to-speech</strong> (no API key required), or an Indian-language BYOK voice provider.
      </p>

      {/* Voice Engine Tier Selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }} role="tablist" aria-label="Voice TTS Engine">
        <button
          type="button"
          className={`v2-button ${ttsEngine === 'kokoro_free' ? 'primary' : 'secondary'} btn-3d`}
          onClick={() => setTtsEngine('kokoro_free')}
        >
          <Volume2 size={14} /> Free Female Device Voice (No API)
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
          <Languages size={14} /> Indian Language Voice (BYOK)
        </button>
      </div>

      {/* Optional BYOK Key Panel for Gnani or Sarvam */}
      {ttsEngine !== 'kokoro_free' && (
        <div className="gnani-key-panel">
          <div className="gnani-key-heading">
            <KeyRound size={15} />
            <strong>
              {ttsEngine === 'sarvam_byok'
                ? 'Indian Language Voice API Key (Saved in localStorage)'
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
                    ? '•••••••••••••••••••••••• (Indian voice key active)'
                    : 'Enter your Indian language voice API key…'
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
            <Volume2 size={13} /> 2. Select Voice Model <small>{ttsEngine === 'kokoro_free' ? `${femaleBrowserVoices.length} detected female voices for ${language}` : `${availableVoices.length} provider voices`}</small>
          </span>
          {ttsEngine === 'kokoro_free' ? (
            <select value={browserVoiceURI} onChange={(e) => { playButtonClick(); setBrowserVoiceURI(e.target.value); }}>
              {femaleBrowserVoices.length ? femaleBrowserVoices.map((item) => (
                <option key={item.voiceURI} value={item.voiceURI}>{item.name} ({item.lang}) · female match</option>
              )) : <option value="">No female voice detected for this language</option>}
            </select>
          ) : (
            <select value={voice} onChange={(e) => { playButtonClick(); setVoice(e.target.value); }}>
              {availableVoices.map((v) => <option key={v} value={v}>{v} ({language})</option>)}
            </select>
          )}
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
            <><Play size={15} /> {ttsEngine === 'kokoro_free' ? `Listen with Free Female Device Voice (${language})` : `Generate & Listen (${voice} · ${language})`}</>
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
            Uses free female-preferred device speech or optional Indian-language BYOK speech engines—distinct from the INSI Dove assistant&apos;s task confirmation voice.
          </small>
        </span>
      </div>
    </article>
  );
}
