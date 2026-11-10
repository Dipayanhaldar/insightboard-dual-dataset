import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  TrendingUp,
  Users,
  ShoppingBag,
  Sparkles,
  RefreshCw,
  Layers,
  Award,
  AlertCircle,
  CheckCircle2,
  Database,
  Activity,
  Search,
  Download,
  GitBranch,
  BarChart2
} from 'lucide-react';
import { computeRetailIntelligence } from './retailIntelligence.js';
import './RetailCommandCenter.css';

const nice = (key) =>
  String(key || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const formatInr = (value) => {
  const num = Number(value) || 0;
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

const formatMetric = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value ?? '—');
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

function downloadInstantCsv(records, fields, filename) {
  const csvCell = (v) => '"' + String(v ?? '').replaceAll('"', '""') + '"';
  const cols = fields.length ? fields : Object.keys(records[0] || {});
  const text = [
    cols.map(csvCell).join(','),
    ...records.map((r) => cols.map((k) => csvCell(r?.[k])).join(','))
  ].join('\r\n');
  const blob = new Blob(['\ufeff' + text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function RetailCommandCenter({
  rows = [],
  fields = [],
  datasetName = '',
  preset = 'custom'
}) {
  const [footfallLiftPct, setFootfallLiftPct] = useState(10);
  const [conversionLiftPct, setConversionLiftPct] = useState(5);
  const [promoDiscountPct, setPromoDiscountPct] = useState(0);
  const [rentAdjustmentPct, setRentAdjustmentPct] = useState(0);
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [nlqMode, setNlqMode] = useState('top5');
  const [nlqSearch, setNlqSearch] = useState('');
  const [aiOptBusy, setAiOptBusy] = useState(false);
  const [aiOptResult, setAiOptResult] = useState('');
  const [aiOptSource, setAiOptSource] = useState('');

  // Reset segment filter & AI brief whenever the active dataset changes
  useEffect(() => {
    setZoneFilter('ALL');
    setAiOptResult('');
    setNlqSearch('');
  }, [datasetName, preset]);

  const intel = useMemo(
    () =>
      computeRetailIntelligence(rows, fields, {
        footfallLiftPct,
        conversionLiftPct,
        promoDiscountPct,
        rentAdjustmentPct
      }),
    [rows, fields, footfallLiftPct, conversionLiftPct, promoDiscountPct, rentAdjustmentPct]
  );

  const u = intel.universal;
  // Strictly show Mall/Retail labels ONLY when the active preset is 'mall' (or an explicitly retail-rich schema)
  const isMallMode = preset === 'mall' && intel.isRetailSchema;

  const visibleTenants = useMemo(() => {
    if (zoneFilter === 'ALL') return intel.tenantRows;
    return intel.tenantRows.filter((item) => item.zone === zoneFilter);
  }, [intel.tenantRows, zoneFilter]);

  const visibleUniversalRows = useMemo(() => {
    if (zoneFilter === 'ALL') return rows;
    return rows.filter(
      (r) => String(r?.[u.primaryCategory] ?? 'Uncategorized').trim() === zoneFilter
    );
  }, [rows, zoneFilter, u.primaryCategory]);

  // Instant Client-Side Natural Language / Smart Query Engine (100% Free & Data-Dependent)
  const nlqResults = useMemo(() => {
    const metric = u.primaryMetric;
    const mean = u.stats.primaryMean;
    const std = u.stats.primaryStdDev;
    const q = nlqSearch.trim().toLowerCase();

    let base = [...rows];
    if (q) {
      // Support numeric operator queries like "> 5000" or "< 100"
      const numMatch = q.match(/^([><]=?|=)\s*(-?\d+(?:\.\d+)?)$/);
      if (numMatch && metric) {
        const op = numMatch[1];
        const target = Number(numMatch[2]);
        base = base.filter((r) => {
          const val = Number(r?.[metric]);
          if (!Number.isFinite(val)) return false;
          if (op === '>') return val > target;
          if (op === '>=') return val >= target;
          if (op === '<') return val < target;
          if (op === '<=') return val <= target;
          return val === target;
        });
      } else {
        base = base.filter((r) =>
          u.cleanFields.some((k) =>
            String(r?.[k] ?? '')
              .toLowerCase()
              .includes(q)
          )
        );
      }
    }

    if (nlqMode === 'top5' && metric) {
      return [...base]
        .sort((a, b) => (Number(b?.[metric]) || 0) - (Number(a?.[metric]) || 0))
        .slice(0, 5);
    }
    if (nlqMode === 'bottom5' && metric) {
      return [...base]
        .sort((a, b) => (Number(a?.[metric]) || 0) - (Number(b?.[metric]) || 0))
        .slice(0, 5);
    }
    if (nlqMode === 'aboveAvg' && metric) {
      return base
        .filter((r) => (Number(r?.[metric]) || 0) > mean)
        .sort((a, b) => (Number(b?.[metric]) || 0) - (Number(a?.[metric]) || 0))
        .slice(0, 8);
    }
    if (nlqMode === 'outliers' && metric && std > 0) {
      return base
        .filter((r) => {
          const val = Number(r?.[metric]);
          return Number.isFinite(val) && Math.abs((val - mean) / std) >= 1.4;
        })
        .slice(0, 8);
    }
    return base.slice(0, 8);
  }, [rows, u, nlqMode, nlqSearch]);

  async function runAiOptimization() {
    setAiOptBusy(true);
    try {
      const response = await fetch('/api/ai/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetName,
          isMallMode,
          summary: isMallMode ? intel.summary : u.stats,
          simulation: isMallMode ? intel.simulation : u.simulation,
          topZones: isMallMode
            ? intel.zoneBreakdown.slice(0, 5)
            : u.segmentBreakdown.slice(0, 5),
          recommendations: intel.recommendations
        })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.plan && isMallMode) {
        setAiOptResult(data.plan);
        setAiOptSource(data.source || 'gemini');
      } else {
        throw new Error('Use data-dependent analytical brief');
      }
    } catch {
      setAiOptSource('local-engine');
      if (isMallMode) {
        const s = intel.summary;
        const sim = intel.simulation;
        setAiOptResult(
          [
            `1. EXECUTIVE REVENUE & YIELD STRATEGY (${datasetName || 'Active Dataset'}):`,
            `   • Current Portfolio Gross Revenue: ${formatInr(s.totalRevenue)} across ${s.unitCount} active units (${s.targetAttainmentPct}% target attainment).`,
            `   • Space Productivity: ₹${s.revenuePerSqft.toLocaleString('en-IN')}/sq.ft across ${s.totalArea.toLocaleString('en-IN')} sq.ft leased area.`,
            ``,
            `2. WHAT-IF SCENARIO PROJECTION (+${footfallLiftPct}% Footfall, +${conversionLiftPct}% Conversion, ${promoDiscountPct}% Promo):`,
            `   • Projected Gross Revenue: ${formatInr(sim.simulatedRevenue)} (${sim.revenueDelta >= 0 ? '+' : ''}${formatInr(sim.revenueDelta)} / ${sim.revenueDeltaPct >= 0 ? '+' : ''}${sim.revenueDeltaPct}%).`,
            `   • Projected Visitor Traffic: ${sim.simulatedFootfall.toLocaleString('en-IN')} visitors at ${sim.simulatedConversionPct}% conversion rate.`,
            ``,
            `3. IMMEDIATE MANAGERIAL ACTIONS:`,
            ...intel.recommendations.map(
              (rec, i) => `   ${i + 1}) [${rec.type}] ${rec.title} — ${rec.detail}`
            )
          ].join('\n')
        );
      } else {
        const pLabel = nice(u.primaryMetric || 'Records');
        const cLabel = nice(u.primaryCategory || 'Category');
        setAiOptResult(
          [
            `1. DATA-DEPENDENT EXECUTIVE BRIEF (${datasetName || 'Uploaded Dataset'}):`,
            `   • Active Scope: ${u.stats.recordCount.toLocaleString()} records across ${u.stats.fieldCount} schema fields (${u.stats.completenessPct}% data completeness).`,
            u.primaryMetric
              ? `   • Primary Metric (${pLabel}): Sum = ${formatMetric(u.stats.primarySum)} | Mean = ${formatMetric(u.stats.primaryMean)} | Median = ${formatMetric(u.stats.primaryMedian)} | StdDev (σ) = ${formatMetric(u.stats.primaryStdDev)}.`
              : `   • Categorical Structure: ${u.stats.distinctCategories} distinct values in ${cLabel}.`,
            u.stats.top20SharePct > 0
              ? `   • Pareto 80/20 Concentration: Top 20% of records drive ${u.stats.top20SharePct}% of total ${pLabel}.`
              : null,
            ``,
            `2. WHAT-IF SENSITIVITY PROJECTION (+${footfallLiftPct}% Volume/Growth, +${conversionLiftPct}% Efficiency):`,
            `   • Projected ${pLabel} Total: ${formatMetric(u.simulation.projectedPrimaryTotal)} (${u.simulation.projectedPrimaryDelta >= 0 ? '+' : ''}${formatMetric(u.simulation.projectedPrimaryDelta)} / ${u.simulation.projectedPrimaryDeltaPct >= 0 ? '+' : ''}${u.simulation.projectedPrimaryDeltaPct}%).`,
            `   • Projected Per-Record Mean: ${formatMetric(u.simulation.projectedPrimaryMean)}.`,
            ``,
            `3. AUTOMATED STATISTICAL & OPERATIONAL FINDINGS:`,
            ...u.dataRecommendations.map(
              (rec, i) => `   ${i + 1}) [${rec.type}] ${rec.title} — ${rec.detail}`
            )
          ]
            .filter(Boolean)
            .join('\n')
        );
      }
    } finally {
      setAiOptBusy(false);
    }
  }

  const displayColumns = useMemo(() => u.cleanFields.slice(0, 7), [u.cleanFields]);

  return (
    <section
      id="retail-command-center"
      className="retail-command-center"
      aria-labelledby="retail-cc-title"
    >
      <div className="rcc-header">
        <div>
          <div className="rcc-eyebrow">
            {isMallMode ? (
              <>
                <Building2 size={14} /> SHOPPING MALL &amp; SALES INTELLIGENCE SUITE
              </>
            ) : preset === 'metro' ? (
              <>
                <Activity size={14} /> HYDERABAD METRO RAIL · TRANSIT &amp; CORRIDOR INTELLIGENCE
              </>
            ) : (
              <>
                <Database size={14} /> DATA-DEPENDENT SCHEMA INTELLIGENCE · USER UPLOADED DATASET
              </>
            )}
          </div>
          <h2 id="retail-cc-title">
            {isMallMode
              ? 'Commercial Retail & Tenant Optimization Hub'
              : `${datasetName || 'Active Dataset'} — Dynamic Decision & Statistical Hub`}
          </h2>
          <p>
            {isMallMode
              ? 'Purpose-built for shopping mall managers, retail operations, and regional sales directors. Benchmark store yield per sq.ft, conversion funnels, lease coverage, and run real-time What-If revenue simulations.'
              : `100% data-dependent analysis generated strictly from "${datasetName || 'current dataset'}" (${u.stats.recordCount.toLocaleString()} records, ${u.stats.fieldCount} columns). Includes dynamic What-If forecasting, Z-Score outlier detection, Pearson correlation, and instant query filtering.`}
          </p>
        </div>
        <div className="rcc-header-actions">
          <button
            type="button"
            className="rcc-btn rcc-btn-accent"
            onClick={() => void runAiOptimization()}
            disabled={aiOptBusy}
          >
            {aiOptBusy ? (
              <RefreshCw size={15} className="v2-spin" />
            ) : (
              <Sparkles size={15} />
            )}
            <span>
              {aiOptBusy
                ? 'Analyzing Active Dataset…'
                : isMallMode
                ? 'AI Sales & Lease Optimization'
                : 'Generate Data Optimization Brief'}
            </span>
          </button>
        </div>
      </div>

      {/* 100% Data-Dependent KPI Strip */}
      {isMallMode ? (
        <div className="rcc-kpi-strip">
          <div className="rcc-kpi-box">
            <div className="rcc-kpi-top">
              <span>Gross Portfolio Revenue</span>
              <TrendingUp size={15} />
            </div>
            <strong className="rcc-tabular">
              {formatInr(intel.summary.totalRevenue)}
            </strong>
            <small>
              {intel.summary.targetAttainmentPct}% of{' '}
              {formatInr(intel.summary.totalTarget)} target
            </small>
          </div>

          <div className="rcc-kpi-box">
            <div className="rcc-kpi-top">
              <span>Total Visitor Footfall</span>
              <Users size={15} />
            </div>
            <strong className="rcc-tabular">
              {intel.summary.totalFootfall.toLocaleString('en-IN')}
            </strong>
            <small>
              {intel.summary.totalTransactions.toLocaleString('en-IN')} completed
              checkouts
            </small>
          </div>

          <div className="rcc-kpi-box">
            <div className="rcc-kpi-top">
              <span>Conversion &amp; Avg Basket</span>
              <ShoppingBag size={15} />
            </div>
            <strong className="rcc-tabular">
              {intel.summary.avgConversionPct}% · ₹
              {intel.summary.avgBasketInr.toLocaleString('en-IN')}
            </strong>
            <small>Store visitor-to-buyer conversion &amp; ticket size</small>
          </div>

          <div className="rcc-kpi-box">
            <div className="rcc-kpi-top">
              <span>Space Yield &amp; Lease Coverage</span>
              <Layers size={15} />
            </div>
            <strong className="rcc-tabular">
              ₹{intel.summary.revenuePerSqft.toLocaleString('en-IN')}/sq.ft
            </strong>
            <small>
              {intel.summary.rentCoverageRatio}× gross revenue-to-rent coverage
            </small>
          </div>
        </div>
      ) : (
        <div className="rcc-kpi-strip">
          <div className="rcc-kpi-box">
            <div className="rcc-kpi-top">
              <span>
                {u.primaryMetric
                  ? `Total ${nice(u.primaryMetric)}`
                  : 'Active Dataset Records'}
              </span>
              <TrendingUp size={15} />
            </div>
            <strong className="rcc-tabular">
              {u.primaryMetric
                ? formatMetric(u.stats.primarySum)
                : u.stats.recordCount.toLocaleString()}
            </strong>
            <small>
              {u.primaryMetric
                ? `Mean: ${formatMetric(u.stats.primaryMean)} · Median: ${formatMetric(
                    u.stats.primaryMedian
                  )}`
                : `${u.stats.fieldCount} detected columns in schema`}
            </small>
          </div>

          <div className="rcc-kpi-box">
            <div className="rcc-kpi-top">
              <span>Leading {nice(u.primaryCategory)}</span>
              <Award size={15} />
            </div>
            <strong className="rcc-tabular">
              {u.segmentBreakdown[0]?.segment || '—'}
            </strong>
            <small>
              {u.segmentBreakdown[0]
                ? `${u.segmentBreakdown[0].sharePct}% share (${u.segmentBreakdown[0].count} of ${u.stats.recordCount} records)`
                : 'No segment grouping detected'}
            </small>
          </div>

          <div className="rcc-kpi-box">
            <div className="rcc-kpi-top">
              <span>
                {u.primaryMetric
                  ? 'Pareto 80/20 & Dispersion'
                  : `Distinct ${nice(u.primaryCategory)}`}
              </span>
              <BarChart2 size={15} />
            </div>
            <strong className="rcc-tabular">
              {u.primaryMetric
                ? `${u.stats.top20SharePct}% Top-20% Share`
                : `${u.stats.distinctCategories} Segments`}
            </strong>
            <small>
              {u.primaryMetric
                ? `Range: ${formatMetric(u.stats.primaryMin)}–${formatMetric(
                    u.stats.primaryMax
                  )} (σ = ${formatMetric(u.stats.primaryStdDev)})`
                : `Across ${u.categoricalFields.length} categorical dimensions`}
            </small>
          </div>

          <div className="rcc-kpi-box">
            <div className="rcc-kpi-top">
              <span>Schema Completeness &amp; Outliers</span>
              <Layers size={15} />
            </div>
            <strong className="rcc-tabular">
              {u.stats.completenessPct}% Complete
            </strong>
            <small>
              {u.anomalies.length > 0
                ? `${u.anomalies.length} statistical Z-score outlier(s) flagged`
                : '0 extreme statistical outliers detected'}
            </small>
          </div>
        </div>
      )}

      {/* Interactive What-If Scenario Simulator + Automated Signals */}
      <div className="rcc-split-grid">
        <div className="rcc-panel rcc-simulator">
          <div className="rcc-panel-head">
            <div>
              <span className="rcc-tag">INTERACTIVE FORECASTING</span>
              <h3>
                {isMallMode
                  ? 'What-If Mall & Sales Scenario Simulator'
                  : `What-If Sensitivity Simulator (${nice(
                      u.primaryMetric || 'Record Volume'
                    )})`}
              </h3>
            </div>
            <button
              type="button"
              className="rcc-reset-link"
              onClick={() => {
                setFootfallLiftPct(0);
                setConversionLiftPct(0);
                setPromoDiscountPct(0);
                setRentAdjustmentPct(0);
              }}
            >
              Reset sliders
            </button>
          </div>
          <p className="rcc-subtext">
            {isMallMode
              ? 'Simulate seasonal footfall campaigns, sales staff conversion training, promotional discounts, and lease renewals in real time.'
              : `Test real-time sensitivity scenarios on "${datasetName}" by adjusting growth, efficiency, and variance parameters for ${nice(
                  u.primaryMetric || 'active records'
                )}.`}
          </p>

          <div className="rcc-sliders">
            <label className="rcc-slider-row">
              <div className="rcc-slider-label">
                <span>
                  {isMallMode
                    ? 'Footfall Campaign Lift'
                    : `${nice(u.primaryMetric || 'Primary Volume')} Growth Lift`}
                </span>
                <strong className="rcc-tabular">
                  {footfallLiftPct >= 0 ? `+${footfallLiftPct}%` : `${footfallLiftPct}%`}
                </strong>
              </div>
              <input
                type="range"
                min="-25"
                max="50"
                step="1"
                value={footfallLiftPct}
                onChange={(e) => setFootfallLiftPct(Number(e.target.value))}
                aria-label="Primary growth lift percentage"
              />
            </label>

            <label className="rcc-slider-row">
              <div className="rcc-slider-label">
                <span>
                  {isMallMode
                    ? 'Checkout Conversion Improvement'
                    : `${nice(u.secondaryMetric || u.primaryCategory || 'Operational')} Efficiency Lift`}
                </span>
                <strong className="rcc-tabular">
                  {conversionLiftPct >= 0
                    ? `+${conversionLiftPct}%`
                    : `${conversionLiftPct}%`}
                </strong>
              </div>
              <input
                type="range"
                min="-15"
                max="35"
                step="1"
                value={conversionLiftPct}
                onChange={(e) => setConversionLiftPct(Number(e.target.value))}
                aria-label="Efficiency lift percentage"
              />
            </label>

            <label className="rcc-slider-row">
              <div className="rcc-slider-label">
                <span>
                  {isMallMode
                    ? 'Promotional Markdown / Discount'
                    : 'Friction / Attrition Buffer'}
                </span>
                <strong className="rcc-tabular">{promoDiscountPct}%</strong>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={promoDiscountPct}
                onChange={(e) => setPromoDiscountPct(Number(e.target.value))}
                aria-label="Variance buffer percentage"
              />
            </label>

            <label className="rcc-slider-row">
              <div className="rcc-slider-label">
                <span>
                  {isMallMode
                    ? 'Base Lease / Rent Adjustment'
                    : `${nice(u.secondaryMetric || 'Secondary Capacity')} Adjustment`}
                </span>
                <strong className="rcc-tabular">
                  {rentAdjustmentPct >= 0
                    ? `+${rentAdjustmentPct}%`
                    : `${rentAdjustmentPct}%`}
                </strong>
              </div>
              <input
                type="range"
                min="-15"
                max="25"
                step="1"
                value={rentAdjustmentPct}
                onChange={(e) => setRentAdjustmentPct(Number(e.target.value))}
                aria-label="Secondary adjustment percentage"
              />
            </label>
          </div>

          {isMallMode ? (
            <div className="rcc-sim-results">
              <div>
                <span>Projected Portfolio Revenue</span>
                <strong className="rcc-tabular">
                  {formatInr(intel.simulation.simulatedRevenue)}
                </strong>
                <small
                  className={
                    intel.simulation.revenueDelta >= 0 ? 'rcc-pos' : 'rcc-neg'
                  }
                >
                  {intel.simulation.revenueDelta >= 0 ? '+' : ''}
                  {formatInr(intel.simulation.revenueDelta)} (
                  {intel.simulation.revenueDeltaPct >= 0 ? '+' : ''}
                  {intel.simulation.revenueDeltaPct}%)
                </small>
              </div>
              <div>
                <span>Projected Visitor Traffic</span>
                <strong className="rcc-tabular">
                  {intel.simulation.simulatedFootfall.toLocaleString('en-IN')}
                </strong>
                <small>
                  At {intel.simulation.simulatedConversionPct}% effective
                  conversion
                </small>
              </div>
              <div>
                <span>Projected Lease Pool</span>
                <strong className="rcc-tabular">
                  {formatInr(intel.simulation.simulatedRent)}
                </strong>
                <small>
                  Effective ticket ₹
                  {intel.simulation.effectiveBasket.toLocaleString('en-IN')}
                </small>
              </div>
            </div>
          ) : (
            <div className="rcc-sim-results">
              <div>
                <span>
                  Projected {nice(u.primaryMetric || 'Total Volume')}
                </span>
                <strong className="rcc-tabular">
                  {formatMetric(u.simulation.projectedPrimaryTotal)}
                </strong>
                <small
                  className={
                    u.simulation.projectedPrimaryDelta >= 0 ? 'rcc-pos' : 'rcc-neg'
                  }
                >
                  {u.simulation.projectedPrimaryDelta >= 0 ? '+' : ''}
                  {formatMetric(u.simulation.projectedPrimaryDelta)} (
                  {u.simulation.projectedPrimaryDeltaPct >= 0 ? '+' : ''}
                  {u.simulation.projectedPrimaryDeltaPct}%)
                </small>
              </div>
              <div>
                <span>Projected Mean per Record</span>
                <strong className="rcc-tabular">
                  {formatMetric(u.simulation.projectedPrimaryMean)}
                </strong>
                <small>
                  Baseline mean: {formatMetric(u.stats.primaryMean)}
                </small>
              </div>
              <div>
                <span>
                  Projected{' '}
                  {nice(u.secondaryMetric || u.primaryCategory || 'Segments')}
                </span>
                <strong className="rcc-tabular">
                  {formatMetric(u.simulation.projectedSecondaryTotal)}
                </strong>
                <small>
                  Across {u.stats.recordCount.toLocaleString()} active records
                </small>
              </div>
            </div>
          )}
        </div>

        <div className="rcc-panel rcc-insights">
          <div className="rcc-panel-head">
            <div>
              <span className="rcc-tag">DECISION INTELLIGENCE</span>
              <h3>
                {isMallMode
                  ? 'Automated Mall & Sales Action Signals'
                  : `Automated Statistical & Schema Signals (${nice(
                      u.primaryCategory
                    )})`}
              </h3>
            </div>
            <Award size={18} />
          </div>
          <p className="rcc-subtext">
            {isMallMode
              ? 'Real-time diagnostic rules flag anchor expansion candidates, conversion bottlenecks, and lease renewal risks.'
              : 'Computed directly from the active dataset using Z-Score anomaly math, Pareto concentration, and Pearson correlation.'}
          </p>

          <div className="rcc-rec-list">
            {(isMallMode ? intel.recommendations : u.dataRecommendations).map(
              (rec, index) => (
                <div className="rcc-rec-item" key={index}>
                  <div className="rcc-rec-type">{rec.type}</div>
                  <strong>{rec.title}</strong>
                  <p>{rec.detail}</p>
                </div>
              )
            )}
          </div>

          {aiOptResult && (
            <div className="rcc-ai-plan" aria-live="polite">
              <div className="rcc-ai-plan-head">
                <strong>
                  <Sparkles size={14} /> Executive Optimization Brief (
                  {aiOptSource === 'gemini'
                    ? 'Google Gemini Free Tier'
                    : 'Data-Dependent Analytical Engine'}
                  )
                </strong>
                <button
                  type="button"
                  onClick={() => setAiOptResult('')}
                  aria-label="Close optimization brief"
                >
                  ×
                </button>
              </div>
              <pre>{aiOptResult}</pre>
            </div>
          )}
        </div>
      </div>

      {/* Free Statistical Correlation, Z-Score Outlier & Instant Query Suite */}
      <div className="rcc-split-grid" style={{ marginTop: 18 }}>
        <div className="rcc-panel">
          <div className="rcc-panel-head">
            <div>
              <span className="rcc-tag">FREE DATA SCIENCE ENGINE</span>
              <h3>
                Pearson Correlation &amp; Z-Score Anomaly Detector
              </h3>
            </div>
            <GitBranch size={18} />
          </div>
          <p className="rcc-subtext">
            Automatically discovers linear relationships (r) between numeric
            columns and flags records with unusual Z-scores (|z| ≥ 1.5) in{' '}
            <strong>{datasetName}</strong>.
          </p>

          {u.correlations.length > 0 ? (
            <div className="rcc-stat-block">
              <div className="rcc-stat-label">
                Top Numeric Field Correlations (Pearson r)
              </div>
              <div className="rcc-corr-grid">
                {u.correlations.slice(0, 4).map((c) => (
                  <div className="rcc-corr-card" key={c.pairLabel}>
                    <span>{c.pairLabel}</span>
                    <strong
                      className={`rcc-tabular ${
                        Math.abs(c.r) >= 0.5 ? 'rcc-pos' : ''
                      }`}
                    >
                      r = {c.r >= 0 ? `+${c.r}` : c.r}
                    </strong>
                    <small>{c.strength}</small>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rcc-stat-block">
              <div className="rcc-stat-label">Segment Distribution Share</div>
              <div className="rcc-corr-grid">
                {u.segmentBreakdown.slice(0, 4).map((seg) => (
                  <div className="rcc-corr-card" key={seg.segment}>
                    <span>{seg.segment}</span>
                    <strong className="rcc-tabular">{seg.sharePct}%</strong>
                    <small>{seg.count} records</small>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rcc-stat-block" style={{ marginTop: 14 }}>
            <div className="rcc-stat-label">
              Statistical Outlier Scan ({nice(u.primaryMetric || u.labelField)})
            </div>
            {u.anomalies.length > 0 ? (
              <div className="rcc-rec-list">
                {u.anomalies.slice(0, 3).map((anom) => (
                  <div className="rcc-rec-item" key={anom.id}>
                    <div className="rcc-rec-type">
                      {anom.direction} · z = {anom.zScore} (
                      {anom.deviationPct >= 0 ? '+' : ''}
                      {anom.deviationPct}% vs mean)
                    </div>
                    <strong>
                      {anom.label} ({anom.category})
                    </strong>
                    <p>
                      {anom.metricName}:{' '}
                      <strong>{formatMetric(anom.value)}</strong> (Dataset Mean:{' '}
                      {formatMetric(u.stats.primaryMean)})
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rcc-subtext" style={{ margin: 0 }}>
                All records fall within normal statistical bounds (|z| &lt; 1.5)
                for this dataset.
              </p>
            )}
          </div>
        </div>

        <div className="rcc-panel">
          <div className="rcc-panel-head">
            <div>
              <span className="rcc-tag">INSTANT NATURAL-LANGUAGE QUERY</span>
              <h3>Smart Data Query &amp; Slice Explorer</h3>
            </div>
            <button
              type="button"
              className="rcc-reset-link"
              onClick={() =>
                downloadInstantCsv(
                  nlqResults,
                  u.cleanFields,
                  'insightboard-query-slice.csv'
                )
              }
              disabled={!nlqResults.length}
            >
              <Download size={13} style={{ verticalAlign: 'middle' }} /> Export
              Slice CSV
            </button>
          </div>
          <p className="rcc-subtext">
            Query <strong>{datasetName}</strong> instantly using one-click
            analytical lenses or numeric expressions (e.g.{' '}
            <code>&gt; {Math.round(u.stats.primaryMean || 100)}</code> or any
            keyword).
          </p>

          <div className="rcc-zone-pills" style={{ marginBottom: 12 }}>
            <button
              type="button"
              className={nlqMode === 'top5' ? 'active' : ''}
              onClick={() => setNlqMode('top5')}
            >
              Top 5 {u.primaryMetric ? `by ${nice(u.primaryMetric)}` : 'Records'}
            </button>
            {u.primaryMetric && (
              <>
                <button
                  type="button"
                  className={nlqMode === 'aboveAvg' ? 'active' : ''}
                  onClick={() => setNlqMode('aboveAvg')}
                >
                  Above Mean ({formatMetric(u.stats.primaryMean)})
                </button>
                <button
                  type="button"
                  className={nlqMode === 'bottom5' ? 'active' : ''}
                  onClick={() => setNlqMode('bottom5')}
                >
                  Bottom 5
                </button>
                <button
                  type="button"
                  className={nlqMode === 'outliers' ? 'active' : ''}
                  onClick={() => setNlqMode('outliers')}
                >
                  Outliers ({u.anomalies.length})
                </button>
              </>
            )}
          </div>

          <div className="rcc-nlq-input-wrap">
            <Search size={15} />
            <input
              type="text"
              value={nlqSearch}
              onChange={(e) => setNlqSearch(e.target.value)}
              placeholder={`Filter slice by keyword or expression (e.g. > ${Math.round(
                u.stats.primaryMean || 10
              )})…`}
              aria-label="Instant data query input"
            />
          </div>

          <div className="rcc-table-wrap" style={{ marginTop: 12 }}>
            <table className="rcc-table">
              <thead>
                <tr>
                  <th>{nice(u.labelField)}</th>
                  <th>{nice(u.primaryCategory)}</th>
                  {u.primaryMetric && (
                    <th className="num">{nice(u.primaryMetric)}</th>
                  )}
                  {u.secondaryMetric && (
                    <th className="num">{nice(u.secondaryMetric)}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {nlqResults.length ? (
                  nlqResults.map((row, idx) => (
                    <tr key={row?._insightboard_id ?? idx}>
                      <td className="rcc-unit-name">
                        {String(row?.[u.labelField] ?? `Row ${idx + 1}`)}
                      </td>
                      <td>{String(row?.[u.primaryCategory] ?? '—')}</td>
                      {u.primaryMetric && (
                        <td className="num rcc-tabular">
                          {formatMetric(row?.[u.primaryMetric])}
                        </td>
                      )}
                      {u.secondaryMetric && (
                        <td className="num rcc-tabular">
                          {formatMetric(row?.[u.secondaryMetric])}
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4}>No records match this query slice.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Data-Dependent Matrix: Retail Matrix when in Mall mode, Schema-Aware Matrix for any other dataset */}
      {isMallMode ? (
        intel.tenantRows.length > 0 && (
          <div className="rcc-matrix-panel">
            <div className="rcc-matrix-head">
              <div>
                <h3>Tenant &amp; Zone Space Productivity Matrix</h3>
                <p>
                  Compare revenue per sq.ft, target attainment, and
                  rent-to-sales health across zones.
                </p>
              </div>
              <div
                className="rcc-zone-pills"
                role="group"
                aria-label="Filter by zone"
              >
                <button
                  type="button"
                  className={zoneFilter === 'ALL' ? 'active' : ''}
                  onClick={() => setZoneFilter('ALL')}
                >
                  All Zones ({intel.tenantRows.length})
                </button>
                {intel.zoneBreakdown.slice(0, 5).map((z) => (
                  <button
                    type="button"
                    key={z.zone}
                    className={zoneFilter === z.zone ? 'active' : ''}
                    onClick={() => setZoneFilter(z.zone)}
                  >
                    {z.zone} ({z.stores})
                  </button>
                ))}
              </div>
            </div>

            <div className="rcc-table-wrap">
              <table className="rcc-table">
                <thead>
                  <tr>
                    <th>Store / Unit</th>
                    <th>Mall Zone</th>
                    <th>Category</th>
                    <th className="num">Revenue</th>
                    <th className="num">Target %</th>
                    <th className="num">Footfall</th>
                    <th className="num">Conv %</th>
                    <th className="num">₹ / Sq.Ft</th>
                    <th className="num">Rent / Rev</th>
                    <th>Operational Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTenants.slice(0, 12).map((unit) => (
                    <tr key={unit.id}>
                      <td className="rcc-unit-name">{unit.name}</td>
                      <td>{unit.zone}</td>
                      <td>{unit.category}</td>
                      <td className="num rcc-tabular">
                        {unit.revenue > 0 ? formatInr(unit.revenue) : '—'}
                      </td>
                      <td
                        className={`num rcc-tabular ${
                          unit.targetAttainmentPct >= 100 ? 'rcc-pos' : 'rcc-neg'
                        }`}
                      >
                        {unit.revenue > 0 ? `${unit.targetAttainmentPct}%` : '—'}
                      </td>
                      <td className="num rcc-tabular">
                        {unit.footfall > 0
                          ? unit.footfall.toLocaleString('en-IN')
                          : '—'}
                      </td>
                      <td className="num rcc-tabular">
                        {unit.conversion > 0 ? `${unit.conversion}%` : '—'}
                      </td>
                      <td className="num rcc-tabular">
                        {unit.revPerSqft > 0
                          ? `₹${unit.revPerSqft.toLocaleString('en-IN')}`
                          : '—'}
                      </td>
                      <td className="num rcc-tabular">
                        {unit.rentToRevenuePct > 0
                          ? `${unit.rentToRevenuePct}%`
                          : '—'}
                      </td>
                      <td>
                        <span
                          className={`rcc-signal rcc-signal-${unit.priority}`}
                        >
                          {unit.priority === 'high' ? (
                            <AlertCircle size={12} />
                          ) : (
                            <CheckCircle2 size={12} />
                          )}
                          {unit.actionBadge}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        rows.length > 0 && (
          <div className="rcc-matrix-panel">
            <div className="rcc-matrix-head">
              <div>
                <h3>
                  {nice(u.primaryCategory)} &amp; Schema Performance Matrix (
                  {datasetName})
                </h3>
                <p>
                  Columns and segment filters below are generated 100% from the
                  active dataset&apos;s own fields.
                </p>
              </div>
              <div
                className="rcc-zone-pills"
                role="group"
                aria-label={`Filter by ${nice(u.primaryCategory)}`}
              >
                <button
                  type="button"
                  className={zoneFilter === 'ALL' ? 'active' : ''}
                  onClick={() => setZoneFilter('ALL')}
                >
                  All {nice(u.primaryCategory)} ({rows.length})
                </button>
                {u.segmentBreakdown.slice(0, 5).map((seg) => (
                  <button
                    type="button"
                    key={seg.segment}
                    className={zoneFilter === seg.segment ? 'active' : ''}
                    onClick={() => setZoneFilter(seg.segment)}
                  >
                    {seg.segment} ({seg.count})
                  </button>
                ))}
              </div>
            </div>

            <div className="rcc-table-wrap">
              <table className="rcc-table">
                <thead>
                  <tr>
                    {displayColumns.map((col) => (
                      <th
                        key={col}
                        className={u.numericFields.includes(col) ? 'num' : ''}
                      >
                        {nice(col)}
                      </th>
                    ))}
                    <th>Benchmark Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUniversalRows.slice(0, 12).map((row, idx) => {
                    const pVal = u.primaryMetric
                      ? Number(row?.[u.primaryMetric])
                      : null;
                    const isAboveMean =
                      pVal !== null &&
                      Number.isFinite(pVal) &&
                      pVal >= u.stats.primaryMean;
                    return (
                      <tr key={row?._insightboard_id ?? idx}>
                        {displayColumns.map((col, cIdx) => {
                          const raw = row?.[col];
                          const isNum = u.numericFields.includes(col);
                          return (
                            <td
                              key={col}
                              className={`${cIdx === 0 ? 'rcc-unit-name' : ''} ${
                                isNum ? 'num rcc-tabular' : ''
                              }`}
                            >
                              {raw === null || raw === undefined || raw === ''
                                ? '—'
                                : typeof raw === 'object'
                                ? JSON.stringify(raw)
                                : isNum
                                ? formatMetric(raw)
                                : String(raw)}
                            </td>
                          );
                        })}
                        <td>
                          <span
                            className={`rcc-signal ${
                              u.primaryMetric
                                ? isAboveMean
                                  ? 'rcc-signal-positive'
                                  : 'rcc-signal-normal'
                                : 'rcc-signal-normal'
                            }`}
                          >
                            <CheckCircle2 size={12} />
                            {u.primaryMetric
                              ? isAboveMean
                                ? `Above Mean (${nice(u.primaryMetric)})`
                                : `Within Baseline`
                              : 'Verified Record'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </section>
  );
}
