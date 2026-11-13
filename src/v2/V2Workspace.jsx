import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  History,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  LogIn,
  LogOut,
  Mail,
  Database,
  ArrowUpRight,
  BookOpen,
  KeyRound,
  Headphones,
  ExternalLink,
  Lock,
  Gauge
} from 'lucide-react';
import './V2Workspace.css';
import GnaniVoiceStudio from './GnaniVoiceStudio.jsx';
import AIProviderHub, { generateZeroCostCloudSummary } from './AIProviderHub.jsx';
import UsageQuotasPanel from './UsageQuotasPanel.jsx';
import { playButtonClick, summonInsi } from './uiSound.js';

const GEMINI_BROWSER_MODEL = 'gemini-2.5-flash';
const LANGUAGES = [
  ['en', 'English'],
  ['te', 'తెలుగు'],
  ['hi', 'हिन्दी'],
  ['ta', 'தமிழ்'],
  ['bn', 'বাংলা'],
  ['mr', 'मराठी'],
  ['kn', 'ಕನ್ನಡ'],
  ['ml', 'മലയാളം'],
  ['ur', 'اردو']
];

const LABELS = {
  en: {
    title: 'InsightBoard VDB · AI, Voice & Quotas Studio',
    subtitle: '10-Provider BYOK AI Hub, Gnani Timbre v2.5 Voice Summary, Gemini Summary, and Usage & Quotas.',
    quality: 'Smart Data Checks',
    records: 'Rows inspected',
    duplicates: 'Duplicate rows',
    invalid: 'Invalid numbers',
    missing: 'Missing value fields',
    local: 'Local checks: your uploaded rows stay in this browser.',
    language: 'Summary language',
    summarize: 'Generate Gemini Summary',
    ai: 'Gemini AI Summary',
    none: 'Enter your Gemini API key and click Generate Gemini Summary.',
    save: 'Save snapshot to account',
    history: 'Saved Report History',
    historyNote: 'Cloud report history is currently unavailable without account sign-in.',
    noHistory: 'No local saved reports. Cloud history requires account sign-in.',
    saved: 'Aggregate snapshot saved to your account.',
    cleared: 'Account report history cleared.',
    delete: 'Delete saved report',
    clear: 'Clear history',
    apiError: 'Request failed'
  },
  hi: {
    title: 'InsightBoard VDB · एआई, वॉइस और कोटा स्टूडियो',
    subtitle: '10-प्रोवाइडर BYOK हब, ज्ञानी वॉइस सारांश, साइन-इन जेमिनी सारांश और कोटा।',
    quality: 'स्मार्ट डेटा जाँच',
    records: 'जाँची गई पंक्तियाँ',
    duplicates: 'डुप्लिकेट पंक्तियाँ',
    invalid: 'अमान्य संख्याएँ',
    missing: 'खाली मान वाले फ़ील्ड',
    local: 'स्थानीय जाँच: अपलोड की गई पंक्तियाँ इसी ब्राउज़र में रहती हैं।',
    language: 'सारांश की भाषा',
    summarize: 'जेमिनी सारांश बनाएँ',
    ai: 'जेमिनी एआई सारांश',
    none: 'अपना जेमिनी API की दर्ज करें और सारांश बनाएँ पर क्लिक करें।',
    save: 'स्नैपशॉट खाते में सहेजें',
    history: 'सहेजे गए रिपोर्ट',
    historyNote: 'केवल समेकित आँकड़े और फ़िल्टर सहेजे जाते हैं।',
    noHistory: 'इस खाते में कोई स्नैपशॉट नहीं है।',
    saved: 'स्नैपशॉट सहेजा गया।',
    cleared: 'इतिहास हटाया गया।',
    delete: 'स्नैपशॉट हटाएँ',
    clear: 'इतिहास हटाएँ',
    apiError: 'अनुरोध विफल'
  },
  te: {
    title: 'InsightBoard VDB · AI, వాయిస్ & కోటా స్టూడియో',
    subtitle: '10-Provider BYOK AI Hub, Gnani వాయిస్ సారాంశం, సైన్-ఇన్ Gemini సారాంశాలు మరియు కోటాలు.',
    quality: 'స్మార్ట్ డేటా తనిఖీలు',
    records: 'పరిశీలించిన వరుసలు',
    duplicates: 'డూప్లికేట్ వరుసలు',
    invalid: 'చెల్లని సంఖ్యలు',
    missing: 'ఖాళీ విలువలున్న ఫీల్డ్‌లు',
    local: 'స్థానిక తనిఖీలు: మీ దిగుమతి చేసిన వరుసలు ఈ browser‌లోనే ఉంటాయి.',
    language: 'సారాంశ భాష',
    summarize: 'Gemini సారాంశం రూపొందించు',
    ai: 'Gemini AI సారాంశం',
    none: 'మీ Gemini API key నమోదు చేసి సారాంశం రూపొందించండి.',
    save: 'స్నాప్‌షాట్‌ను సేవ్ చేయి',
    history: 'సేవ్ చేసిన రిపోర్టులు',
    historyNote: 'సారాంశ గణాంకాలు, ఫిల్టర్లు మాత్రమే నిల్వ అవుతాయి.',
    noHistory: 'ఈ ఖాతాలో స్నాప్‌షాట్‌లు లేవు.',
    saved: 'స్నాప్‌షాట్ సేవ్ అయింది.',
    cleared: 'చరిత్ర తొలగించబడింది.',
    delete: 'స్నాప్‌షాట్ తొలగించు',
    clear: 'చరిత్ర తొలగించు',
    apiError: 'అభ్యర్థన విఫలమైంది'
  }
};

const blank = (value) =>
  value === null || value === undefined || (typeof value === 'string' && !value.trim());

function rowFingerprint(row, fields) {
  return JSON.stringify(
    fields.map((field) => {
      const value = row?.[field];
      return value === null || value === undefined
        ? ''
        : typeof value === 'object'
        ? JSON.stringify(value).slice(0, 160)
        : String(value).trim().slice(0, 160);
    })
  );
}

function checkData(rows, fields, numericFields) {
  const list = Array.isArray(rows) ? rows : [];
  const subset = list.slice(0, 10000);
  const checkedFields = (fields || []).slice(0, 40);
  const missing = checkedFields
    .map((field) => {
      const count = subset.filter((row) => blank(row?.[field])).length;
      return {
        field,
        count,
        percent: subset.length ? Math.round((count / subset.length) * 100) : 0
      };
    })
    .filter((item) => item.count)
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 6);
  const seen = new Set();
  let duplicates = 0;
  for (const row of subset) {
    const key = rowFingerprint(row, checkedFields.slice(0, 20));
    if (seen.has(key)) duplicates++;
    else seen.add(key);
  }
  const invalid = (numericFields || []).slice(0, 20).reduce(
    (total, field) =>
      total +
      subset.filter((row) => !blank(row?.[field]) && Number.isNaN(Number(row[field]))).length,
    0
  );
  return {
    scanned: subset.length,
    total: list.length,
    limited: list.length > subset.length,
    missing,
    duplicates,
    invalid
  };
}

function loadGeminiKey() {
  try {
    if (localStorage.getItem('insightboard-gemini-remember') === 'true') {
      return localStorage.getItem('insightboard-gemini-key') || '';
    }
    return sessionStorage.getItem('insightboard-gemini-key') || '';
  } catch {
    return '';
  }
}

function downloadText(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function GitHubLogo({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0.297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385 0.6 0.113 0.82-0.258 0.82-0.577 0-0.285-0.01-1.04-0.015-2.04-3.338 0.724-4.042-1.61-4.042-1.61-0.546-1.385-1.335-1.755-1.335-1.755-1.087-0.744 0.084-0.729 0.084-0.729 1.205 0.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495 0.998 0.108-0.776 0.417-1.305 0.76-1.605-2.665-0.3-5.466-1.332-5.466-5.93 0-1.31 0.465-2.38 1.235-3.22-0.135-0.303-0.54-1.523 0.105-3.176 0 0 1.005-0.322 3.3 1.23 0.96-0.267 1.98-0.399 3-0.405 1.02 0.006 2.04 0.138 3 0.405 2.28-1.552 3.285-1.23 3.285-1.23 0.645 1.653 0.24 2.873 0.12 3.176 0.765 0.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92 0.42 0.36 0.81 1.096 0.81 2.22 0 1.606-0.015 2.896-0.015 3.286 0 0.315 0.21 0.69 0.825 0.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export default function V2Workspace({
  analytics,
  rows,
  fields,
  numericFields,
  datasetName = ''
}) {
  const [uiLanguage, setUiLanguage] = useState('en');
  const [summaryLanguage, setSummaryLanguage] = useState('en');
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState('');
  const [summarySource, setSummarySource] = useState('');
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]);
  const [authToken, setAuthToken] = useState(() => {
    try { return sessionStorage.getItem('insightboard-api-token') || ''; } catch { return ''; }
  });
  const [account, setAccount] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [reportsBusy, setReportsBusy] = useState(false);
  const [reportSaveBusy, setReportSaveBusy] = useState(false);

  // Personal Gemini API Key (BYOK) controls — unlocked after Sign-In
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [savedGeminiKey, setSavedGeminiKey] = useState(loadGeminiKey);
  const [rememberGeminiKey, setRememberGeminiKey] = useState(() => {
    try {
      return localStorage.getItem('insightboard-gemini-remember') === 'true';
    } catch {
      return false;
    }
  });

  const copy = LABELS[uiLanguage] || LABELS.en;
  const quality = useMemo(() => checkData(rows, fields, numericFields), [rows, fields, numericFields]);
  const activeGeminiKey = geminiKeyInput.trim() || savedGeminiKey.trim();

  const fetchReports = useCallback(async (token) => {
    if (!token) { setHistory([]); return; }
    setReportsBusy(true);
    try {
      const response = await fetch('/api/reports', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        try { sessionStorage.removeItem('insightboard-api-token'); } catch {}
        setAuthToken('');
        setAccount(null);
        setHistory([]);
        setMessage('Your session expired. Sign in again to access saved reports.');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not load saved reports.');
      setHistory(Array.isArray(result.reports) ? result.reports : []);
    } catch (error) {
      setMessage(error?.message || 'Could not load saved reports.');
    } finally {
      setReportsBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!authToken) { setAccount(null); setHistory([]); return undefined; }
    let active = true;
    (async () => {
      try {
        const response = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Session expired.');
        if (!active) return;
        setAccount(data.user || null);
        await fetchReports(authToken);
      } catch (error) {
        if (!active) return;
        try { sessionStorage.removeItem('insightboard-api-token'); } catch {}
        setAuthToken('');
        setAccount(null);
        setHistory([]);
        setMessage(error?.message || 'Please sign in again.');
      }
    })();
    return () => { active = false; };
  }, [authToken, fetchReports]);

  async function submitAuth(event) {
    event.preventDefault();
    playButtonClick();
    const email = authEmail.trim().toLowerCase();
    if (!email || !authPassword) {
      setMessage('Enter your email address and password.');
      return;
    }
    setAuthBusy(true);
    setMessage('');
    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: authPassword })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.token) throw new Error(data.error || 'Authentication failed.');
      try { sessionStorage.setItem('insightboard-api-token', data.token); } catch {}
      setAccount(data.user || { email });
      setAuthToken(data.token);
      setAuthPassword('');
      setMessage(authMode === 'register' ? 'Account created. You are signed in.' : 'Signed in successfully.');
      summonInsi('signin', 'INSI · Email account authenticated');
    } catch (error) {
      setMessage(error?.message || 'Could not authenticate. Try again.');
    } finally {
      setAuthBusy(false);
    }
  }

  function signOut() {
    playButtonClick();
    try { sessionStorage.removeItem('insightboard-api-token'); } catch {}
    setAuthToken('');
    setAccount(null);
    setHistory([]);
    setAuthPassword('');
    setMessage('You have signed out.');
  }

  async function saveSnapshot() {
    if (!authToken) {
      setMessage('Sign in with your email and password before saving a report.');
      return;
    }
    const snapshot = analytics || {};
    setReportSaveBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: `${snapshot.datasetName || datasetName || 'InsightBoard report'} · ${new Date().toLocaleString()}`,
          datasetName: snapshot.datasetName || datasetName || 'Current dataset',
          recordCount: Number(snapshot.recordCount) || 0,
          filters: snapshot.filters || {},
          snapshot,
          summary
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not save this report.');
      await fetchReports(authToken);
      setMessage('Aggregate report snapshot saved to your account.');
      summonInsi('success', 'INSI · Report snapshot saved');
    } catch (error) {
      setMessage(error?.message || 'Could not save the report.');
    } finally {
      setReportSaveBusy(false);
    }
  }

  async function deleteSnapshot(id) {
    if (!authToken) return;
    try {
      const response = await fetch(`/api/reports/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not delete this report.');
      setHistory(current => current.filter(item => item.id !== id));
      setMessage('Saved report deleted.');
    } catch (error) {
      setMessage(error?.message || 'Could not delete the report.');
    }
  }

  function saveGeminiKey() {
    playButtonClick();
    const clean = geminiKeyInput.trim();
    if (!clean) {
      setMessage('Paste your personal Gemini API key first.');
      summonInsi('error', "Oops! Let's try again.");
      return;
    }
    try {
      sessionStorage.setItem('insightboard-gemini-key', clean);
      if (rememberGeminiKey) {
        localStorage.setItem('insightboard-gemini-remember', 'true');
        localStorage.setItem('insightboard-gemini-key', clean);
      } else {
        localStorage.removeItem('insightboard-gemini-remember');
        localStorage.removeItem('insightboard-gemini-key');
      }
    } catch {}
    setSavedGeminiKey(clean);
    setGeminiKeyInput('');
    setMessage('Personal Gemini API key saved in this browser.');
    summonInsi('signin', 'insi.ai · Gemini API key verified');
  }

  function forgetGeminiKey() {
    playButtonClick();
    try {
      sessionStorage.removeItem('insightboard-gemini-key');
      localStorage.removeItem('insightboard-gemini-remember');
      localStorage.removeItem('insightboard-gemini-key');
    } catch {}
    setSavedGeminiKey('');
    setGeminiKeyInput('');
    setMessage('Removed personal Gemini API key from this browser.');
  }

  async function generateSummary(preferZeroCost = false) {
    playButtonClick();
    setBusy(true);
    setMessage('');
    setSummary('');
    setSummarySource('');
    summonInsi('heavy_ai');

    const langName = LANGUAGES.find(([code]) => code === summaryLanguage)?.[1] || 'English';

    if (!activeGeminiKey || preferZeroCost) {
      try {
        const freeRes = await generateZeroCostCloudSummary({
          engineId: 'pollinations_free',
          datasetName: datasetName || 'Active Dataset',
          analytics,
          analysisMode: 'overview',
          languageName: langName
        });
        setSummary(freeRes.text);
        setSummarySource(freeRes.source);
        setMessage(`Generated with ${freeRes.source} (No API key required).`);
        summonInsi('success');
      } catch (err) {
        setMessage(err?.message || 'Could not generate summary.');
        summonInsi('error');
      } finally {
        setBusy(false);
      }
      return;
    }

    try {
      const prompt = `Write a concise executive summary in ${langName} strictly grounded in this aggregate dataset snapshot:\n${JSON.stringify(analytics)}`;
      const directRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_BROWSER_MODEL}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': activeGeminiKey
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 700, temperature: 0.25 }
          })
        }
      );
      const directData = await directRes.json().catch(() => ({}));
      const directText = (directData?.candidates?.[0]?.content?.parts || [])
        .map((p) => p?.text || '')
        .join('\n')
        .trim();
      if (directRes.ok && directText) {
        setSummary(directText);
        setSummarySource('gemini-byok');
        setMessage('Generated using your Gemini API key.');
        summonInsi('success');
        setBusy(false);
        return;
      }
      const errDetail = directData?.error?.message || 'Verify your Gemini API key is active.';
      throw new Error(errDetail);
    } catch (err) {
      setMessage(err?.message || 'Could not generate Gemini summary. Verify your API key.');
      summonInsi('error');
    } finally {
      setBusy(false);
    }
  }


  const [studioTab, setStudioTab] = useState('python_search');
  function exportSnapshot(item) {
    playButtonClick();
    downloadText(JSON.stringify(item.snapshot, null, 2), 'insightboard-snapshot.json');
  }

  return (
    <section className="v2-workspace" aria-labelledby="v2-title">
      <div className="v2-heading">
        <div>
          <div className="v2-eyebrow">
            <Sparkles size={15} /> INSIGHTBOARD VDB · VERSION 2.2.0
          </div>
          <h2 id="v2-title">{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <label className="v2-language">
          <span>UI</span>
          <select
            value={uiLanguage}
            onChange={(event) => {
              playButtonClick();
              setUiLanguage(event.target.value);
            }}
            aria-label="Workspace language"
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
            <option value="te">తెలుగు</option>
          </select>
        </label>
      </div>

      <div className="workspace-tabs-bar" style={{ marginBottom: 18 }} role="tablist" aria-label="Studio sub-modules">
        <div className="workspace-tabs-group">
          <button
            type="button"
            className={`workspace-tab-btn btn-3d ${studioTab === 'python_search' ? 'active' : ''}`}
            onClick={() => {
              playButtonClick();
              setStudioTab('python_search');
            }}
          >
            <Sparkles size={14} /> <span>10-Provider AI &amp; Python</span>
          </button>
          <button
            type="button"
            className={`workspace-tab-btn btn-3d ${studioTab === 'voice_live' ? 'active' : ''}`}
            onClick={() => {
              playButtonClick();
              setStudioTab('voice_live');
            }}
          >
            <Headphones size={14} /> <span>Gnani AI Voice Studio</span>
          </button>
          <button
            type="button"
            className={`workspace-tab-btn btn-3d ${studioTab === 'summary_cloud' ? 'active' : ''}`}
            onClick={() => {
              playButtonClick();
              setStudioTab('summary_cloud');
            }}
          >
            <Sparkles size={14} /> <span>Gemini Summary</span>
          </button>
          <button
            type="button"
            className={`workspace-tab-btn btn-3d ${studioTab === 'usage_quotas' ? 'active' : ''}`}
            onClick={() => {
              playButtonClick();
              setStudioTab('usage_quotas');
              summonInsi('quota', 'INSI · Inspecting free-tier service quotas');
            }}
          >
            <Gauge size={14} /> <span>Usage &amp; Quotas</span>
          </button>
        </div>
        <div className="workspace-tabs-meta">
          <button
            type="button"
            className={`workspace-tab-btn secondary btn-3d ${studioTab === 'all' ? 'active' : ''}`}
            onClick={() => {
              playButtonClick();
              setStudioTab(studioTab === 'all' ? 'python_search' : 'all');
            }}
          >
            <span>{studioTab === 'all' ? 'Compact View' : 'Show All Studio Panels'}</span>
          </button>
        </div>
      </div>

      {(studioTab === 'usage_quotas' || studioTab === 'all') && <UsageQuotasPanel />}

      {(studioTab === 'python_search' || studioTab === 'all') && (
        <AIProviderHub rows={rows} fields={fields} datasetName={datasetName} analytics={analytics} />
      )}

      {(studioTab === 'voice_live' || studioTab === 'all') && (
        <GnaniVoiceStudio
          rows={rows}
          fields={fields}
          datasetName={datasetName}
          analytics={analytics}
        />
      )}

      {(studioTab === 'summary_cloud' || studioTab === 'all') && (
        <>
          <div className="v2-account-panel v2-account-hero">
            <div className="v2-account-intro">
              <div className="v2-account-mark">
                <Sparkles size={19} />
              </div>
              <div>
                <span className="v2-overline">GEMINI AI &amp; DATA INSIGHTS</span>
                <h3>Dashboard that works for you.</h3>
                <p>
                  Generate multilingual AI summaries with your own Gemini API key. Your dataset analysis stays available without an account.
                </p>
                <div className="v2-hero-visual" aria-hidden="true">
                  <div className="v2-hero-glow"></div>
                  <div className="v2-mini-chart">
                    <span style={{ '--bar-height': '28%', '--bar-delay': '0ms' }}></span>
                    <span style={{ '--bar-height': '55%', '--bar-delay': '90ms' }}></span>
                    <span style={{ '--bar-height': '39%', '--bar-delay': '180ms' }}></span>
                    <span style={{ '--bar-height': '78%', '--bar-delay': '270ms' }}></span>
                    <span style={{ '--bar-height': '92%', '--bar-delay': '360ms' }}></span>
                  </div>
                  <div className="v2-visual-caption">
                    <span>MADE IN INDIA</span>
                    <strong>InsightBoard VDB</strong>
                    <small>Explore · Optimize · Save</small>
                  </div>
                </div>
              </div>
            </div>
            <div className="v2-account-content">
              {account ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center', height: '100%' }}>
                  <div>
                    <strong style={{ display: 'flex', alignItems: 'center', gap: 7 }}><CheckCircle2 size={15} /> {account.email}</strong>
                    <small className="v2-muted">Signed in · Saved report history enabled</small>
                  </div>
                  <div className="v2-button-row">
                    <button type="button" className="v2-button secondary btn-3d" onClick={() => void fetchReports(authToken)} disabled={reportsBusy}>
                      <RefreshCw size={14} /> {reportsBusy ? 'Refreshing…' : 'Refresh reports'}
                    </button>
                    <button type="button" className="v2-text-button" onClick={signOut}><LogOut size={14} /> Sign out</button>
                  </div>
                </div>
              ) : (
                <form onSubmit={submitAuth} style={{ display: 'flex', flexDirection: 'column', gap: 9, justifyContent: 'center', height: '100%' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className={authMode === 'login' ? 'v2-button primary btn-3d' : 'v2-button secondary btn-3d'} onClick={() => setAuthMode('login')}>Sign in</button>
                    <button type="button" className={authMode === 'register' ? 'v2-button primary btn-3d' : 'v2-button secondary btn-3d'} onClick={() => setAuthMode('register')}>Create account</button>
                  </div>
                  <label className="v2-field">
                    <span>Email address</span>
                    <input type="email" value={authEmail} onChange={event => setAuthEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required maxLength={254} />
                  </label>
                  <label className="v2-field">
                    <span>Password {authMode === 'register' ? '(10–128 characters)' : ''}</span>
                    <input type="password" value={authPassword} onChange={event => setAuthPassword(event.target.value)} placeholder="Enter your password" autoComplete={authMode === 'register' ? 'new-password' : 'current-password'} required minLength={authMode === 'register' ? 10 : 1} maxLength={128} />
                  </label>
                  <button type="submit" className="v2-button primary btn-3d" disabled={authBusy}>
                    {authBusy ? <RefreshCw size={15} className="v2-spin" /> : authMode === 'register' ? <Mail size={15} /> : <LogIn size={15} />}
                    {authBusy ? 'Please wait…' : authMode === 'register' ? 'Create email account' : 'Sign in with email'}
                  </button>
                  <small className="v2-muted">Email and password only. Google sign-in is not offered.</small>
                </form>
              )}
            </div>
          </div>

          <div className="v2-grid">
            <article className="v2-card v2-quality">
              <div className="v2-card-title">
                <AlertTriangle size={18} />
                <h3>{copy.quality}</h3>
                <span className="v2-local-pill">DATA BOUND</span>
              </div>
              <p className="v2-muted">{copy.local}</p>
              <div className="v2-stats">
                <div>
                  <span>{copy.records}</span>
                  <strong>
                    {quality.scanned.toLocaleString()}
                    {quality.limited ? '+' : ''}
                  </strong>
                </div>
                <div>
                  <span>{copy.duplicates}</span>
                  <strong>{quality.duplicates.toLocaleString()}</strong>
                </div>
                <div>
                  <span>{copy.invalid}</span>
                  <strong>{quality.invalid.toLocaleString()}</strong>
                </div>
              </div>
              <div className="v2-subhead">{copy.missing}</div>
              {quality.missing.length ? (
                <ul className="v2-quality-list">
                  {quality.missing.map((item) => (
                    <li key={item.field}>
                      <span>{item.field}</span>
                      <strong>
                        {item.percent}% <small>({item.count})</small>
                      </strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="v2-good">
                  <CheckCircle2 size={15} /> No missing values found in inspected fields.
                </p>
              )}
            </article>

            <article className="v2-card v2-ai">
              <div className="v2-card-title">
                <Sparkles size={18} />
                <h3>{copy.ai}</h3>
                <span className="v2-ai-badge ready">
                  {activeGeminiKey ? 'BYOK READY' : 'API KEY OPTIONAL'}
                </span>
              </div>
              <p className="v2-muted">
                Generate a multilingual executive summary for <strong>{datasetName || 'Active Dataset'}</strong> using your personal Gemini API key.
              </p>

              <div className="v2-key-entry" style={{ marginBottom: 14 }}>
                <div className="v2-key-entry-heading">
                  <div>
                    <span className="v2-overline">PERSONAL GEMINI API KEY (OPTIONAL)</span>
                    <h4>Your Gemini API Key (BYOK)</h4>
                  </div>
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">
                    Get a Gemini key <ExternalLink size={11} />
                  </a>
                </div>
                <label className="v2-field">
                  <input type="password" value={geminiKeyInput} onChange={(e) => setGeminiKeyInput(e.target.value)} placeholder={savedGeminiKey ? '•••••••••••••••••••••••• (Personal Gemini key active)' : 'Enter your Gemini API key to generate summary…'} autoComplete="off" />
                </label>
                <label className="v2-consent v2-remember">
                  <input type="checkbox" checked={rememberGeminiKey} onChange={(e) => setRememberGeminiKey(e.target.checked)} />
                  <span>Remember key on this private device</span>
                </label>
                <div className="v2-button-row">
                  <button type="button" className="v2-button secondary btn-3d" onClick={saveGeminiKey}>
                    <KeyRound size={13} /> Save Gemini Key
                  </button>
                  {savedGeminiKey && <button type="button" className="v2-text-button" onClick={forgetGeminiKey}><Trash2 size={13} /> Forget key</button>}
                </div>
              </div>

              <label className="v2-field">
                <span>{copy.language}</span>
                <select value={summaryLanguage} onChange={(event) => { playButtonClick(); setSummaryLanguage(event.target.value); }}>
                  {LANGUAGES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                </select>
              </label>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="v2-button primary v2-generate-button btn-3d" onClick={() => void generateSummary(false)} disabled={busy} style={{ flex: 1 }}>
                  {busy ? <RefreshCw size={15} className="v2-spin" /> : <Sparkles size={15} />}{' '}
                  {busy ? 'Generating summary…' : activeGeminiKey ? copy.summarize : 'Generate Free AI Summary (Zero Key · Puter / Pollinations)'}
                </button>
                {activeGeminiKey && (
                  <button type="button" className="v2-button secondary btn-3d" onClick={() => void generateSummary(true)} disabled={busy}>
                    <Sparkles size={14} /> Free Keyless Tier
                  </button>
                )}
              </div>

              {summary ? (
                <div className="v2-summary" aria-live="polite">
                  <h4>
                    InsightBoard VDB ·{' '}
                    {summarySource === 'gemini-byok'
                      ? 'Personal Gemini Key Summary'
                      : summarySource || 'Executive Summary'}
                  </h4>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{summary}</div>
                </div>
              ) : (
                <p className="v2-note">{copy.none}</p>
              )}

              {message && (
                <div className="v2-message" role="status">
                  <span>{message}</span>
                  <button onClick={() => setMessage('')} aria-label="Dismiss message">
                    ×
                  </button>
                </div>
              )}
            </article>
          </div>

          <article className="v2-card v2-history">
            <div className="v2-card-title">
              <History size={18} />
              <h3>{copy.history}</h3>
              {account && <button type="button" className="v2-button secondary btn-3d" onClick={() => void saveSnapshot()} disabled={reportSaveBusy}>
                <Save size={14} /> {reportSaveBusy ? 'Saving…' : 'Save current snapshot'}
              </button>}
            </div>
            <p className="v2-muted">{account ? copy.historyNote : 'Sign in with your email and password to save and view reports across sessions.'}</p>
            {!account ? (
              <p className="v2-note">Your dashboard remains usable without an account. Sign in above to enable cloud report history.</p>
            ) : reportsBusy ? (
              <p className="v2-note">Loading saved reports…</p>
            ) : history.length === 0 ? (
              <p className="v2-note">{copy.noHistory}</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {history.map(item => (
                  <div key={item.id} className="v2-history-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: 12, border: '1px solid var(--v2-border, #dbe3ef)', borderRadius: 10 }}>
                    <div>
                      <strong>{item.title}</strong>
                      <small className="v2-muted" style={{ display: 'block' }}>{item.datasetName} · {Number(item.recordCount || 0).toLocaleString()} rows · {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</small>
                    </div>
                    <div className="v2-button-row">
                      <button type="button" className="v2-button secondary btn-3d" onClick={() => exportSnapshot(item)}>Export</button>
                      <button type="button" className="v2-text-button" onClick={() => void deleteSnapshot(item.id)} aria-label="Delete saved report"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </>
      )}

      <div className="v2-project-footer">
        <div className="v2-project-footer-copy">
          <strong>InsightBoard VDB · Documentation &amp; Source Repository</strong>
          <small>
            Explore the Notion project dossier or inspect the GitHub source repository.
          </small>
        </div>
        <div className="v2-project-footer-actions">
          <a
            className="v2-project-link v2-project-link-primary btn-3d"
            href="https://github.com/Dipayanhaldar/insightboard-dual-dataset"
            target="_blank"
            rel="noopener noreferrer"
          >
            <GitHubLogo size={15} /> <span>GitHub Repository</span> <ArrowUpRight size={14} />
          </a>
          <a
            className="v2-project-link v2-project-link-primary btn-3d"
            href="https://app.notion.com/p/405a0f05cdd281a4a971fd32474e0fbd"
            target="_blank"
            rel="noopener noreferrer"
          >
            <BookOpen size={15} /> <span>Project Dossier</span> <ArrowUpRight size={14} />
          </a>
          <a
            className="v2-project-link v2-project-link-secondary"
            href="https://github.com/Dipayanhaldar/insightboard-dual-dataset"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open source repository"
            title="Open source repository"
          >
            <ArrowUpRight size={15} />
          </a>
        </div>
      </div>
    </section>
  );
}
