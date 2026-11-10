import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldCheck, CheckCircle2, RefreshCw, X, ExternalLink, Gauge, AlertOctagon } from 'lucide-react';
import './ReleaseCenter.css';
import { insi } from './insiController.js';

const CLIENT_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.2.0';

const FALLBACK = {
  websiteVersion: '2.2.0',
  apiVersion: '2.2.0',
  windowsPackageVersion: '2.2.0.0',
  androidApkVersion: '2.2.0',
  releaseChannel: 'production'
};

const DEFAULT_QUOTAS = [
  { id: 'gemini', name: 'Google Gemini API', used: 8, limit: 1500, unit: 'req/day' },
  { id: 'supabase', name: 'Supabase Cloud', used: 24, limit: 5000, unit: 'ops/day' },
  { id: 'mongodb', name: 'MongoDB Atlas', used: 42, limit: 5000, unit: 'ops/day' },
  { id: 'azure', name: 'Microsoft Azure', used: 15, limit: 1000, unit: 'ops/day' }
];

function compareVersions(left, right) {
  const parse = value => String(value || '').replace(/^v/, '').split(/[.+-]/).slice(0, 3).map(part => Number.parseInt(part, 10) || 0);
  const a = parse(left), b = parse(right);
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  }
  return 0;
}

export default function ReleaseCenter() {
  const [open, setOpen] = useState(false);
  const [release, setRelease] = useState(FALLBACK);
  const [runtime, setRuntime] = useState(null);
  const [security, setSecurity] = useState(null);
  const [quotas, setQuotas] = useState(DEFAULT_QUOTAS);
  const [simulateLimit, setSimulateLimit] = useState(false);
  const [checking, setChecking] = useState(false);

  const checkStatus = useCallback(async (simFlag = false) => {
    setChecking(true);
    try {
      const quotaUrl = simFlag ? '/api/quota/status?simulateLimit=true' : '/api/quota/status';
      const [releaseResponse, versionResponse, securityResponse, quotaResponse] = await Promise.all([
        fetch('/release-info.json', { cache: 'no-store' }).catch(() => null),
        fetch('/api/version', { cache: 'no-store' }).catch(() => null),
        fetch('/api/security/status', { cache: 'no-store' }).catch(() => null),
        fetch(quotaUrl, { cache: 'no-store' }).catch(() => null)
      ]);
      if (releaseResponse?.ok) {
        const releaseData = await releaseResponse.json();
        setRelease({ ...FALLBACK, ...releaseData });
      }
      if (versionResponse?.ok) {
        setRuntime(await versionResponse.json());
      }
      if (securityResponse?.ok) {
        setSecurity(await securityResponse.json());
      }
      if (quotaResponse?.ok) {
        const quotaData = await quotaResponse.json();
        if (Array.isArray(quotaData.services) && quotaData.services.length) {
          setQuotas(quotaData.services);
        }
      }
    } catch {
      // Keep fallback status silently
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { void checkStatus(simulateLimit); }, [checkStatus, simulateLimit]);

  const currentWebsiteVersion = CLIENT_VERSION;
  const updateAvailable = useMemo(
    () => currentWebsiteVersion !== 'unknown' && release.websiteVersion !== 'unknown'
      && compareVersions(release.websiteVersion, currentWebsiteVersion) > 0,
    [currentWebsiteVersion, release.websiteVersion]
  );

  const computedQuotas = quotas.map((q) => {
    const used = simulateLimit ? q.limit : q.used;
    const limitReached = used >= q.limit || Boolean(q.limitReached);
    return {
      ...q,
      used,
      limitReached,
      status: limitReached ? 'Limit Reached' : 'Within Free Tier'
    };
  });

  const anyLimitReached = computedQuotas.some((q) => q.limitReached);

  return (
    <div className="release-center">
      <button
        type="button"
        className="release-center-trigger"
        onClick={() => {
          setOpen(value => !value);
          void checkStatus(simulateLimit);
          insi.observe();
        }}
        aria-expanded={open}
      >
        <ShieldCheck size={14} />
        <span>System, Quotas &amp; Security · v{currentWebsiteVersion}</span>
        <span className={anyLimitReached || updateAvailable ? 'release-dot update' : 'release-dot'} />
      </button>
      {open && <section className="release-panel" aria-label="InsightBoard VDB system and quota status">
        <header className="release-panel-head">
          <div><strong>System Status &amp; Usage Quotas</strong><small>Connected service consumption &amp; zero-billing guardrails</small></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close system panel"><X size={16}/></button>
        </header>

        <div className="release-version-grid">
          <div><span>Web Application</span><strong>v{currentWebsiteVersion}</strong><small>PWA offline-ready</small></div>
          <div><span>API &amp; Security</span><strong>v{runtime?.apiVersion || runtime?.version || release.apiVersion}</strong><small>{security?.status === 'hardened' ? 'Hardened shield active' : 'Protected runtime'}</small></div>
          <div><span>Desktop &amp; Mobile</span><strong>{release.windowsPackageVersion} · APK v{release.androidApkVersion || release.websiteVersion}</strong><small>Platform-independent</small></div>
        </div>

        {/* Connected Services Usage & Quotas Monitor inside Status Panel */}
        <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(15, 23, 42, 0.04)', border: '1px solid var(--line, #e2e8f0)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
              <Gauge size={14} /> Usage &amp; Quotas ({anyLimitReached ? 'Limit Reached' : 'Within Free Tier'})
            </strong>
            <button
              type="button"
              onClick={() => setSimulateLimit(v => !v)}
              style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--line, #cbd5e1)', cursor: 'pointer', background: 'var(--surface, #fff)' }}
            >
              {simulateLimit ? 'Reset Quota' : 'Simulate Limit Reached'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
            {computedQuotas.map((svc) => (
              <div
                key={svc.id}
                style={{
                  padding: '6px 8px',
                  borderRadius: 8,
                  border: svc.limitReached ? '1px solid #ef4444' : '1px solid rgba(148, 163, 184, 0.35)',
                  background: svc.limitReached ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                  fontSize: 11
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>{svc.name}</span>
                  <span style={{ color: svc.limitReached ? '#dc2626' : '#0d9488' }}>
                    {svc.limitReached ? 'Limit Reached' : 'OK'}
                  </span>
                </div>
                <small style={{ opacity: 0.8 }}>
                  {svc.used.toLocaleString()} / {svc.limit.toLocaleString()} {svc.unit} ($0.00)
                </small>
              </div>
            ))}
          </div>
        </div>

        {anyLimitReached && (
          <div className="release-update-callout" style={{ marginTop: 8 }}>
            <strong><AlertOctagon size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Limit Reached — Zero-Billing Cutoff Active</strong>
            <span>Free-tier threshold reached. External calls are paused at $0.00 cost.</span>
          </div>
        )}

        {updateAvailable && <div className="release-update-callout">
          <strong>A newer application build is available.</strong>
          <span>Reload to switch to the latest version.</span>
          <button type="button" onClick={() => window.location.reload()}>Reload InsightBoard VDB</button>
        </div>}

        <div className="release-policy">
          <div><CheckCircle2 size={15}/><span>SHA-256 dataset integrity verification, CSV formula injection neutralization, and strict CSP/HSTS headers enabled.</span></div>
        </div>
        <footer className="release-panel-foot">
          <small>InsightBoard VDB v{currentWebsiteVersion}</small>
          <button type="button" onClick={() => void checkStatus(simulateLimit)} disabled={checking}><RefreshCw size={14} className={checking ? 'spinning' : ''}/>{checking ? 'Verifying…' : 'Verify'}</button>
          <a href="https://apps.microsoft.com/detail/9N20PQ3BJRSG" target="_blank" rel="noreferrer">Microsoft Store <ExternalLink size={12}/></a>
        </footer>
      </section>}
    </div>
  );
}
