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

test('computeRetailIntelligence sets isRetailSchema=false for Hyderabad Metro and custom uploaded datasets and computes universal stats exclusively from their own fields', () => {
  const metroRaw = JSON.parse(
    fs.readFileSync(new URL('../hyderabad_metro_stations.json', import.meta.url), 'utf8')
  );
  const metroRows = Array.isArray(metroRaw) ? metroRaw : metroRaw.records || metroRaw.data;
  const metroFields = Object.keys(metroRows[0]);
  const metroIntel = computeRetailIntelligence(metroRows, metroFields, {
    footfallLiftPct: 10,
    conversionLiftPct: 5
  });

  assert.ok(metroIntel);
  assert.equal(metroIntel.isRetailSchema, false);
  assert.ok(metroIntel.universal);
  assert.equal(metroIntel.universal.stats.recordCount, metroRows.length);
  assert.ok(metroFields.includes(metroIntel.universal.primaryCategory));
  assert.ok(metroIntel.universal.segmentBreakdown.length >= 2);

  // Test a custom uploaded corporate HR / financial dataset
  const customUploaded = [
    { department: 'Cloud Engineering', employee: 'Aarav', salary_usd: 145000, projects_delivered: 14, efficiency_score: 94 },
    { department: 'Cloud Engineering', employee: 'Meera', salary_usd: 152000, projects_delivered: 16, efficiency_score: 97 },
    { department: 'Data Science', employee: 'Rohan', salary_usd: 160000, projects_delivered: 19, efficiency_score: 98 },
    { department: 'Enterprise Sales', employee: 'Kavya', salary_usd: 118000, projects_delivered: 11, efficiency_score: 88 },
    { department: 'Operations', employee: 'Vikram', salary_usd: 92000, projects_delivered: 8, efficiency_score: 82 }
  ];
  const customFields = Object.keys(customUploaded[0]);
  const customIntel = computeRetailIntelligence(customUploaded, customFields, {
    footfallLiftPct: 12,
    conversionLiftPct: 5
  });

  assert.equal(customIntel.isRetailSchema, false);
  assert.equal(customIntel.universal.primaryCategory, 'department');
  assert.equal(customIntel.universal.primaryMetric, 'salary_usd');
  assert.ok(customIntel.universal.correlations.length >= 1);
  assert.ok(customIntel.universal.simulation.projectedPrimaryTotal > customIntel.universal.stats.primarySum);
});

