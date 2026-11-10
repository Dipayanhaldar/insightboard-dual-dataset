// Pure retail, shopping mall & sales intelligence calculations for InsightBoard VDB v2.1.0
// Decoupled from UI components so unit tests and dashboard panels share identical math.

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(String(value).replace(/[,₹$%]/g, '').trim());
  return Number.isFinite(num) ? num : null;
};

const matchField = (fields, pattern) =>
  (fields || []).find((field) => pattern.test(String(field)));

export function detectRetailFields(fields = []) {
  return {
    storeField:
      matchField(fields, /store|tenant|shop|brand|outlet|name|station/i) ||
      fields[0] ||
      '',
    zoneField:
      matchField(fields, /zone|floor|level|wing|area|line|region|city/i) ||
      fields[1] ||
      '',
    categoryField:
      matchField(fields, /category|sector|segment|department|type/i) ||
      fields[2] ||
      '',
    revenueField:
      matchField(fields, /monthly_revenue|revenue|sales|turnover|gmv|amount|total/i) ||
      '',
    targetField:
      matchField(fields, /target_revenue|target|goal|budget|quota/i) || '',
    footfallField:
      matchField(fields, /footfall|visitors|traffic|walkins|passengers/i) || '',
    transactionsField:
      matchField(fields, /transactions|orders|bills|invoices|count/i) || '',
    conversionField:
      matchField(fields, /conversion_rate|conversion/i) || '',
    basketField:
      matchField(fields, /avg_basket|basket_size|aov|ticket_size/i) || '',
    areaField:
      matchField(fields, /area_sqft|sqft|carpet_area|floor_area|store_area|leasable_area/i) || '',
    rentField:
      matchField(fields, /rent|lease_cost|cam_charges/i) || '',
    csatField:
      matchField(fields, /csat|rating|satisfaction|nps/i) || '',
    leaseStatusField:
      matchField(fields, /lease_status|status|contract/i) || ''
  };
}

export function computeRetailIntelligence(rows = [], fields = [], whatIf = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const schema = detectRetailFields(fields);

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

    // Actionable recommendation tag per store/unit
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

  // Aggregate metrics
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

  // What-If Scenario Simulator Math
  const simulatedFootfall = Math.round(totalFootfall * (1 + footfallLiftPct / 100));
  const simulatedConversionPct = Math.min(
    95,
    Math.max(0, avgConversionPct * (1 + conversionLiftPct / 100))
  );
  // Promo discount slightly lifts conversion elasticity (+0.35% conversion per 1% discount) while reducing basket price
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

  // Group by Mall Zone
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

  // Actionable Executive Recommendations
  const recommendations = [];
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
  if (!recommendations.length && list.length > 0) {
    recommendations.push({
      type: 'Dataset Operational Readiness',
      title: `${list.length} records active across ${zoneBreakdown.length} operational segments`,
      detail:
        'Use the What-If Simulator or upload custom monthly store CSV/JSON files to benchmark sales conversion and square-foot yield.'
    });
  }

  return {
    hasRetailMetrics: Boolean(schema.revenueField || schema.footfallField),
    schema,
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
