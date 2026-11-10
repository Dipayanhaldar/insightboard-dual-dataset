import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { detectRetailFields, computeRetailIntelligence } from './retailIntelligence.js';

const mallSample = JSON.parse(
  fs.readFileSync(new URL('../shopping_mall_sales.json', import.meta.url), 'utf8')
);

test('detectRetailFields identifies shopping mall and retail schema columns accurately', () => {
  const fields = Object.keys(mallSample[0]);
  const mapping = detectRetailFields(fields);

  assert.equal(mapping.revenueField, 'monthly_revenue_inr');
  assert.equal(mapping.targetField, 'target_revenue_inr');
  assert.equal(mapping.footfallField, 'footfall_visitors');
  assert.equal(mapping.transactionsField, 'transactions');
  assert.equal(mapping.areaField, 'area_sqft');
  assert.equal(mapping.rentField, 'rent_inr');
  assert.equal(mapping.storeField, 'store_name');
  assert.equal(mapping.zoneField, 'mall_zone');
  assert.equal(mapping.categoryField, 'category');
});

test('computeRetailIntelligence computes accurate baseline KPIs, space yield, and recommendations', () => {
  const fields = Object.keys(mallSample[0]);
  const baseline = computeRetailIntelligence(mallSample, fields, {
    footfallLiftPct: 0,
    conversionLiftPct: 0,
    promoDiscountPct: 0,
    rentAdjustmentPct: 0
  });

  assert.ok(baseline);
  assert.equal(baseline.hasRetailMetrics, true);
  assert.equal(baseline.summary.unitCount, 16);
  assert.ok(baseline.summary.totalRevenue > 80000000);
  assert.ok(baseline.summary.totalFootfall > 200000);
  assert.ok(baseline.summary.revenuePerSqft > 800);
  assert.equal(baseline.simulation.simulatedRevenue, baseline.summary.totalRevenue);
  assert.equal(baseline.simulation.revenueDelta, 0);
  assert.ok(baseline.zoneBreakdown.length >= 5);
  assert.ok(baseline.recommendations.length >= 2);
});

test('computeRetailIntelligence simulates What-If footfall and conversion lift accurately', () => {
  const fields = Object.keys(mallSample[0]);
  const simulated = computeRetailIntelligence(mallSample, fields, {
    footfallLiftPct: 15,
    conversionLiftPct: 10,
    promoDiscountPct: 5,
    rentAdjustmentPct: -5
  });

  assert.ok(simulated);
  assert.ok(simulated.simulation.simulatedRevenue > simulated.summary.totalRevenue);
  assert.ok(simulated.simulation.revenueDelta > 0);
  assert.ok(simulated.simulation.revenueDeltaPct > 10);
  assert.ok(simulated.simulation.simulatedRent < simulated.summary.totalRent);
});
