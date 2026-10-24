import React, { useEffect, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Copy, Download, FileText, Headphones, KeyRound,
  Languages, Mic, RefreshCw, ShieldCheck, Volume2, Wand2
} from 'lucide-react';
import './GnaniVoiceStudio.css';

const STT_LANGUAGES = [
  ['bn-IN', 'Bengali — বাংলা'], ['en-IN', 'English (India)'], ['gu-IN', 'Gujarati — ગુજરાતી'],
  ['hi-IN', 'Hindi — हिन्दी'], ['kn-IN', 'Kannada — ಕನ್ನಡ'], ['ml-IN', 'Malayalam — മലയാളം'],
  ['mr-IN', 'Marathi — मराठी'], ['pa-IN', 'Punjabi — ਪੰਜਾਬੀ'], ['ta-IN', 'Tamil — தமிழ்'],
  ['te-IN', 'Telugu — తెలుగు']
];

const TTS_VOICES = {
  'en-IN': ['Kaveri', 'Trupti', 'Devika', 'Pranav', 'Shlok', 'Girish'],
  'hi-IN': ['Nalini', 'Bhavna', 'Yashvi', 'Urmila', 'Jwala', 'Chitra', 'Ambuja', 'Deepak', 'Roopesh', 'Vikrant', 'Hemraj', 'Jalaj', 'Omkar'],
  'hi-en': ['Poorvi'],
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
  ['en-IN', 'English (India)'], ['hi-IN', 'Hindi — हिन्दी'], ['hi-en', 'Hinglish'],
  ['te-IN', 'Telugu — తెలుగు'], ['ta-IN', 'Tamil — தமிழ்'], ['kn-IN', 'Kannada — ಕನ್ನಡ'],
  ['ml-IN', 'Malayalam — മലയാളം'], ['mr-IN', 'Marathi — मराठी'], ['bn-IN', 'Bengali — বাংলা'],
  ['gu-IN', 'Gujarati — ગુજરાતી'], ['pa-IN', 'Punjabi — ਪੰਜਾਬੀ']
];

const AUDIO_LIMIT_BYTES = 15 * 1024 * 1024;
const AUDIO_TYPES = new Set(['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/mp4', 'audio/x-m4a', 'audio/m4a']);

async function errorFromResponse(response) {
  const body = await response.json().catch(() => ({}));
  return body?.error || ('Request failed (' + response.status + ').');
}

export default function GnaniVoiceStudio({ authToken, rows = [], fields = [], datasetName = '', sourceIsUploaded = false, analytics = {} }) {
  const [mode, setMode] = useState('tts');
  const [availability, setAvailability] = useState('checking');
  const [serviceMode, setServiceMode] = useState('personal');
  const [siteStatus, setSiteStatus] = useState({ loading: true, available: false, limitPerIpPerUtcDay: 10, globalDailyLimit: 25 });
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
  const [sttBusy, setSttBusy] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [sttError, setSttError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/voice/status', { headers: { Accept: 'application/json' } })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Voice status is unavailable.')))
      .then(data => { if (active) setAvailability(data.available && data.requiresUserKey ? 'ready' : 'setup'); })
      .catch(() => { if (active) setAvailability('offline'); });
    fetch('/api/voice/site-status', { headers: { Accept: 'application/json' } })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Site voice status is unavailable.')))
      .then(data => { if (active) setSiteStatus({ loading: false, ...data }); })
      .catch(() => { if (active) setSiteStatus({ loading: false, available: false, limitPerIpPerUtcDay: 10, globalDailyLimit: 25 }); });
    return () => { active = false; };
  }, []);

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  useEffect(() => {
    if (!sourceIsUploaded || !Array.isArray(rows) || !rows.length || !Array.isArray(fields) || !fields.length) {
      setText(''); setLocalizedSummary(''); setAudioUrl(''); return;
    }
    // The voice content is a concise, language-matched dashboard summary, not a raw dump of rows.
    setText('');
    setLocalizedSummary('');
    setAudioUrl('');
    void loadLocalizedSummary(ttsLanguage);
  }, [rows, fields, datasetName, sourceIsUploaded]);

  async function loadLocalizedSummary(languageCode, targetMode = serviceMode) {
    if (!sourceIsUploaded || !analytics || !Array.isArray(rows) || !rows.length) {
      setTtsError('Upload a JSON or CSV dataset first. Demo datasets cannot be sent to Gnani.');
      return;
    }
    const languageMap = { 'en-IN':'en', 'hi-IN':'hi', 'hi-en':'hi', 'te-IN':'te', 'ta-IN':'ta', 'kn-IN':'kn', 'ml-IN':'ml', 'mr-IN':'mr', 'bn-IN':'bn', 'gu-IN':'gu', 'pa-IN':'pa' };
    setSummaryBusy(true);
    setTtsError('');
    setAudioUrl('');
    try {
      const response = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot: analytics, language: languageMap[languageCode] || 'en' })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not create a summary in the selected language.');
      const summary = String(result.summary || '').trim();
      if (!summary) throw new Error('The summary service returned no text. Try again.');
      const capped = summary.slice(0, targetMode === 'site' ? 950 : 3800);
      setLocalizedSummary(capped);
      setText(capped);
    } catch (error) {
      setLocalizedSummary('');
      setText('');
      setTtsError((error?.message || 'Could not create the language-matched summary.') + ' Check the dashboard summary service and try again.');
    } finally {
      setSummaryBusy(false);
    }
  }

  function changeServiceMode(nextMode) {
    setServiceMode(nextMode);
    setAudioUrl('');
    if (sourceIsUploaded) void loadLocalizedSummary(ttsLanguage, nextMode);
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
    setSttError('');
  }

  function forgetGnaniKey() {
    try { sessionStorage.removeItem('insightboard-gnani-byok-key'); } catch {}
    setGnaniKey('');
    setKeyDraft('');
    setKeyNotice('Gnani key removed from this browser session.');
    setAudioUrl('');
    setTranscript('');
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

  async function generateSpeech(event) {
    event.preventDefault();
    setTtsError('');
    if (serviceMode === 'personal' && !authToken) {
      setTtsError('Sign in or create an InsightBoard account above to use personal-key voice tools. Gnani will summarize uploaded data to a maximum of 1,000 characters for speech.');
      return;
    }
    if (serviceMode === 'personal' && !gnaniKey) {
      setTtsError('Add your own Gnani API key in the Voice Studio key panel first.');
      return;
    }
    if (serviceMode === 'site' && text.trim().length > 1000) {
      setTtsError("Site-key speech is limited to 1,000 characters. Personal BYOK supports up to 4,000 characters per request, subject to Gnani\'s current provider policy, account limits, and key quota.");
      return;
    }
    if (!text.trim()) {
      setTtsError('Select an output language to generate a matching-language summary, then generate speech.');
      return;
    }
    setTtsBusy(true);
    setAudioUrl('');
    try {
      const headers = { 'Content-Type': 'application/json' };
      let endpoint = '/api/voice/site-tts';
      if (serviceMode === 'personal') {
        endpoint = '/api/voice/tts';
        headers.Authorization = 'Bearer ' + authToken;
        headers['X-Gnani-Api-Key'] = gnaniKey;
      }
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

  function selectAudioFile(event) {
    const file = event.target.files?.[0] || null;
    setSttError('');
    setTranscript('');
    if (!file) {
      setAudioFile(null);
      return;
    }
    const extensionSupported = /\.(wav|mp3|ogg|flac|aac|m4a)$/i.test(file.name);
    if (!extensionSupported && !AUDIO_TYPES.has(file.type)) {
      setAudioFile(null);
      setSttError('Choose a WAV, MP3, OGG, FLAC, AAC, or M4A audio file.');
      event.target.value = '';
      return;
    }
    const audioLimit = serviceMode === 'site' ? 6 * 1024 * 1024 : AUDIO_LIMIT_BYTES;
    if (file.size > audioLimit) {
      setAudioFile(null);
      setSttError(serviceMode === 'site'
        ? 'Site-powered transcription is limited to 6 MB. Switch to personal-key mode for larger files.'
        : 'The upload limit is 15 MB. Choose a smaller audio file.');
      event.target.value = '';
      return;
    }
    setAudioFile(file);
  }

  async function transcribeAudio(event) {
    event.preventDefault();
    setSttError('');
    setTranscript('');
    if (serviceMode === 'personal' && !authToken) {
      setSttError('Sign in or create an InsightBoard account above to use personal-key voice tools.');
      return;
    }
    if (serviceMode === 'personal' && !gnaniKey) {
      setSttError('Add your own Gnani API key in the Voice Studio key panel first.');
      return;
    }
    if (serviceMode === 'site' && audioFile && audioFile.size > 6 * 1024 * 1024) {
      setSttError('Site-powered transcription is limited to 6 MB. Switch to personal-key mode for larger files.');
      return;
    }
    if (!audioFile) {
      setSttError('Choose an audio file to transcribe.');
      return;
    }
    setSttBusy(true);
    try {
      const form = new FormData();
      form.append('audio_file', audioFile);
      form.append('language_code', sttLanguage);
      form.append('format', 'transcribe');
      const headers = {};
      let endpoint = '/api/voice/site-stt';
      if (serviceMode === 'personal') {
        endpoint = '/api/voice/stt';
        headers.Authorization = 'Bearer ' + authToken;
        headers['X-Gnani-Api-Key'] = gnaniKey;
      }
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: form
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || ('Transcription failed (' + response.status + ').'));
      if (!payload?.transcript) throw new Error('Gnani returned no transcript for this audio.');
      setTranscript(payload.transcript);
    } catch (error) {
      setSttError(error?.message || 'Transcription failed. Please try again.');
    } finally {
      setSttBusy(false);
    }
  }

  async function copyTranscript() {
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setSttError('Clipboard access was blocked by your browser. Select the transcript text and copy it manually.');
    }
  }

  const accountLocked = serviceMode === 'personal' && !authToken;
  const providerUnavailable = serviceMode === 'site' ? !siteStatus.available : availability !== 'ready';

  return (
    <article className="v2-card gnani-studio" aria-labelledby="gnani-title">
      <div className="v2-card-title gnani-title-row">
        <div className="gnani-mark"><Headphones size={19} /></div>
        <div className="gnani-heading-copy">
          <span className="v2-overline">GNANI VOICE AI</span>
          <h3 id="gnani-title">Voice Studio</h3>
        </div>
        <span className={'gnani-status ' + (serviceMode === 'site' ? (siteStatus.available ? 'ready' : 'setup') : availability)}>
          {serviceMode === 'site'
            ? (siteStatus.loading ? 'CHECKING SITE KEY' : siteStatus.available ? 'SITE KEY · 10/IP/DAY' : 'SITE KEY NOT READY')
            : availability === 'checking' ? 'CHECKING' : availability === 'ready' ? 'BYO KEY MODE' : availability === 'setup' ? 'API SETUP NEEDED' : 'API OFFLINE'}
        </span>
      </div>
      <p className="v2-muted gnani-intro">Read your uploaded JSON/CSV dataset aloud in a language you select. Gnani is used here for spoken data access, not general-purpose transcription.</p>

      <div className="gnani-tabs" role="tablist" aria-label="Voice tool">
        <button type="button" role="tab" aria-selected={mode === 'tts'} className={mode === 'tts' ? 'active' : ''} onClick={() => setMode('tts')}><Volume2 size={15} /> Text to speech</button>
      </div>

      {serviceMode === 'personal' && availability === 'setup' && <div className="gnani-alert"><AlertTriangle size={16} /><span><strong>Personal-key voice API is not available.</strong> Check that the Stage 2 server has deployed the BYOK-enabled code.</span></div>}
      {serviceMode === 'personal' && availability === 'offline' && <div className="gnani-alert"><AlertTriangle size={16} /><span>Could not check the personal-key voice API status. Confirm the Stage 2 API deployment is online.</span></div>}
      {serviceMode === 'site' && !siteStatus.available && <div className="gnani-alert"><AlertTriangle size={16} /><span><strong>Site-powered Gnani is unavailable.</strong> The owner key must be configured as <code>GNANI_API_KEY</code> on the Stage 2 server. You can still switch back to personal-key mode.</span></div>}
      {serviceMode === 'personal' && accountLocked && <div className="gnani-alert"><ShieldCheck size={16} /><span>Sign in or create an InsightBoard account in the panel above to use your personal Gnani key. In site-powered mode, sign-in is not required.</span></div>}

      <div className="gnani-service-modes" role="group" aria-label="Gnani billing mode">
        <button type="button" className={serviceMode === 'personal' ? 'active' : ''} onClick={() => changeServiceMode('personal')}><KeyRound size={14} /> Personal key (BYOK)</button>
        <button type="button" className={serviceMode === 'site' ? 'active site-mode' : 'site-mode'} onClick={() => changeServiceMode('site')}><ShieldCheck size={14} /> Site key · 10/IP/day</button>
      </div>
      {serviceMode === 'site' && <div className="gnani-site-limit-note"><ShieldCheck size={15} /><span><strong>Limited public access</strong><small>Up to 10 site-key requests per public IP per UTC day, combined across speech and transcription. The whole website is capped at {siteStatus.globalDailyLimit || 25} site-key requests per UTC day. Speech text is limited to 1,000 characters and transcription uploads to 6 MB. Personal BYOK can support up to 4,000 characters per request subject to provider policy and your quota. The cap is an abuse guard, not a guarantee of zero billing.</small></span></div>}

      {serviceMode === 'personal' && <div className="gnani-key-panel">
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
      </div>}

      {mode === 'tts' ? (
        <form onSubmit={generateSpeech} className="gnani-form">
          <label className="v2-field"><span><Languages size={13} /> Language</span><select value={ttsLanguage} onChange={event => updateLanguage(event.target.value)}>{TTS_LANGUAGES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
          <label className="v2-field"><span><Volume2 size={13} /> Voice</span><select value={voice} onChange={event => { setVoice(event.target.value); setAudioUrl(''); setTtsError(''); }}>{(TTS_VOICES[ttsLanguage] || []).map(name => <option key={name} value={name}>{name}</option>)}</select></label>
          <label className="v2-field"><span>Dataset summary in selected language <small>{text.length.toLocaleString()} / {serviceMode === 'site' ? '1,000' : '4,000'} characters</small></span><textarea maxLength={serviceMode === 'site' ? 1000 : 4000} rows={5} value={text} readOnly placeholder="Choose an output language to summarize the uploaded dataset in that language." /><small>{sourceIsUploaded ? "Gnani summarizes your uploaded dataset in your selected speech language. Site-key mode is limited to 1,000 characters; personal BYOK can use up to 4,000 characters per speech request, subject to Gnani's current provider limits and your account/key quota. The original dataset is not changed." : 'Demo presets are not eligible. Upload a JSON or CSV file first.'}</small></label>
          <div className="gnani-speed"><label htmlFor="gnani-speed">Speech speed</label><input id="gnani-speed" type="range" min="0.85" max="1.15" step="0.05" value={speed} onChange={event => setSpeed(Number(event.target.value))} /><output htmlFor="gnani-speed">{Number(speed).toFixed(2)}×</output></div>
          <button className="v2-button primary gnani-action" type="submit" disabled={ttsBusy || summaryBusy || accountLocked || providerUnavailable || !sourceIsUploaded || (serviceMode === 'personal' && (!gnaniKey || !authToken)) || !text.trim()}>{ttsBusy ? <RefreshCw size={15} className="v2-spin" /> : <Wand2 size={15} />}{ttsBusy ? 'Generating audio…' : 'Generate speech'}</button>
          {ttsError && <p className="gnani-error" role="alert"><AlertTriangle size={15} />{ttsError}</p>}
          {audioUrl && <div className="gnani-audio-result"><div><CheckCircle2 size={16} /><strong>Speech generated</strong><span>MP3 audio · available for this session</span></div><audio controls preload="metadata" src={audioUrl}>Your browser does not support audio playback.</audio><a className="v2-button secondary gnani-download" href={audioUrl} download="gnani-timbre-speech.mp3"><Download size={14} /> Download MP3</a></div>}
        </form>
      ) : (
        <form onSubmit={transcribeAudio} className="gnani-form">
          <label className="v2-field"><span><Languages size={13} /> Spoken language</span><select value={sttLanguage} onChange={event => setSttLanguage(event.target.value)}>{STT_LANGUAGES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
          <label className="gnani-upload">
            <input type="file" accept=".wav,.mp3,.ogg,.flac,.aac,.m4a,audio/wav,audio/mpeg,audio/ogg,audio/flac,audio/aac,audio/mp4" onChange={selectAudioFile} />
            <span className="gnani-upload-icon"><Mic size={21} /></span>
            <strong>{audioFile ? audioFile.name : 'Choose an audio file'}</strong>
            <small>{audioFile ? (audioFile.size / (1024 * 1024)).toFixed(2) + ' MB · ready to transcribe' : (serviceMode === 'site' ? 'WAV, MP3, OGG, FLAC, AAC or M4A · 6 MB max for site-key mode' : 'WAV, MP3, OGG, FLAC, AAC or M4A · up to 60 seconds · 15 MB max')}</small>
            <span className="v2-button secondary"><FileText size={14} /> Browse files</span>
          </label>
          <button className="v2-button primary gnani-action" type="submit" disabled={sttBusy || accountLocked || providerUnavailable || (serviceMode === 'personal' && !gnaniKey) || !audioFile || (serviceMode === 'site' && audioFile.size > 6 * 1024 * 1024)}>{sttBusy ? <RefreshCw size={15} className="v2-spin" /> : <Mic size={15} />}{sttBusy ? 'Transcribing audio…' : 'Transcribe audio'}</button>
          {sttError && <p className="gnani-error" role="alert"><AlertTriangle size={15} />{sttError}</p>}
          {transcript && <div className="gnani-transcript"><div className="gnani-transcript-heading"><div><CheckCircle2 size={16} /><strong>Transcript</strong></div><button type="button" className="v2-button secondary" onClick={() => void copyTranscript()}><Copy size={13} />{copied ? 'Copied' : 'Copy text'}</button></div><textarea rows={6} readOnly value={transcript} aria-label="Transcribed text" /><p>Transcript is held in this page’s current state and is not saved in InsightBoard’s report database.</p></div>}
        </form>
      )}

      <div className="gnani-privacy"><ShieldCheck size={16} /><span><strong>{serviceMode === 'site' ? 'Site key limits and data use' : 'BYOK privacy and billing'}</strong><small>{serviceMode === 'site' ? 'This mode sends requests through the site owner’s Gnani API key. It is limited to 10 requests per IP per UTC day and 25 requests site-wide per UTC day, with smaller text/audio limits. Requests and text/audio are sent to Gnani for processing. Do not submit confidential data.' : 'Your key is kept in this browser session and sent over HTTPS only when you request speech or transcription. The server uses it for that request only; InsightBoard does not save or log the key. Your Gnani account is responsible for usage associated with your key. Text/audio is sent to Gnani for processing; uploaded audio and generated audio are not saved to InsightBoard’s database.'}</small></span></div>
      <p className="gnani-footnote"><a href="https://docs.gnani.ai/api/introduction/quick-start" target="_blank" rel="noreferrer">Gnani API quick start</a> · <a href="https://docs.gnani.ai/api/TTS/tts-inference" target="_blank" rel="noreferrer">TTS docs</a> · Gnani reads uploaded data only; it does not accept custom text or unrelated audio in this dashboard.</p>
    </article>
  );
}
