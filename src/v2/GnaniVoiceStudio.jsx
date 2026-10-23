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

export default function GnaniVoiceStudio({ authToken }) {
  const [mode, setMode] = useState('tts');
  const [availability, setAvailability] = useState('checking');
  const [keyDraft, setKeyDraft] = useState('');
  const [gnaniKey, setGnaniKey] = useState(() => {
    try { return sessionStorage.getItem('insightboard-gnani-byok-key') || ''; } catch { return ''; }
  });
  const [keyNotice, setKeyNotice] = useState('');
  const [ttsLanguage, setTtsLanguage] = useState('te-IN');
  const [voice, setVoice] = useState('Suhana');
  const [text, setText] = useState('నమస్కారం! ఇది ఇన్‌సైట్‌బోర్డ్ వాయిస్ పరీక్ష.');
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
    return () => { active = false; };
  }, []);

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

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
  }

  async function generateSpeech(event) {
    event.preventDefault();
    setTtsError('');
    if (!authToken) {
      setTtsError('Sign in or create an InsightBoard account above to use the voice tools.');
      return;
    }
    if (!gnaniKey) {
      setTtsError('Add your own Gnani API key in the Voice Studio key panel first.');
      return;
    }
    if (!text.trim()) {
      setTtsError('Enter some text before generating speech.');
      return;
    }
    setTtsBusy(true);
    setAudioUrl('');
    try {
      const response = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + authToken, 'X-Gnani-Api-Key': gnaniKey },
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
    if (file.size > AUDIO_LIMIT_BYTES) {
      setAudioFile(null);
      setSttError('The upload limit is 15 MB. Choose a smaller audio file.');
      event.target.value = '';
      return;
    }
    setAudioFile(file);
  }

  async function transcribeAudio(event) {
    event.preventDefault();
    setSttError('');
    setTranscript('');
    if (!authToken) {
      setSttError('Sign in or create an InsightBoard account above to use the voice tools.');
      return;
    }
    if (!gnaniKey) {
      setSttError('Add your own Gnani API key in the Voice Studio key panel first.');
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
      const response = await fetch('/api/voice/stt', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + authToken, 'X-Gnani-Api-Key': gnaniKey },
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

  const accountLocked = !authToken;
  const providerUnavailable = availability !== 'ready';

  return (
    <article className="v2-card gnani-studio" aria-labelledby="gnani-title">
      <div className="v2-card-title gnani-title-row">
        <div className="gnani-mark"><Headphones size={19} /></div>
        <div className="gnani-heading-copy">
          <span className="v2-overline">GNANI VOICE AI</span>
          <h3 id="gnani-title">Voice Studio</h3>
        </div>
        <span className={'gnani-status ' + availability}>
          {availability === 'checking' ? 'CHECKING' : availability === 'ready' ? 'BYO KEY MODE' : availability === 'setup' ? 'API SETUP NEEDED' : 'API OFFLINE'}
        </span>
      </div>
      <p className="v2-muted gnani-intro">Convert text into natural speech or transcribe a short audio clip with Gnani’s Timbre v2.5 and Prisma v2.5 models.</p>

      <div className="gnani-tabs" role="tablist" aria-label="Voice tool">
        <button type="button" role="tab" aria-selected={mode === 'tts'} className={mode === 'tts' ? 'active' : ''} onClick={() => setMode('tts')}><Volume2 size={15} /> Text to speech</button>
        <button type="button" role="tab" aria-selected={mode === 'stt'} className={mode === 'stt' ? 'active' : ''} onClick={() => setMode('stt')}><Mic size={15} /> Speech to text</button>
      </div>

      {availability === 'setup' && <div className="gnani-alert"><AlertTriangle size={16} /><span><strong>Voice API is not available.</strong> Check that the Stage 2 server has deployed the BYOK-enabled code.</span></div>}
      {availability === 'offline' && <div className="gnani-alert"><AlertTriangle size={16} /><span>Could not check the voice API status. Confirm the Stage 2 API deployment is online.</span></div>}
      {accountLocked && <div className="gnani-alert"><ShieldCheck size={16} /><span>Sign in or create an InsightBoard account in the panel above to enable voice requests. Gnani usage is charged to the key you supply, not a shared InsightBoard key.</span></div>}

      <div className="gnani-key-panel">
        <div className="gnani-key-heading"><KeyRound size={16} /><strong>Bring your own Gnani API key</strong><span>{gnaniKey ? 'KEY SET' : 'KEY REQUIRED'}</span></div>
        <p>Use the key from your own Gnani account. InsightBoard does not use a shared owner key for voice requests.</p>
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

      {mode === 'tts' ? (
        <form onSubmit={generateSpeech} className="gnani-form">
          <label className="v2-field"><span><Languages size={13} /> Language</span><select value={ttsLanguage} onChange={event => updateLanguage(event.target.value)}>{TTS_LANGUAGES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
          <label className="v2-field"><span><Volume2 size={13} /> Voice</span><select value={voice} onChange={event => { setVoice(event.target.value); setAudioUrl(''); setTtsError(''); }}>{(TTS_VOICES[ttsLanguage] || []).map(name => <option key={name} value={name}>{name}</option>)}</select></label>
          <label className="v2-field"><span>Text to speak <small>{text.length.toLocaleString()} / 4,000 characters</small></span><textarea maxLength={4000} rows={4} value={text} onChange={event => { setText(event.target.value); setTtsError(''); }} placeholder="Type or paste the text to turn into speech." /></label>
          <div className="gnani-speed"><label htmlFor="gnani-speed">Speech speed</label><input id="gnani-speed" type="range" min="0.85" max="1.15" step="0.05" value={speed} onChange={event => setSpeed(Number(event.target.value))} /><output htmlFor="gnani-speed">{Number(speed).toFixed(2)}×</output></div>
          <button className="v2-button primary gnani-action" type="submit" disabled={ttsBusy || accountLocked || providerUnavailable || !gnaniKey || !text.trim()}>{ttsBusy ? <RefreshCw size={15} className="v2-spin" /> : <Wand2 size={15} />}{ttsBusy ? 'Generating audio…' : 'Generate speech'}</button>
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
            <small>{audioFile ? (audioFile.size / (1024 * 1024)).toFixed(2) + ' MB · ready to transcribe' : 'WAV, MP3, OGG, FLAC, AAC or M4A · up to 60 seconds · 15 MB max'}</small>
            <span className="v2-button secondary"><FileText size={14} /> Browse files</span>
          </label>
          <button className="v2-button primary gnani-action" type="submit" disabled={sttBusy || accountLocked || providerUnavailable || !gnaniKey || !audioFile}>{sttBusy ? <RefreshCw size={15} className="v2-spin" /> : <Mic size={15} />}{sttBusy ? 'Transcribing audio…' : 'Transcribe audio'}</button>
          {sttError && <p className="gnani-error" role="alert"><AlertTriangle size={15} />{sttError}</p>}
          {transcript && <div className="gnani-transcript"><div className="gnani-transcript-heading"><div><CheckCircle2 size={16} /><strong>Transcript</strong></div><button type="button" className="v2-button secondary" onClick={() => void copyTranscript()}><Copy size={13} />{copied ? 'Copied' : 'Copy text'}</button></div><textarea rows={6} readOnly value={transcript} aria-label="Transcribed text" /><p>Transcript is held in this page’s current state and is not saved in InsightBoard’s report database.</p></div>}
        </form>
      )}

      <div className="gnani-privacy"><ShieldCheck size={16} /><span><strong>BYOK privacy and billing</strong><small>Your key is kept in this browser session and sent over HTTPS only when you request speech or transcription. The server uses it for that request only; InsightBoard does not save or log the key and no shared owner key is used. Your Gnani account is responsible for usage associated with your key. Text/audio is sent to Gnani for processing; uploaded audio and generated audio are not saved to InsightBoard’s database.</small></span></div>
      <p className="gnani-footnote"><a href="https://docs.gnani.ai/api/introduction/quick-start" target="_blank" rel="noreferrer">Gnani API quick start</a> · <a href="https://docs.gnani.ai/api/STT/speech-to-text" target="_blank" rel="noreferrer">STT docs</a> · <a href="https://docs.gnani.ai/api/TTS/tts-inference" target="_blank" rel="noreferrer">TTS docs</a> · Speech-to-text clips are limited to 60 seconds by Gnani.</p>
    </article>
  );
}
