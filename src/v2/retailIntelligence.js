// Pure schema-aware & data-dependent intelligence engine for InsightBoard VDB v2.1.0
// Adapts strictly to the active dataset's own fields (User Imported CSV/JSON, Hyderabad Metro, or Shopping Mall & Retail).

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const num = Number(String(value).replace(/[,₹$%]/g, '').trim());
  return Number.isFinite(num) ? num : null;
};

const niceLabel = (key) =>
  String(key || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const matchField = (fields, pattern) =>
  (fields || []).find((field) => pattern.test(String(field)));

export function detectRetailFields(fields = []) {
  const storeField =
    matchField(fields, /store|tenant|shop|brand|outlet|name|station|title/i) ||
    fields[0] ||
    '';
  const zoneField =
    matchField(fields, /zone|floor|level|wing|area|line|corridor|region|city/i) ||
    fields[1] ||
    '';
  const categoryField =
    matchField(fields, /category|sector|segment|department|type|interchange|structure/i) ||
    fields[2] ||
    '';
  const revenueField =
    matchField(fields, /monthly_revenue|revenue|sales|turnover|gmv|amount|total/i) ||
    '';
  const targetField =
    matchField(fields, /target_revenue|target|goal|budget|quota/i) || '';
  const footfallField =
    matchField(fields, /footfall|visitors|traffic|walkins|passengers/i) || '';
  const transactionsField =
    matchField(fields, /transactions|orders|bills|invoices/i) || '';
  const conversionField =
    matchField(fields, /conversion_rate|conversion/i) || '';
  const basketField =
    matchField(fields, /avg_basket|basket_size|aov|ticket_size/i) || '';
  const areaField =
    matchField(fields, /area_sqft|sqft|carpet_area|floor_area|store_area|leasable_area/i) || '';
  const rentField =
    matchField(fields, /rent|lease_cost|cam_charges/i) || '';
  const csatField =
    matchField(fields, /csat|rating|satisfaction|nps/i) || '';
  const leaseStatusField =
    matchField(fields, /lease_status|status|contract/i) || '';

  // Strictly true ONLY when the active dataset actually contains commercial retail/mall schema columns
  const isRetailRich = Boolean(
    revenueField && (areaField || rentField || footfallField || targetField)
  );

  return {
    storeField,
    zoneField,
    categoryField,
    revenueField,
    targetField,
    footfallField,
    transactionsField,
    conversionField,
    basketField,
    areaField,
    rentField,
    csatField,
    leaseStatusField,
    isRetailRich
  };
}

function computePearsonCorrelation(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0,
    sumY2 = 0,
    valid = 0;
  for (let i = 0; i < n; i += 1) {
    const x = xs[i];
    const y = ys[i];
    if (x === null || y === null || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
    valid += 1;
  }
  if (valid < 3) return null;
  const num = valid * sumXY - sumX * sumY;
  const den = Math.sqrt((valid * sumX2 - sumX * sumX) * (valid * sumY2 - sumY * sumY));
  if (!Number.isFinite(den) || den === 0) return null;
  return Number((num / den).toFixed(3));
}

export function computeUniversalDataIntelligence(rows = [], fields = [], whatIf = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const cleanFields = (fields || []).filter((f) => !String(f).startsWith('_insightboard_'));

  // Detect numeric vs categorical columns strictly from the active dataset
  const numericFields = cleanFields.filter((key) => {
    const vals = list
      .map((r) => r?.[key])
      .filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
    if (!vals.length) return false;
    const numericCount = vals.filter((v) => toNumber(v) !== null).length;
    return numericCount / vals.length >= 0.7;
  });

  // Prefer meaningful business/operational metrics over sequential ID columns
  const nonIdNumericFields = numericFields.filter(
    (k) => !/^(id|record_id|index|sno|sr_no|serial)$/i.test(String(k).trim())
  );
  const effectiveNumericFields =
    nonIdNumericFields.length > 0 ? nonIdNumericFields : numericFields;

  const categoricalFields = cleanFields.filter(
    (key) =>
      !numericFields.includes(key) &&
      new Set(
        list
          .map((r) => String(r?.[key] ?? '').trim())
          .filter(Boolean)
      ).size > 1
  );

  const labelField =
    cleanFields.find((k) =>
      /name|title|store|station|product|item|employee|customer|account|city|country|code/i.test(
        String(k)
      )
    ) ||
    categoricalFields[0] ||
    cleanFields[0] ||
    'Record';

  const primaryCategory =
    categoricalFields.find((k) => k !== labelField) ||
    categoricalFields[0] ||
    cleanFields[0] ||
    'Category';

  const secondaryCategory =
    categoricalFields.find((k) => k !== labelField && k !== primaryCategory) ||
    primaryCategory;

  const primaryMetric = effectiveNumericFields[0] || '';
  const secondaryMetric = effectiveNumericFields[1] || '';
  const tertiaryMetric = effectiveNumericFields[2] || '';

  // Compute descriptive statistics on primaryMetric
  const primaryValues = primaryMetric
    ? list.map((r) => toNumber(r?.[primaryMetric])).filter((v) => v !== null)
    : [];
  const secondaryValues = secondaryMetric
    ? list.map((r) => toNumber(r?.[secondaryMetric])).filter((v) => v !== null)
    : [];

  const primarySum = primaryValues.reduce((a, b) => a + b, 0);
  const primaryMean = primaryValues.length ? primarySum / primaryValues.length : 0;
  const sortedPrimary = [...primaryValues].sort((a, b) => a - b);
  const primaryMin = sortedPrimary.length ? sortedPrimary[0] : 0;
  const primaryMax = sortedPrimary.length ? sortedPrimary[sortedPrimary.length - 1] : 0;
  const primaryMedian = sortedPrimary.length
    ? sortedPrimary.length % 2 === 1
      ? sortedPrimary[Math.floor(sortedPrimary.length / 2)]
      : (sortedPrimary[sortedPrimary.length / 2 - 1] +
          sortedPrimary[sortedPrimary.length / 2]) /
        2
    : 0;

  const variance =
    primaryValues.length > 1
      ? primaryValues.reduce((acc, val) => acc + (val - primaryMean) ** 2, 0) /
        primaryValues.length
      : 0;
  const primaryStdDev = Math.sqrt(variance);

  const secondarySum = secondaryValues.reduce((a, b) => a + b, 0);
  const secondaryMean = secondaryValues.length
    ? secondarySum / secondaryValues.length
    : 0;

  // Completeness % across all active fields
  const totalCells = list.length * Math.max(1, cleanFields.length);
  let filledCells = 0;
  list.forEach((row) => {
    cleanFields.forEach((key) => {
      const val = row?.[key];
      if (val !== null && val !== undefined && String(val).trim() !== '') {
        filledCells += 1;
      }
    });
  });
  const completenessPct = list.length
    ? Number(((filledCells / totalCells) * 100).toFixed(1))
    : 100;

  // Segment breakdown by primaryCategory
  const segMap = new Map();
  list.forEach((row) => {
    const segName = String(row?.[primaryCategory] ?? 'Uncategorized').trim() || 'Uncategorized';
    const pVal = primaryMetric ? toNumber(row?.[primaryMetric]) ?? 0 : 1;
    const sVal = secondaryMetric ? toNumber(row?.[secondaryMetric]) ?? 0 : 0;
    const current = segMap.get(segName) || {
      segment: segName,
      count: 0,
      primaryTotal: 0,
      secondaryTotal: 0
    };
    current.count += 1;
    current.primaryTotal += pVal;
    current.secondaryTotal += sVal;
    segMap.set(segName, current);
  });

  const segmentBreakdown = [...segMap.values()]
    .map((item) => ({
      ...item,
      primaryAvg: item.count > 0 ? Number((item.primaryTotal / item.count).toFixed(2)) : 0,
      secondaryAvg: item.count > 0 ? Number((item.secondaryTotal / item.count).toFixed(2)) : 0,
      sharePct:
        primarySum > 0
          ? Number(((item.primaryTotal / primarySum) * 100).toFixed(1))
          : list.length > 0
          ? Number(((item.count / list.length) * 100).toFixed(1))
          : 0
    }))
    .sort((a, b) => b.primaryTotal - a.primaryTotal);

  // Pareto 80/20 Concentration Analysis
  const top20Count = Math.max(1, Math.ceil(list.length * 0.2));
  const sortedDesc = [...primaryValues].sort((a, b) => b - a);
  const top20Sum = sortedDesc.slice(0, top20Count).reduce((a, b) => a + b, 0);
  const top20SharePct =
    primarySum > 0 ? Number(((top20Sum / primarySum) * 100).toFixed(1)) : 0;

  // Z-Score Statistical Anomaly & Outlier Detection (|z| >= 1.5)
  const anomalies = [];
  if (primaryMetric && primaryStdDev > 0) {
    list.forEach((row, idx) => {
      const val = toNumber(row?.[primaryMetric]);
      if (val === null) return;
      const z = (val - primaryMean) / primaryStdDev;
      if (Math.abs(z) >= 1.5) {
        const deviationPct =
          primaryMean !== 0
            ? Number((((val - primaryMean) / Math.abs(primaryMean)) * 100).toFixed(1))
            : 0;
        anomalies.push({
          id: row?._insightboard_id ?? idx + 1,
          label: String(row?.[labelField] ?? `Row ${idx + 1}`),
          category: String(row?.[primaryCategory] ?? '—'),
          metricName: niceLabel(primaryMetric),
          value: val,
          zScore: Number(z.toFixed(2)),
          deviationPct,
          direction: z > 0 ? 'High Outlier' : 'Low Outlier'
        });
      }
    });
    anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
  }

  // Pairwise Pearson Correlation Matrix across detected numeric fields
  const correlations = [];
  const corrFields = effectiveNumericFields.slice(0, 6);
  for (let i = 0; i < corrFields.length; i += 1) {
    for (let j = i + 1; j < corrFields.length; j += 1) {
      const fA = corrFields[i];
      const fB = corrFields[j];
      const xs = list.map((r) => toNumber(r?.[fA]));
      const ys = list.map((r) => toNumber(r?.[fB]));
      const r = computePearsonCorrelation(xs, ys);
      if (r !== null) {
        let strength = 'Weak / Independent';
        if (Math.abs(r) >= 0.75) strength = r > 0 ? 'Strong Positive' : 'Strong Inverse';
        else if (Math.abs(r) >= 0.4) strength = r > 0 ? 'Moderate Positive' : 'Moderate Inverse';
        correlations.push({
          fieldA: fA,
          fieldB: fB,
          pairLabel: `${niceLabel(fA)} × ${niceLabel(fB)}`,
          r,
          strength
        });
      }
    }
  }
  correlations.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

  // Data-Dependent What-If Sensitivity Simulation
  const growthLiftPct = Number(whatIf.footfallLiftPct) || 0;
  const efficiencyLiftPct = Number(whatIf.conversionLiftPct) || 0;
  const varianceBufferPct = Number(whatIf.promoDiscountPct) || 0;
  const thresholdAdjPct = Number(whatIf.rentAdjustmentPct) || 0;

  const baseMetricTotal = primaryMetric ? primarySum : list.length;
  const netMultiplier =
    (1 + growthLiftPct / 100) *
    (1 + efficiencyLiftPct / 100) *
    (1 - varianceBufferPct / 100);
  const projectedPrimaryTotal = Number((baseMetricTotal * netMultiplier).toFixed(2));
  const projectedPrimaryDelta = Number((projectedPrimaryTotal - baseMetricTotal).toFixed(2));
  const projectedPrimaryDeltaPct =
    baseMetricTotal > 0
      ? Number(((projectedPrimaryDelta / baseMetricTotal) * 100).toFixed(2))
      : 0;

  const projectedSecondaryTotal = Number(
    ((secondaryMetric ? secondarySum : segmentBreakdown.length) *
      (1 + (growthLiftPct * 0.6 + thresholdAdjPct) / 100)).toFixed(2)
  );

  // Automated Data-Dependent Recommendations
  const dataRecommendations = [];
  if (segmentBreakdown.length > 0) {
    const leader = segmentBreakdown[0];
    dataRecommendations.push({
      type: `${niceLabel(primaryCategory)} Dominance`,
      title: `"${leader.segment}" leads with ${leader.sharePct}% of total ${niceLabel(
        primaryMetric || 'records'
      )} (${leader.count} records)`,
      detail: primaryMetric
        ? `Average ${niceLabel(primaryMetric)} in "${leader.segment}" is ${leader.primaryAvg.toLocaleString()} vs dataset mean ${Number(
            primaryMean.toFixed(2)
          ).toLocaleString()}.`
        : `Contains ${leader.count} of ${list.length} active records (${leader.sharePct}% share).`
    });
  }
  if (anomalies.length > 0) {
    const topAnomaly = anomalies[0];
    dataRecommendations.push({
      type: 'Statistical Outlier Signal (Z-Score)',
      title: `${anomalies.length} record(s) deviate significantly from ${niceLabel(
        primaryMetric
      )} mean`,
      detail: `Highest deviation: "${topAnomaly.label}" (${topAnomaly.category}) at ${topAnomaly.value.toLocaleString()} (z = ${topAnomaly.zScore}, ${
        topAnomaly.deviationPct >= 0 ? '+' : ''
      }${topAnomaly.deviationPct}% vs mean).`
    });
  }
  if (correlations.length > 0) {
    const topCorr = correlations[0];
    dataRecommendations.push({
      type: 'Multivariate Driver Correlation',
      title: `${topCorr.pairLabel} shows r = ${topCorr.r} (${topCorr.strength})`,
      detail: `Changes in ${niceLabel(topCorr.fieldA)} statistically co-move with ${niceLabel(
        topCorr.fieldB
      )} across ${list.length} records.`
    });
  }
  if (dataRecommendations.length < 3) {
    dataRecommendations.push({
      type: 'Schema & Completeness Hygiene',
      title: `${completenessPct}% field completeness across ${cleanFields.length} detected columns`,
      detail:
        top20SharePct > 0
          ? `Top 20% of records account for ${top20SharePct}% of total ${niceLabel(
              primaryMetric
            )} (Pareto 80/20 benchmark).`
          : `All ${list.length} records are indexed and ready for multi-dimensional filtering and comparison.`
    });
  }

  return {
    cleanFields,
    numericFields: effectiveNumericFields,
    categoricalFields,
    labelField,
    primaryCategory,
    secondaryCategory,
    primaryMetric,
    secondaryMetric,
    tertiaryMetric,
    stats: {
      recordCount: list.length,
      fieldCount: cleanFields.length,
      distinctCategories: segmentBreakdown.length,
      completenessPct,
      primarySum: Number(primarySum.toFixed(2)),
      primaryMean: Number(primaryMean.toFixed(2)),
      primaryMedian: Number(primaryMedian.toFixed(2)),
      primaryMin: Number(primaryMin.toFixed(2)),
      primaryMax: Number(primaryMax.toFixed(2)),
      primaryStdDev: Number(primaryStdDev.toFixed(2)),
      secondarySum: Number(secondarySum.toFixed(2)),
      secondaryMean: Number(secondaryMean.toFixed(2)),
      top20SharePct
    },
    simulation: {
      projectedPrimaryTotal,
      projectedPrimaryDelta,
      projectedPrimaryDeltaPct,
      projectedSecondaryTotal,
      projectedPrimaryMean:
        list.length > 0 ? Number((projectedPrimaryTotal / list.length).toFixed(2)) : 0
    },
    segmentBreakdown,
    anomalies: anomalies.slice(0, 8),
    correlations: correlations.slice(0, 6),
    dataRecommendations
  };
}

export function computeRetailIntelligence(rows = [], fields = [], whatIf = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const schema = detectRetailFields(fields);
  const universal = computeUniversalDataIntelligence(list, fields, whatIf);

  const footfallLiftPct = Number(whatIf.footfallLiftPct) || 0;
  const conversionLiftPct = Number(whatIf.conversionLiftPct) || 0;
  const promoDiscountPct = Number(whatIf.promoDiscountPct) || 0;
  const rentAdjustmentPct = Number(whatIf.rentAdjustmentPct) || 0;

  let totalRevenue = 0;
  let totalTarget = 0;
  let totalFootfall = 0;
  let totalTransactions = 0;
  let totalArea = 0;
  let totalRent = 0;
  let csatSum = 0;
  let csatCount = 0;

  const tenantRows = list.map((row, idx) => {
    const name = String(row?.[schema.storeField] ?? `Unit ${idx + 1}`);
    const zone = String(row?.[schema.zoneField] ?? 'General Zone');
    const category = String(row?.[schema.categoryField] ?? 'General');
    const revenue = toNumber(row?.[schema.revenueField]) ?? 0;
    const target = toNumber(row?.[schema.targetField]) ?? revenue;
    const footfall = toNumber(row?.[schema.footfallField]) ?? 0;
    const transactions = toNumber(row?.[schema.transactionsField]) ?? 0;
    const area = toNumber(row?.[schema.areaField]) ?? 0;
    const rent = toNumber(row?.[schema.rentField]) ?? 0;
    const csat = toNumber(row?.[schema.csatField]);
    const leaseStatus = String(row?.[schema.leaseStatusField] ?? 'Active');

    const conversion =
      toNumber(row?.[schema.conversionField]) ??
      (footfall > 0 ? (transactions / footfall) * 100 : 0);
    const basket =
      toNumber(row?.[schema.basketField]) ??
      (transactions > 0 ? revenue / transactions : 0);

    const revPerSqft = area > 0 ? revenue / area : 0;
    const rentToRevenuePct = revenue > 0 ? (rent / revenue) * 100 : 0;
    const targetAttainmentPct = target > 0 ? (revenue / target) * 100 : 100;

    totalRevenue += revenue;
    totalTarget += target;
    totalFootfall += footfall;
    totalTransactions += transactions;
    totalArea += area;
    totalRent += rent;
    if (csat !== null) {
      csatSum += csat;
      csatCount += 1;
    }

    let actionBadge = 'On Track · Optimal Yield';
    let priority = 'normal';
    if (rentToRevenuePct > 14 || targetAttainmentPct < 90) {
      actionBadge = 'Lease & Promo Intervention';
      priority = 'high';
    } else if (footfall > 15000 && conversion < 12) {
      actionBadge = 'High Footfall · Boost Conversion';
      priority = 'medium';
    } else if (targetAttainmentPct >= 108) {
      actionBadge = 'Top Performer · Expand Allocation';
      priority = 'positive';
    }

    return {
      id: row?._insightboard_id ?? idx + 1,
      name,
      zone,
      category,
      revenue,
      target,
      footfall,
      transactions,
      conversion: Number(conversion.toFixed(2)),
      basket: Number(basket.toFixed(2)),
      area,
      rent,
      revPerSqft: Number(revPerSqft.toFixed(2)),
      rentToRevenuePct: Number(rentToRevenuePct.toFixed(2)),
      targetAttainmentPct: Number(targetAttainmentPct.toFixed(1)),
      csat: csat !== null ? Number(csat.toFixed(1)) : null,
      leaseStatus,
      actionBadge,
      priority
    };
  });

  const avgConversionPct =
    totalFootfall > 0
      ? Number(((totalTransactions / totalFootfall) * 100).toFixed(2))
      : tenantRows.length
      ? Number(
          (
            tenantRows.reduce((acc, item) => acc + item.conversion, 0) /
            tenantRows.length
          ).toFixed(2)
        )
      : 0;

  const avgBasketInr =
    totalTransactions > 0
      ? Number((totalRevenue / totalTransactions).toFixed(2))
      : tenantRows.length
      ? Number(
          (
            tenantRows.reduce((acc, item) => acc + item.basket, 0) /
            tenantRows.length
          ).toFixed(2)
        )
      : 0;

  const revenuePerSqft =
    totalArea > 0 ? Number((totalRevenue / totalArea).toFixed(2)) : 0;

  const targetAttainmentPct =
    totalTarget > 0 ? Number(((totalRevenue / totalTarget) * 100).toFixed(1)) : 100;

  const rentCoverageRatio =
    totalRent > 0 ? Number((totalRevenue / totalRent).toFixed(2)) : 0;

  const avgCsat =
    csatCount > 0 ? Number((csatSum / csatCount).toFixed(2)) : null;

  const simulatedFootfall = Math.round(totalFootfall * (1 + footfallLiftPct / 100));
  const simulatedConversionPct = Math.min(
    95,
    Math.max(0, avgConversionPct * (1 + conversionLiftPct / 100))
  );
  const promoElasticityLift = 1 + (promoDiscountPct * 0.35) / 100;
  const effectiveBasket = avgBasketInr * (1 - promoDiscountPct / 100);

  const simulatedRevenue =
    totalRevenue > 0
      ? Math.round(
          totalRevenue *
            (1 + footfallLiftPct / 100) *
            (1 + conversionLiftPct / 100) *
            promoElasticityLift *
            (1 - promoDiscountPct / 100)
        )
      : 0;

  const simulatedRent = Math.round(totalRent * (1 + rentAdjustmentPct / 100));
  const revenueDelta = simulatedRevenue - totalRevenue;
  const revenueDeltaPct =
    totalRevenue > 0
      ? Number(((revenueDelta / totalRevenue) * 100).toFixed(2))
      : 0;

  const zoneMap = new Map();
  for (const unit of tenantRows) {
    const current = zoneMap.get(unit.zone) || {
      zone: unit.zone,
      stores: 0,
      revenue: 0,
      footfall: 0,
      area: 0,
      rent: 0
    };
    current.stores += 1;
    current.revenue += unit.revenue;
    current.footfall += unit.footfall;
    current.area += unit.area;
    current.rent += unit.rent;
    zoneMap.set(unit.zone, current);
  }
  const zoneBreakdown = [...zoneMap.values()]
    .map((z) => ({
      ...z,
      revPerSqft: z.area > 0 ? Number((z.revenue / z.area).toFixed(2)) : 0
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const recommendations = [];
  if (schema.isRetailRich) {
    const underperformers = tenantRows.filter((t) => t.priority === 'high');
    const highTrafficLowConv = tenantRows.filter((t) => t.priority === 'medium');
    const topPerformers = tenantRows.filter((t) => t.priority === 'positive');

    if (underperformers.length > 0) {
      recommendations.push({
        type: 'Occupancy & Lease Optimization',
        title: `${underperformers.length} unit(s) below target or above 14% rent-to-revenue threshold`,
        detail: `Review lease terms or launch co-branded bundle campaigns for ${underperformers
          .slice(0, 3)
          .map((u) => u.name)
          .join(', ')}.`
      });
    }
    if (highTrafficLowConv.length > 0) {
      recommendations.push({
        type: 'Sales Conversion Lift',
        title: `${highTrafficLowConv.length} high-footfall store(s) have sub-12% checkout conversion`,
        detail: `Deploy peak-hour checkout staff and point-of-sale offers in ${highTrafficLowConv
          .slice(0, 3)
          .map((u) => u.name)
          .join(', ')}.`
      });
    }
    if (topPerformers.length > 0) {
      recommendations.push({
        type: 'Anchor Tenant Expansion',
        title: `${topPerformers.length} flagship store(s) exceeding revenue targets by 8%+`,
        detail: `Prioritize atrium kiosk extensions and premium signage for ${topPerformers
          .slice(0, 3)
          .map((u) => u.name)
          .join(', ')}.`
      });
    }
  }

  if (!recommendations.length) {
    recommendations.push(...universal.dataRecommendations);
  }

  return {
    hasRetailMetrics: schema.isRetailRich,
    isRetailSchema: schema.isRetailRich,
    schema,
    universal,
    summary: {
      unitCount: list.length,
      totalRevenue,
      totalTarget,
      targetAttainmentPct,
      totalFootfall,
      totalTransactions,
      avgConversionPct,
      avgBasketInr,
      totalArea,
      revenuePerSqft,
      totalRent,
      rentCoverageRatio,
      avgCsat
    },
    simulation: {
      simulatedFootfall,
      simulatedConversionPct: Number(simulatedConversionPct.toFixed(2)),
      effectiveBasket: Number(effectiveBasket.toFixed(2)),
      simulatedRevenue,
      simulatedRent,
      revenueDelta,
      revenueDeltaPct
    },
    tenantRows,
    zoneBreakdown,
    recommendations
  };
}
