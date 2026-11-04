import React, { useEffect, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Download, Headphones, KeyRound,
  Languages, RefreshCw, ShieldCheck, Volume2, Wand2
} from 'lucide-react';
import './GnaniVoiceStudio.css';
import { buildLocalDemoSummary } from './localDemoInsights.js';

const TTS_VOICES = {
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

const TTS_LANGUAGES = [
  ['en-IN', 'English (India)'], ['hi-IN', 'Hindi — हिन्दी'],
  ['te-IN', 'Telugu — తెలుగు'], ['ta-IN', 'Tamil — தமிழ்'], ['kn-IN', 'Kannada — ಕನ್ನಡ'],
  ['ml-IN', 'Malayalam — മലയാളം'], ['mr-IN', 'Marathi — मराठी'], ['bn-IN', 'Bengali — বাংলা'],
  ['gu-IN', 'Gujarati — ગુજરાતી'], ['pa-IN', 'Punjabi — ਪੰਜਾਬੀ']
];

async function errorFromResponse(response) {
  const body = await response.json().catch(() => ({}));
  return body?.error || ('Request failed (' + response.status + ').');
}

export default function GnaniVoiceStudio({ authToken, rows = [], fields = [], datasetName = '', sourceIsUploaded = false, analytics = {} }) {
  const [availability, setAvailability] = useState('checking');
  const [keyDraft, setKeyDraft] = useState('');
  const [gnaniKey, setGnaniKey] = useState(() => {
    try { return sessionStorage.getItem('insightboard-gnani-byok-key') || ''; } catch { return ''; }
  });
  const [keyNotice, setKeyNotice] = useState('');
  const [ttsLanguage, setTtsLanguage] = useState('te-IN');
  const [voice, setVoice] = useState('Suhana');
  const [text, setText] = useState('');
  const [localizedSummary, setLocalizedSummary] = useState('');
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [ttsBusy, setTtsBusy] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [ttsError, setTtsError] = useState('');
  const [sttLanguage, setSttLanguage] = useState('te-IN');
  const [audioFile, setAudioFile] = useState(null);
  const [summaryNotice, setSummaryNotice] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/voice/status', { headers: { Accept: 'application/json' } })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Voice status is unavailable.')))
      .then(data => { if (active) setAvailability(data.available && data.requiresUserKey ? 'ready' : 'setup'); })
      .catch(() => { if (active) setAvailability('offline'); });
    return () => { active = false; };
  }, []);

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  useEffect(() => {
    if (!sourceIsUploaded || !Array.isArray(rows) || !rows.length || !Array.isArray(fields) || !fields.length) {
      setText(''); setLocalizedSummary(''); setAudioUrl(''); setSummaryNotice(''); return;
    }
    // The voice content is a concise, language-matched dashboard summary, not a raw dump of rows.
    setText('');
    setLocalizedSummary('');
    setAudioUrl('');
    void loadLocalizedSummary(ttsLanguage);
  }, [rows, fields, datasetName, sourceIsUploaded]);

  async function loadLocalizedSummary(languageCode) {
    if (!sourceIsUploaded || !analytics || !Array.isArray(rows) || !rows.length) {
      setTtsError('Upload a JSON or CSV dataset first. Demo datasets cannot be sent to Gnani.');
      return;
    }
    const languageMap = { 'en-IN':'en', 'hi-IN':'hi', 'te-IN':'te', 'ta-IN':'ta', 'kn-IN':'kn', 'ml-IN':'ml', 'mr-IN':'mr', 'bn-IN':'bn', 'gu-IN':'gu', 'pa-IN':'pa' };
    setSummaryBusy(true); setTtsError(''); setAudioUrl('');
    try { const capped = buildLocalDemoSummary(analytics, languageMap[languageCode] || 'en').slice(0, 3800); setLocalizedSummary(capped); setText(capped); setSummaryNotice('Local rule-based summary; no AI provider was called and no dataset was sent for summarization.'); }
    finally { setSummaryBusy(false); }
  }

  function useGnaniKey() {
    const value = String(keyDraft || gnaniKey).trim();
    if (!value) {
      setKeyNotice('Paste your own Gnani API key first.');
      return;
    }
    if (value.length < 8 || value.length > 512 || /[\r\n]/.test(value)) {
      setKeyNotice('That key does not look valid. Check it in your Gnani account and try again.');
      return;
    }
    let storedInSession = true;
    try {
      sessionStorage.setItem('insightboard-gnani-byok-key', value);
    } catch {
      storedInSession = false;
    }
    setGnaniKey(value);
    setKeyDraft('');
    setKeyNotice(storedInSession
      ? 'Your key is set for this browser session only.'
      : 'Session storage is blocked. The key is held only in this page and will be lost on refresh.');
    setTtsError('');
  }

  function forgetGnaniKey() {
    try { sessionStorage.removeItem('insightboard-gnani-byok-key'); } catch {}
    setGnaniKey('');
    setKeyDraft('');
    setKeyNotice('Gnani key removed from this browser session.');
    setAudioUrl('');
  }

  function updateLanguage(nextLanguage) {
    setTtsLanguage(nextLanguage);
    setVoice(TTS_VOICES[nextLanguage]?.[0] || '');
    setTtsError('');
    setAudioUrl('');
    setLocalizedSummary('');
    setText('');
    if (sourceIsUploaded) void loadLocalizedSummary(nextLanguage);
  }

  function playLocalPreview() {
    setTtsError('');
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      setTtsError('Local browser speech is not supported in this browser. Use your own provider key for cloud speech.');
      return;
    }
    const previewText = String(text || '').trim().slice(0, 500);
    if (!previewText) {
      setTtsError('Upload a dataset and wait for its local summary before playing a preview.');
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(previewText);
      const langMap = { 'en-IN':'en-IN', 'hi-IN':'hi-IN', 'te-IN':'te-IN', 'ta-IN':'ta-IN', 'kn-IN':'kn-IN', 'ml-IN':'ml-IN', 'mr-IN':'mr-IN', 'bn-IN':'bn-IN', 'gu-IN':'gu-IN', 'pa-IN':'pa-IN' };
      utterance.lang = langMap[ttsLanguage] || ttsLanguage;
      utterance.rate = Number(speed);
      utterance.onerror = () => setTtsError('The browser could not play this local voice. Check installed voices and language support, or use your own provider key.');
      window.speechSynthesis.speak(utterance);
    } catch {
      setTtsError('The browser could not start local speech. Check browser/device voice support.');
    }
  }

  async function generateSpeech(event) {
    event.preventDefault();
    setTtsError('');
    if (!gnaniKey) { setTtsError('Add your own Gnani API key in the Voice Studio key panel first.'); return; }
    if (!text.trim()) {
      setTtsError('Select an output language to generate a matching-language summary, then generate speech.');
      return;
    }
    setTtsBusy(true);
    setAudioUrl('');
    try {
      const headers = { 'Content-Type': 'application/json' };
      const endpoint = '/api/voice/tts'; headers['X-Gnani-Api-Key'] = gnaniKey;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text: text.trim(), language: ttsLanguage, voice: voice, speed: Number(speed) })
      });
      if (!response.ok) throw new Error(await errorFromResponse(response));
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('audio/')) throw new Error('Gnani returned an unexpected response instead of audio.');
      const blob = await response.blob();
      if (!blob.size) throw new Error('Gnani returned an empty audio file.');
      setAudioUrl(URL.createObjectURL(blob));
    } catch (error) {
      setTtsError(error?.message || 'Speech generation failed. Please try again.');
    } finally {
      setTtsBusy(false);
    }
  }

  const providerUnavailable = availability !== 'ready';

  return (
    <article className="v2-card gnani-studio" aria-labelledby="gnani-title">
      <div className="v2-card-title gnani-title-row">
        <div className="gnani-mark"><Headphones size={19} /></div>
        <div className="gnani-heading-copy">
          <span className="v2-overline">GNANI VOICE AI</span>
          <h3 id="gnani-title">Voice Studio</h3>
        </div>
        <span className={'gnani-status ' + availability}>{availability === 'checking' ? 'CHECKING' : availability === 'ready' ? 'BYO KEY MODE' : availability === 'setup' ? 'API SETUP NEEDED' : 'API OFFLINE'}</span>
      </div>
      <p className="v2-muted gnani-intro">Preview with your device's browser voice, or generate cloud speech using your own Gnani API key. Browser preview depends on installed voices and may not work offline.</p>

      <div className="gnani-key-panel">
        <div className="gnani-key-heading"><KeyRound size={16} /><strong>Bring your own Gnani API key</strong><span>{gnaniKey ? 'KEY SET' : 'KEY REQUIRED'}</span></div>
        <p>Use a paid or otherwise eligible key from your own Gnani account. Site-provided keys are limited to 1,000 characters; personal BYOK supports up to 4,000 characters per request under the current integration, only where allowed by Gnani's provider policy and your account quota. Your key's plan may impose a lower limit or additional charges.</p>
        <label className="v2-field gnani-key-field">
          <span>Your Gnani API key</span>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={keyDraft}
            onChange={event => { setKeyDraft(event.target.value); setKeyNotice(''); }}
            placeholder={gnaniKey ? 'Key is set for this session · paste to replace' : 'Paste your personal Gnani API key'}
            aria-label="Your personal Gnani API key"
          />
        </label>
        <div className="gnani-key-actions">
          <button type="button" className="v2-button primary" onClick={useGnaniKey}><KeyRound size={14} /> Use key in this session</button>
          <button type="button" className="v2-button secondary" onClick={forgetGnaniKey}>Forget key</button>
        </div>
        {keyNotice && <p className="gnani-key-notice" role="status">{keyNotice}</p>}
      </div>

        <form onSubmit={generateSpeech} className="gnani-form">
          <label className="v2-field"><span><Languages size={13} /> Language</span><select value={ttsLanguage} onChange={event => updateLanguage(event.target.value)}>{TTS_LANGUAGES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
          <label className="v2-field"><span><Volume2 size={13} /> Voice</span><select value={voice} onChange={event => { setVoice(event.target.value); setAudioUrl(''); setTtsError(''); }}>{(TTS_VOICES[ttsLanguage] || []).map(name => <option key={name} value={name}>{name}</option>)}</select></label>
          <label className="v2-field"><span>Dataset summary in selected language <small>{text.length.toLocaleString()} / {'4,000'} characters</small></span><textarea maxLength={4000} rows={5} value={text} readOnly placeholder="Choose an output language to summarize the uploaded dataset in that language." /><small>{sourceIsUploaded ? "Gnani summarizes your uploaded dataset in your selected speech language. Speech requests can contain up to 4,000 characters, subject to Gnani's current provider limits and your account/key quota. The original dataset is not changed." : 'Demo presets are not eligible. Upload a JSON or CSV file first.'}</small></label>
          <div className="gnani-speed"><label htmlFor="gnani-speed">Speech speed</label><input id="gnani-speed" type="range" min="0.85" max="1.15" step="0.05" value={speed} onChange={event => setSpeed(Number(event.target.value))} /><output htmlFor="gnani-speed">{Number(speed).toFixed(2)}×</output></div>
          <button className="v2-button secondary" type="button" onClick={playLocalPreview} disabled={summaryBusy || !text.trim()}><Volume2 size={15} /> Local browser preview (no API key)</button>
          <button className="v2-button primary gnani-action" type="submit" disabled={ttsBusy || summaryBusy || providerUnavailable || !sourceIsUploaded || !gnaniKey || !text.trim()}>{ttsBusy ? <RefreshCw size={15} className="v2-spin" /> : <Wand2 size={15} />}{ttsBusy ? 'Generating audio…' : 'Generate Gnani speech'}</button>
          {ttsError && <p className="gnani-error" role="alert"><AlertTriangle size={15} />{ttsError}</p>}
          {audioUrl && <div className="gnani-audio-result"><div><CheckCircle2 size={16} /><strong>Speech generated</strong><span>MP3 audio · available for this session</span></div><audio controls preload="metadata" src={audioUrl}>Your browser does not support audio playback.</audio><a className="v2-button secondary gnani-download" href={audioUrl} download="gnani-timbre-speech.mp3"><Download size={14} /> Download MP3</a></div>}
        </form>

      <div className="gnani-privacy"><ShieldCheck size={16} /><span><strong>BYOK privacy and billing</strong><small>Your key is kept in this browser session and sent over HTTPS only when you request speech. InsightBoard does not intentionally save or log the key. Your provider account is responsible for usage and charges. Text/audio is sent to Gnani for processing; generated audio is not saved to InsightBoard's database. The summary is generated locally with a rule-based helper.</small></span></div>
      <p className="gnani-footnote"><a href="https://docs.gnani.ai/api/introduction/quick-start" target="_blank" rel="noreferrer">Gnani API quick start</a> · <a href="https://docs.gnani.ai/api/TTS/tts-inference" target="_blank" rel="noreferrer">TTS docs</a> · Text-to-speech is generated from the active uploaded dataset summary.</p>
    </article>
  );
}
