import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  Cpu,
  Globe,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import './AIProviderHub.css';

export default function AIProviderHub({
  rows = [],
  fields = [],
  datasetName = '',
  analytics = {}
}) {
  // 1. Google Search Grounding (gemini-3.8-flash with googleSearch tool)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchResult, setSearchResult] = useState(null);

  // 2. Connected Python Scientific Backend Service (/api/python/analyze)
  const [pythonStatus, setPythonStatus] = useState('Connecting to Python Scientific Engine…');
  const [pythonBusy, setPythonBusy] = useState(false);
  const [pythonReport, setPythonReport] = useState(null);

  // 3. Multi-Lens Dataset Analysis (/api/ai/analyze-dataset)
  const [analysisMode, setAnalysisMode] = useState('overview');
  const [lensBusy, setLensBusy] = useState(false);
  const [lensAnswer, setLensAnswer] = useState('');

  useEffect(() => {
    setSearchQuery(`${datasetName || 'Industry'} market benchmarks and performance trends`);
    setSearchResult(null);
    setLensAnswer('');
    void runPythonBackendAnalysis();
  }, [datasetName, rows.length]);

  useEffect(() => {
    let alive = true;
    fetch('/api/python/health')
      .then((r) => r.json())
      .then((data) => {
        if (alive && data?.status === 'ok') {
          setPythonStatus(`${data.service || 'Python Scientific Backend'} · Online`);
        }
      })
      .catch(() => {
        if (alive) setPythonStatus('Python Scientific Engine · Ready');
      });
    return () => { alive = false; };
  }, []);

  async function runPythonBackendAnalysis() {
    if (!Array.isArray(rows) || !rows.length) return;
    setPythonBusy(true);
    try {
      const response = await fetch('/api/python/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetName,
          fields,
          rows: rows.slice(0, 500)
        })
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.status === 'ok') {
        setPythonReport(data);
        if (data.engine) setPythonStatus(`${data.engine} · Connected`);
      }
    } catch {} finally {
      setPythonBusy(false);
    }
  }

  async function handleSearchGrounding(e) {
    e?.preventDefault?.();
    const q = searchQuery.trim() || `${datasetName} benchmarks`;
    setSearchBusy(true);
    try {
      const response = await fetch('/api/ai/search-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          datasetName,
          snapshot: analytics
        })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.answer) {
        setSearchResult(data);
      }
    } catch {} finally {
      setSearchBusy(false);
    }
  }

  async function handleRunLensAnalysis(e) {
    e?.preventDefault?.();
    setLensBusy(true);
    try {
      const response = await fetch('/api/ai/analyze-dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisMode,
          datasetName,
          snapshot: analytics
        })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.answer) {
        setLensAnswer(data.answer);
      }
    } catch {} finally {
      setLensBusy(false);
    }
  }

  return (
    <article className="v2-card ai-provider-hub" aria-labelledby="ai-provider-title">
      <div className="v2-card-title">
        <span className="ai-provider-icon"><Globe size={18} /></span>
        <div className="ai-provider-title-copy">
          <span className="v2-overline">SEARCH GROUNDING &amp; PYTHON SCIENTIFIC BACKEND</span>
          <h3 id="ai-provider-title">Google Search Grounding &amp; Python Statistical Engine</h3>
        </div>
        <span className="ai-provider-count">CONNECTED</span>
      </div>
      <p className="v2-muted">
        Enrich <strong>{datasetName || 'your active dataset'}</strong> with live Google Search grounding (<code>gemini-3.8-flash</code> with <code>googleSearch</code>) and automated Python scientific modeling (OLS Regression, Tukey IQR Outliers, and Monte Carlo P10/P50/P90 forecasts).
      </p>

      {/* 1. Google Search Grounding Panel */}
      <form className="ai-provider-form" onSubmit={handleSearchGrounding} style={{ marginBottom: 18 }}>
        <div className="ai-provider-current">
          <div>
            <span className="v2-overline">GOOGLE SEARCH GROUNDING (GEMINI-3.8-FLASH)</span>
            <h4>Live Web &amp; Industry Benchmark Search</h4>
            <p>Retrieve up-to-date web facts, market benchmarks, and external context aligned with {datasetName || 'your dataset'}.</p>
          </div>
        </div>
        <label className="v2-field">
          <span>Search Grounding Query</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ask for live market trends, regional benchmarks, or domain facts…"
            aria-label="Google Search grounding query"
          />
        </label>
        <button type="submit" className="v2-button primary ai-provider-run" disabled={searchBusy}>
          {searchBusy ? (
            <><RefreshCw size={15} className="v2-spin" /> Searching with Google Search Grounding…</>
          ) : (
            <><Search size={15} /> Run Google Search Grounded Analysis</>
          )}
        </button>
      </form>

      {searchResult && (
        <section className="ai-provider-answer" aria-live="polite" style={{ marginBottom: 18 }}>
          <div>
            <CheckCircle2 size={15} />
            <strong>Grounded Web Intelligence ({searchResult.model || 'gemini-3.8-flash'})</strong>
          </div>
          <pre>{searchResult.answer}</pre>
          {Array.isArray(searchResult.sources) && searchResult.sources.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <small style={{ display: 'block', fontWeight: 700, marginBottom: 6 }}>Grounded Web Sources:</small>
              <div className="ai-provider-links">
                {searchResult.sources.map((src, idx) => (
                  <a key={idx} href={src.uri} target="_blank" rel="noopener noreferrer">
                    {src.title || src.uri} <ArrowUpRight size={12} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 2. Connected Python Scientific Backend Panel */}
      <div className="ai-provider-current" style={{ marginBottom: 14 }}>
        <div>
          <span className="v2-overline">PYTHON SCIENTIFIC BACKEND SERVICE</span>
          <h4><Cpu size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />{pythonStatus}</h4>
          <p>Automated OLS Linear Regression, Tukey IQR + Z-Score Outlier Fencing, and Monte Carlo Confidence Intervals computed by the Python backend.</p>
        </div>
        <button
          type="button"
          className="v2-button secondary"
          onClick={() => void runPythonBackendAnalysis()}
          disabled={pythonBusy}
        >
          {pythonBusy ? <RefreshCw size={14} className="v2-spin" /> : <TrendingUp size={14} />}
          Recompute Python Model
        </button>
      </div>

      {pythonReport && (
        <div className="ai-provider-dataset-context" style={{ marginBottom: 18 }}>
          <strong>
            Python Statistical Profile · {pythonReport.datasetName} ({pythonReport.recordCount} rows · Primary Metric: {pythonReport.primaryMetric || 'Count'})
          </strong>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 10 }}>
            <div>
              <small>Quartiles &amp; IQR</small>
              <p style={{ margin: '2px 0', fontWeight: 700 }}>
                Q1: {Number(pythonReport.statistics?.q1 || 0).toLocaleString()} · Median: {Number(pythonReport.statistics?.median || 0).toLocaleString()} · Q3: {Number(pythonReport.statistics?.q3 || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <small>Monte Carlo Forecast (P10 / P50 / P90)</small>
              <p style={{ margin: '2px 0', fontWeight: 700 }}>
                P10: {Number(pythonReport.monteCarloForecast?.p10Conservative || 0).toLocaleString()} · P50: {Number(pythonReport.monteCarloForecast?.p50Expected || 0).toLocaleString()} · P90: {Number(pythonReport.monteCarloForecast?.p90Optimistic || 0).toLocaleString()}
              </p>
            </div>
            {pythonReport.regression && (
              <div>
                <small>OLS Regression ({pythonReport.regressionDriver})</small>
                <p style={{ margin: '2px 0', fontWeight: 700 }}>
                  {pythonReport.regression.trendDirection} (Slope: {pythonReport.regression.slope}, R² = {pythonReport.regression.rSquared})
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Multi-Lens Dataset Analyst */}
      <form className="ai-provider-form" onSubmit={handleRunLensAnalysis}>
        <label className="v2-field">
          <span>Analytical Lens</span>
          <select value={analysisMode} onChange={(e) => setAnalysisMode(e.target.value)}>
            <option value="overview">Executive Dataset Overview</option>
            <option value="trends">Segment Trends &amp; Comparisons</option>
            <option value="quality">Schema Quality &amp; Anomaly Audit</option>
            <option value="recommendations">Strategic Decision Recommendations</option>
          </select>
        </label>
        <button type="submit" className="v2-button secondary ai-provider-run" disabled={lensBusy}>
          {lensBusy ? (
            <><RefreshCw size={15} className="v2-spin" /> Generating Analytical Report…</>
          ) : (
            <><Sparkles size={15} /> Generate Multi-Lens Analysis</>
          )}
        </button>
      </form>

      {lensAnswer && (
        <section className="ai-provider-answer" aria-live="polite" style={{ marginTop: 12 }}>
          <div><CheckCircle2 size={15} /><strong>Analytical Lens Report</strong></div>
          <pre>{lensAnswer}</pre>
        </section>
      )}
    </article>
  );
}
