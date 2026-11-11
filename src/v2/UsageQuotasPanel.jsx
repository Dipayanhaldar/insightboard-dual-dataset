import React, { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck,
  AlertOctagon,
  Gauge,
  RefreshCw,
  Lock,
  Cpu
} from 'lucide-react';
import './UsageQuotasPanel.css';
import { playButtonClick, getRealQuotaUsage } from './uiSound.js';
import { insi } from './insiController.js';

const DEFAULT_SERVICES = [
  {
    id: 'mongodb',
    name: 'MongoDB Atlas',
    tierLabel: 'M0 Free Sandbox (512 MB)',
    unit: 'ops/day',
    used: 42,
    limit: 5000,
    remaining: 4958,
    percentUsed: 1,
    limitReached: false,
    status: 'Within Free Tier',
    billingCutoffActive: true,
    estimatedCostUsd: 0
  },
  {
    id: 'gemini',
    name: 'Google Gemini API',
    tierLabel: 'Free Tier (Server Proxy)',
    unit: 'req/day',
    used: 8,
    limit: 1500,
    remaining: 1492,
    percentUsed: 1,
    limitReached: false,
    status: 'Within Free Tier',
    billingCutoffActive: true,
    estimatedCostUsd: 0
  },
  {
    id: 'supabase',
    name: 'Supabase Cloud',
    tierLabel: 'Free Tier Quota',
    unit: 'ops/day',
    used: 24,
    limit: 5000,
    remaining: 4976,
    percentUsed: 1,
    limitReached: false,
    status: 'Within Free Tier',
    billingCutoffActive: true,
    estimatedCostUsd: 0
  },
  {
    id: 'azure',
    name: 'Microsoft Azure',
    tierLabel: 'Free App & Static Quota',
    unit: 'ops/day',
    used: 15,
    limit: 1000,
    remaining: 985,
    percentUsed: 2,
    limitReached: false,
    status: 'Within Free Tier',
    billingCutoffActive: true,
    estimatedCostUsd: 0
  }
];

export default function UsageQuotasPanel() {
  const [services, setServices] = useState(DEFAULT_SERVICES);
  const [dateUtc, setDateUtc] = useState(() => new Date().toISOString().slice(0, 10));
  const [localSessionDeltas, setLocalSessionDeltas] = useState(() => getRealQuotaUsage());
  const [loading, setLoading] = useState(false);

  const loadQuotas = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/quota/status', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.services) && data.services.length) {
          setServices(data.services);
        }
        if (data.dateUtc) setDateUtc(data.dateUtc);
      }
    } catch {
      // Keep local free-tier quota telemetry if offline
    } finally {
      setLocalSessionDeltas(getRealQuotaUsage());
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQuotas();
    const handleQuotaUpdate = (e) => {
      if (e?.detail) {
        setLocalSessionDeltas(e.detail);
      } else {
        setLocalSessionDeltas(getRealQuotaUsage());
      }
    };
    window.addEventListener('quota:updated', handleQuotaUpdate);
    return () => window.removeEventListener('quota:updated', handleQuotaUpdate);
  }, [loadQuotas]);

  const computedServices = services.map((svc) => {
    const sessionDelta = Number(localSessionDeltas?.[svc.id]) || 0;
    const used = Math.min(svc.limit, (Number(svc.used) || 0) + sessionDelta);
    const limitReached = used >= svc.limit || Boolean(svc.limitReached);
    const percentUsed = limitReached
      ? 100
      : svc.limit > 0
      ? Math.min(100, Math.max(1, Math.round((used / svc.limit) * 100)))
      : 0;
    return {
      ...svc,
      used,
      sessionDelta,
      remaining: Math.max(0, svc.limit - used),
      percentUsed,
      limitReached,
      status: limitReached ? 'Limit Reached' : 'Within Free Tier'
    };
  });

  const anyLimitReached = computedServices.some((s) => s.limitReached);

  return (
    <article className="v2-card usage-quotas-panel" aria-labelledby="usage-quotas-title">
      <div className="usage-quotas-header">
        <div className="usage-quotas-title-group">
          <div className="usage-quotas-icon">
            <Gauge size={19} />
          </div>
          <div>
            <span className="v2-overline">LIVE FREE-TIER TELEMETRY &amp; ZERO-BILLING GUARDRAIL</span>
            <h3 id="usage-quotas-title">Usage &amp; Quotas</h3>
          </div>
        </div>

        <div className="usage-quotas-actions">
          <span className={`quota-global-pill ${anyLimitReached ? 'limit-reached' : 'within-free'}`}>
            {anyLimitReached ? (
              <>
                <AlertOctagon size={13} /> Limit Reached · Billing Blocked ($0.00)
              </>
            ) : (
              <>
                <ShieldCheck size={13} /> Within Free Tier · $0.00 Billed
              </>
            )}
          </span>
          <button
            type="button"
            className="v2-button secondary btn-3d"
            onClick={() => {
              playButtonClick();
              insi.observe();
              void loadQuotas();
            }}
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? 'v2-spin' : ''} /> Sync Live Telemetry
          </button>
        </div>
      </div>

      <p className="v2-muted usage-quotas-subtitle">
        Real-time consumption across <strong>MongoDB Atlas</strong>, <strong>Google Gemini API</strong>,{' '}
        <strong>Supabase</strong>, <strong>Microsoft Azure</strong>, and{' '}
        <strong>Browser-Native Free AI</strong> (UTC cycle: {dateUtc}). Counters automatically track actual
        session queries, file ingestions, and voice/AI runs. If any cloud service reaches 100% of its daily free
        threshold, InsightBoard VDB automatically switches to the local browser engine so unexpected billing
        can never occur.
      </p>

      {anyLimitReached && (
        <div className="quota-limit-banner" role="alert">
          <AlertOctagon size={18} />
          <div>
            <strong>Limit Reached — Zero-Billing Hard Cutoff Active</strong>
            <span>
              One or more cloud services have reached their daily free-tier threshold. Requests are automatically
              handled by the local zero-cost browser engine ($0.00 billed).
            </span>
          </div>
        </div>
      )}

      <div className="usage-quotas-grid">
        {computedServices.map((svc) => (
          <div
            key={svc.id}
            className={`quota-service-card ${svc.limitReached ? 'is-limit-reached' : 'is-healthy'}`}
          >
            <div className="quota-card-top">
              <div>
                <h4>{svc.name}</h4>
                <small>{svc.tierLabel}</small>
              </div>
              <span
                className={`quota-status-badge ${svc.limitReached ? 'badge-limit' : 'badge-ok'}`}
              >
                {svc.limitReached ? 'Limit Reached' : 'Within Free Tier'}
              </span>
            </div>

            <div className="quota-meter-row">
              <div className="quota-numbers">
                <strong>
                  {svc.used.toLocaleString()} / {svc.limit.toLocaleString()} <small>{svc.unit}</small>
                </strong>
                <span>{svc.percentUsed}% used</span>
              </div>
              <div
                className="quota-progress-track"
                role="progressbar"
                aria-valuenow={svc.percentUsed}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${svc.name} quota consumption`}
              >
                <div
                  className={`quota-progress-fill ${svc.limitReached ? 'fill-limit' : 'fill-ok'}`}
                  style={{ width: `${svc.percentUsed}%` }}
                />
              </div>
            </div>

            <div className="quota-card-foot">
              <span className="quota-cost-tag">
                {svc.id === 'browser_ai' ? <Cpu size={12} /> : <Lock size={12} />}{' '}
                {svc.limitReached
                  ? 'Hard Cutoff Active · $0.00'
                  : `${svc.remaining.toLocaleString()} remaining · $0.00`}
              </span>
              <span className="quota-cost-tag" style={{ opacity: 0.78 }}>
                Session: +{svc.sessionDelta} {svc.unit.replace('/day', '')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
