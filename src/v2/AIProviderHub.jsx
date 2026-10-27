import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowUpRight, CheckCircle2, Cpu, KeyRound, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import './AIProviderHub.css';

const PROVIDERS = [
  {
    id: 'openai', name: 'OpenAI', model: 'gpt-4.1-mini',
    keyUrl: 'https://platform.openai.com/api-keys', docsUrl: 'https://developers.openai.com/api/reference/overview',
    pricingUrl: 'https://openai.com/api/pricing/',
    note: 'GPT family and other OpenAI API models.'
  },
  {
    id: 'anthropic', name: 'Anthropic Claude', model: 'claude-3-5-haiku-latest',
    keyUrl: 'https://console.anthropic.com/settings/keys', docsUrl: 'https://platform.claude.com/docs/en/api/overview',
    pricingUrl: 'https://www.anthropic.com/pricing',
    note: 'Claude Messages API; model access depends on your Anthropic account.'
  },
  {
    id: 'gemini', name: 'Google Gemini', model: 'gemini-2.5-flash',
    keyUrl: 'https://aistudio.google.com/app/apikey', docsUrl: 'https://ai.google.dev/api',
    pricingUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
    note: 'Separate provider playground key; your existing Gemini dashboard BYOK flow is unchanged.'
  },
  {
    id: 'xai', name: 'xAI Grok', model: 'grok-3-mini',
    keyUrl: 'https://console.x.ai/', docsUrl: 'https://docs.x.ai/docs',
    pricingUrl: 'https://docs.x.ai/developers/pricing',
    note: 'OpenAI-compatible chat completions endpoint.'
  },
  {
    id: 'mistral', name: 'Mistral AI', model: 'mistral-small-latest',
    keyUrl: 'https://console.mistral.ai/api-keys/', docsUrl: 'https://docs.mistral.ai/api/',
    pricingUrl: 'https://mistral.ai/pricing/api/',
    note: 'Choose a model ID available to your Mistral account.'
  },
  {
    id: 'deepseek', name: 'DeepSeek', model: 'deepseek-chat',
    keyUrl: 'https://platform.deepseek.com/api_keys', docsUrl: 'https://api-docs.deepseek.com/',
    pricingUrl: 'https://api-docs.deepseek.com/quick_start/pricing/',
    note: 'OpenAI-compatible chat API; provider balance and quotas apply.'
  },
  {
    id: 'groq', name: 'Groq', model: 'openai/gpt-oss-20b',
    keyUrl: 'https://console.groq.com/keys', docsUrl: 'https://console.groq.com/docs/api-reference',
    pricingUrl: 'https://groq.com/pricing/',
    note: 'Low-latency hosted inference; active models and free quotas can change.'
  },
  {
    id: 'cohere', name: 'Cohere', model: 'command-a-03-2025',
    keyUrl: 'https://dashboard.cohere.com/api-keys', docsUrl: 'https://docs.cohere.com/v2/reference/chat',
    pricingUrl: 'https://cohere.com/pricing',
    note: 'Cohere v2 Chat API.'
  },
  {
    id: 'openrouter', name: 'OpenRouter', model: 'google/gemini-2.5-flash',
    keyUrl: 'https://openrouter.ai/keys', docsUrl: 'https://openrouter.ai/developers',
    pricingUrl: 'https://openrouter.ai/pricing',
    note: 'One API for models from many upstream providers; the model ID includes its provider.'
  },
  {
    id: 'together', name: 'Together AI', model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    keyUrl: 'https://api.together.ai/settings/api-keys', docsUrl: 'https://docs.together.ai/reference/chat-completions',
    pricingUrl: 'https://www.together.ai/pricing',
    note: 'Open-model inference; confirm model availability in the current catalog.'
  }
];

function readSessionKey(providerId) {
  try { return sessionStorage.getItem('insightboard-ai-provider:' + providerId) || ''; }
  catch { return ''; }
}

export default function AIProviderHub({ rows = [], fields = [], datasetName = '', sourceIsUploaded = false }) {
  const [providerId, setProviderId] = useState('openai');
  const [apiKey, setApiKey] = useState(() => readSessionKey('openai'));
  const [keyDraft, setKeyDraft] = useState('');
  const [model, setModel] = useState(PROVIDERS[0].model);
  const [analysisMode, setAnalysisMode] = useState('overview');
  const datasetReady = sourceIsUploaded && Array.isArray(rows) && rows.length > 0 && Array.isArray(fields) && fields.length > 0;
  const [maxOutputTokens, setMaxOutputTokens] = useState(512);
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const provider = PROVIDERS.find(item => item.id === providerId) || PROVIDERS[0];

  useEffect(() => {
    setApiKey(readSessionKey(providerId));
    setKeyDraft('');
    setModel(provider.model);
    setAnswer('');
    setError('');
    setNotice('');
  }, [providerId]);

  function saveKey() {
    const value = String(keyDraft || apiKey).trim();
    if (!value) {
      setNotice('Paste a personal API key from the selected provider first.');
      return;
    }
    if (value.length < 8 || value.length > 512 || /[\r\n]/.test(value)) {
      setNotice('The key format looks invalid. Check the provider console and try again.');
      return;
    }
    let saved = false;
    try {
      sessionStorage.setItem('insightboard-ai-provider:' + providerId, value);
      saved = true;
    } catch {}
    setApiKey(value);
    setKeyDraft('');
    setNotice(saved
      ? 'Key stored for this provider in this browser session only.'
      : 'Browser storage is blocked. The key is held only in this page until refresh.');
    setError('');
  }

  function forgetKey() {
    try { sessionStorage.removeItem('insightboard-ai-provider:' + providerId); } catch {}
    setApiKey('');
    setKeyDraft('');
    setNotice('Key removed from this browser session.');
    setAnswer('');
    setError('');
  }

  async function runPrompt(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setAnswer('');
    const key = String(keyDraft || apiKey).trim();
    if (!key) {
      setError('Enter your own API key for the selected provider first.');
      return;
    }
    if (!model.trim()) {
      setError('Enter a model ID from this provider’s current model catalog.');
      return;
    }
    if (!datasetReady) {
      setError('Upload a JSON or CSV dataset first. AI analysis is restricted to user-uploaded data.');
      return;
    }

    setBusy(true);
    try {
      const response = await fetch('/api/ai/provider', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Provider-Api-Key': key
        },
        body: JSON.stringify({ provider: providerId, model: model.trim(), datasetName, fields, rows, analysisMode, maxOutputTokens })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || 'Provider request failed. Check the API key, model ID, account quota/billing, or provider status.');
      if (typeof result?.answer !== 'string' || !result.answer.trim()) throw new Error('The provider returned no text.');
      setAnswer(result.answer);
      setNotice('Response received from ' + provider.name + ' · ' + (result.model || model));
      if (keyDraft.trim()) saveKey();
    } catch (cause) {
      setError(cause?.message || 'Could not contact the selected provider.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="v2-card ai-provider-hub" aria-labelledby="ai-provider-title">
      <div className="v2-card-title">
        <span className="ai-provider-icon"><Cpu size={18} /></span>
        <div className="ai-provider-title-copy">
          <span className="v2-overline">UPLOADED-DATA ANALYSIS</span>
          <h3 id="ai-provider-title">AI API Provider Hub</h3>
        </div>
        <span className="ai-provider-count">10 PROVIDERS</span>
      </div>
      <p className="v2-muted">Analyze only the JSON/CSV dataset you upload. This hub does not accept general-purpose prompts. The existing Gemini dashboard summary remains separate.</p>

      <div className="ai-provider-grid">
        {PROVIDERS.map((item, index) => (
          <button type="button" key={item.id} className={'ai-provider-choice' + (providerId === item.id ? ' active' : '')} onClick={() => setProviderId(item.id)} aria-pressed={providerId === item.id}>
            <span className="ai-provider-number">{String(index + 1).padStart(2, '0')}</span>
            <span>{item.name}</span>
            {providerId === item.id && <CheckCircle2 size={15} />}
          </button>
        ))}
      </div>

      <form className="ai-provider-form" onSubmit={runPrompt}>
        <div className="ai-provider-current">
          <div>
            <span className="v2-overline">SELECTED PROVIDER</span>
            <h4>{provider.name}</h4>
            <p>{provider.note}</p>
          </div>
          <div className="ai-provider-links">
            <a href={provider.keyUrl} target="_blank" rel="noopener noreferrer">Get API key <ArrowUpRight size={12} /></a>
            <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer">API docs <ArrowUpRight size={12} /></a>
            <a href={provider.pricingUrl} target="_blank" rel="noopener noreferrer">Pricing <ArrowUpRight size={12} /></a>
          </div>
        </div>

        <label className="v2-field">
          <span>Personal API key <small>{apiKey ? 'Key is set for this session' : 'Never paste this key into GitHub or public chat'}</small></span>
          <input type="password" value={keyDraft} autoComplete="off" spellCheck={false} onChange={event => { setKeyDraft(event.target.value); setNotice(''); }} placeholder={apiKey ? 'Key saved for this session · paste to replace' : 'Paste your own provider API key'} />
        </label>
        <div className="ai-provider-key-actions">
          <button type="button" className="v2-button secondary" onClick={saveKey}><KeyRound size={14} /> Use key in this session</button>
          <button type="button" className="v2-text-button" onClick={forgetKey} disabled={!apiKey && !keyDraft}><Trash2 size={14} /> Forget key</button>
        </div>

        <div className="ai-provider-model-grid">
          <label className="v2-field">
            <span>Model ID</span>
            <input type="text" value={model} onChange={event => setModel(event.target.value)} maxLength={140} placeholder="Enter a model ID from the provider catalog" />
          </label>
          <label className="v2-field">
            <span>Maximum output</span>
            <select value={maxOutputTokens} onChange={event => setMaxOutputTokens(Number(event.target.value))}>
              <option value={256}>256 tokens</option>
              <option value={512}>512 tokens</option>
              <option value={1024}>1,024 tokens</option>
              <option value={2048}>2,048 tokens</option>
            </select>
          </label>
        </div>
        <div className="ai-provider-dataset-context">
          <strong>Active uploaded dataset</strong>
          <p>{datasetReady ? `${datasetName || 'Uploaded dataset'} · ${rows.length.toLocaleString()} rows · ${fields.length} fields` : 'No user-uploaded JSON/CSV dataset is active. Upload a file to enable AI analysis.'}</p>
        </div>
        <label className="v2-field"><span>Data analysis task</span><select value={analysisMode} onChange={event => setAnalysisMode(event.target.value)}><option value="overview">Summarize the dataset</option><option value="trends">Identify trends and comparisons</option><option value="quality">Check data quality and anomalies</option><option value="recommendations">Suggest evidence-based next steps</option></select></label>
        <button type="submit" className="v2-button primary ai-provider-run" disabled={busy || !datasetReady || (!apiKey && !keyDraft.trim()) || !model.trim()}>
          {busy ? <><span className="ai-provider-spinner" /> Analyzing uploaded data with {provider.name}…</> : <><Sparkles size={15} /> Analyze uploaded data with {provider.name}</>}
        </button>
      </form>

      {notice && <div className="ai-provider-notice" role="status"><CheckCircle2 size={14} /><span>{notice}</span></div>}
      {error && <div className="ai-provider-error" role="alert"><AlertTriangle size={14} /><span>{error}</span></div>}
      {answer && <section className="ai-provider-answer" aria-live="polite"><div><CheckCircle2 size={15} /><strong>{provider.name} response</strong></div><pre>{answer}</pre></section>}

      <div className="ai-provider-privacy">
        <ShieldCheck size={16} />
        <div>
          <strong>Bring Your Own Key · privacy and billing</strong>
          <p>The selected key is stored in this browser session only and sent to InsightBoard over HTTPS with each request. InsightBoard forwards the uploaded dataset and selected analysis task to the provider. The provider processes submitted data under its own terms. Usage, credits and any charges belong to the provider account associated with that key. This playground handles text/chat only, not every image, audio, video, embedding or fine-tuning API each provider offers.</p>
        </div>
      </div>
      <p className="ai-provider-footnote">The ten providers are a curated, non-ranked shortlist—not an objective global top-ten ranking. Model IDs, access, limits and pricing change; the live provider catalog is authoritative. Provider calls from this playground are rate-limited to 30 per IP per hour as an abuse guard.</p>
    </article>
  );
}
