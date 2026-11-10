import React, { useMemo, useState } from 'react';
import {
  Building2,
  Calculator,
  TrendingUp,
  Users,
  ShoppingBag,
  Sparkles,
  RefreshCw,
  ArrowUpRight,
  Layers,
  Award,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { computeRetailIntelligence } from './retailIntelligence.js';
import './RetailCommandCenter.css';

const formatInr = (value) => {
  const num = Number(value) || 0;
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

export default function RetailCommandCenter({
  rows = [],
  fields = [],
  datasetName = '',
  onLoadMallPreset
}) {
  const [footfallLiftPct, setFootfallLiftPct] = useState(10);
  const [conversionLiftPct, setConversionLiftPct] = useState(5);
  const [promoDiscountPct, setPromoDiscountPct] = useState(0);
  const [rentAdjustmentPct, setRentAdjustmentPct] = useState(0);
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [aiOptBusy, setAiOptBusy] = useState(false);
  const [aiOptResult, setAiOptResult] = useState('');
  const [aiOptSource, setAiOptSource] = useState('');

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

  const visibleTenants = useMemo(() => {
    if (zoneFilter === 'ALL') return intel.tenantRows;
    return intel.tenantRows.filter((item) => item.zone === zoneFilter);
  }, [intel.tenantRows, zoneFilter]);

  async function runAiOptimization() {
    setAiOptBusy(true);
    try {
      const response = await fetch('/api/ai/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetName,
          summary: intel.summary,
          simulation: intel.simulation,
          topZones: intel.zoneBreakdown.slice(0, 5),
          recommendations: intel.recommendations
        })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.plan) {
        setAiOptResult(data.plan);
        setAiOptSource(data.source || 'gemini');
      } else {
        throw new Error(data.error || 'Fallback to deterministic optimization');
      }
    } catch {
      const s = intel.summary;
      const sim = intel.simulation;
      setAiOptSource('local-engine');
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
          `3. IMMEDIATE MALL & SALES MANAGER ACTIONS:`,
          ...intel.recommendations.map(
            (rec, i) => `   ${i + 1}) [${rec.type}] ${rec.title} — ${rec.detail}`
          )
        ].join('\n')
      );
    } finally {
      setAiOptBusy(false);
    }
  }

  return (
    <section
      id="retail-command-center"
      className="retail-command-center"
      aria-labelledby="retail-cc-title"
    >
      <div className="rcc-header">
        <div>
          <div className="rcc-eyebrow">
            <Building2 size={14} /> SHOPPING MALL &amp; SALES INTELLIGENCE SUITE
          </div>
          <h2 id="retail-cc-title">
            Commercial Retail &amp; Tenant Optimization Hub
          </h2>
          <p>
            Purpose-built for shopping mall managers, retail operations, and
            regional sales directors. Benchmark store yield per sq.ft, conversion
            funnels, lease coverage, and run real-time What-If revenue
            simulations.
          </p>
        </div>
        <div className="rcc-header-actions">
          {!intel.hasRetailMetrics && onLoadMallPreset && (
            <button
              type="button"
              className="rcc-btn rcc-btn-primary"
              onClick={onLoadMallPreset}
            >
              <ShoppingBag size={15} /> Load Shopping Mall &amp; Sales Dataset
            </button>
          )}
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
                ? 'Generating Optimization Plan…'
                : 'AI Sales & Lease Optimization'}
            </span>
          </button>
        </div>
      </div>

      {/* Executive Retail KPI Strip */}
      <div className="rcc-kpi-strip">
        <div className="rcc-kpi-box">
          <div className="rcc-kpi-top">
            <span>Gross Portfolio Revenue</span>
            <TrendingUp size={15} />
          </div>
          <strong className="rcc-tabular">
            {intel.hasRetailMetrics
              ? formatInr(intel.summary.totalRevenue)
              : `${intel.summary.unitCount} Units`}
          </strong>
          <small>
            {intel.hasRetailMetrics
              ? `${intel.summary.targetAttainmentPct}% of ${formatInr(intel.summary.totalTarget)} target`
              : 'Switch to Shopping Mall preset for ₹ revenue metrics'}
          </small>
        </div>

        <div className="rcc-kpi-box">
          <div className="rcc-kpi-top">
            <span>Total Visitor Footfall</span>
            <Users size={15} />
          </div>
          <strong className="rcc-tabular">
            {intel.summary.totalFootfall > 0
              ? intel.summary.totalFootfall.toLocaleString('en-IN')
              : intel.summary.unitCount.toLocaleString('en-IN')}
          </strong>
          <small>
            {intel.summary.totalTransactions > 0
              ? `${intel.summary.totalTransactions.toLocaleString('en-IN')} completed checkouts`
              : 'Active records in current view'}
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
            {intel.summary.rentCoverageRatio > 0
              ? `${intel.summary.rentCoverageRatio}× gross revenue-to-rent coverage`
              : `${intel.summary.totalArea.toLocaleString('en-IN')} sq.ft total area`}
          </small>
        </div>
      </div>

      {/* Interactive What-If Scenario Simulator + AI Action Recommendations */}
      <div className="rcc-split-grid">
        <div className="rcc-panel rcc-simulator">
          <div className="rcc-panel-head">
            <div>
              <span className="rcc-tag">INTERACTIVE FORECASTING</span>
              <h3>What-If Mall &amp; Sales Scenario Simulator</h3>
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
            Simulate seasonal footfall campaigns, sales staff conversion
            training, promotional discounts, and lease renewals in real time.
          </p>

          <div className="rcc-sliders">
            <label className="rcc-slider-row">
              <div className="rcc-slider-label">
                <span>Footfall Campaign Lift</span>
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
                aria-label="Footfall Campaign Lift percentage"
              />
            </label>

            <label className="rcc-slider-row">
              <div className="rcc-slider-label">
                <span>Checkout Conversion Improvement</span>
                <strong className="rcc-tabular">
                  {conversionLiftPct >= 0 ? `+${conversionLiftPct}%` : `${conversionLiftPct}%`}
                </strong>
              </div>
              <input
                type="range"
                min="-15"
                max="35"
                step="1"
                value={conversionLiftPct}
                onChange={(e) => setConversionLiftPct(Number(e.target.value))}
                aria-label="Checkout Conversion Improvement percentage"
              />
            </label>

            <label className="rcc-slider-row">
              <div className="rcc-slider-label">
                <span>Promotional Markdown / Discount</span>
                <strong className="rcc-tabular">{promoDiscountPct}%</strong>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={promoDiscountPct}
                onChange={(e) => setPromoDiscountPct(Number(e.target.value))}
                aria-label="Promotional Markdown percentage"
              />
            </label>

            <label className="rcc-slider-row">
              <div className="rcc-slider-label">
                <span>Base Lease / Rent Adjustment</span>
                <strong className="rcc-tabular">
                  {rentAdjustmentPct >= 0 ? `+${rentAdjustmentPct}%` : `${rentAdjustmentPct}%`}
                </strong>
              </div>
              <input
                type="range"
                min="-15"
                max="25"
                step="1"
                value={rentAdjustmentPct}
                onChange={(e) => setRentAdjustmentPct(Number(e.target.value))}
                aria-label="Base Lease Adjustment percentage"
              />
            </label>
          </div>

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
                At {intel.simulation.simulatedConversionPct}% effective conversion
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
        </div>

        <div className="rcc-panel rcc-insights">
          <div className="rcc-panel-head">
            <div>
              <span className="rcc-tag">DECISION INTELLIGENCE</span>
              <h3>Automated Mall &amp; Sales Action Signals</h3>
            </div>
            <Award size={18} />
          </div>
          <p className="rcc-subtext">
            Real-time diagnostic rules flag anchor expansion candidates,
            conversion bottlenecks, and lease renewal risks.
          </p>

          <div className="rcc-rec-list">
            {intel.recommendations.map((rec, index) => (
              <div className="rcc-rec-item" key={index}>
                <div className="rcc-rec-type">{rec.type}</div>
                <strong>{rec.title}</strong>
                <p>{rec.detail}</p>
              </div>
            ))}
          </div>

          {aiOptResult && (
            <div className="rcc-ai-plan" aria-live="polite">
              <div className="rcc-ai-plan-head">
                <strong>
                  <Sparkles size={14} /> Executive Optimization Brief (
                  {aiOptSource === 'gemini'
                    ? 'Google Gemini Free Tier'
                    : 'Local Decision Engine'}
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

      {/* Zone & Tenant Space Productivity Matrix */}
      {intel.tenantRows.length > 0 && (
        <div className="rcc-matrix-panel">
          <div className="rcc-matrix-head">
            <div>
              <h3>Tenant &amp; Zone Space Productivity Matrix</h3>
              <p>
                Compare revenue per sq.ft, target attainment, and rent-to-sales
                health across zones.
              </p>
            </div>
            <div className="rcc-zone-pills" role="group" aria-label="Filter by zone">
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
                  <th>Mall Zone / Line</th>
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
                      <span className={`rcc-signal rcc-signal-${unit.priority}`}>
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
      )}
    </section>
  );
}
