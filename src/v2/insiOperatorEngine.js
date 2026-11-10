// INSI (insi.ai) Autonomous Executive Data Operator & Universal Connector Engine
// Isomorphic pure module (runs 100% client-side offline in browser & server-side in Express)

export const VALID_MASCOT_ANIMATIONS = Object.freeze([
  'slide_in',
  'idle_prompt',
  'thinking_pulse',
  'celebrate_sparkles',
  'nod_confirm',
  'alert_glow',
  'export_complete',
  'slide_out'
]);

export const VALID_AURA_COLORS = Object.freeze([
  '#00F0FF', // Cyan: Listening / Processing / General analysis
  '#00FF88', // Emerald: Positive growth / Target achieved / Export complete
  '#FFB800', // Amber: Warning / Margin dip / Missing schema fields
  '#FF3B5C', // Crimson: Critical anomaly / Sharp sales drop / Connection error
  '#A855F7'  // Purple: Forecasting / Strategic recommendation mode
]);

export const VALID_CONNECTOR_MODES = Object.freeze([
  'demo_sandbox',
  'file_upload',
  'api_webhook',
  'awaiting_data'
]);

// Phonetic variations of "Hey INSI" produced by browser Speech-to-Text engines
const WAKE_WORD_REGEX = /^\s*(?:hey|hi|hello|ok|okay)?\s*(?:insi\.ai|insi|in-see|in\s+see|in\s+c|nc|n\.c\.|easy|insight\s*bot|insight)\b[\s,:.\-!?]*/i;

const FUZZY_SYNONYM_GROUPS = Object.freeze({
  revenue: [
    'monthly_revenue_inr',
    'revenue',
    'gross_sales',
    'sales',
    'total_sales',
    'net_sales',
    'turnover',
    'gmv',
    'amount',
    'total_revenue',
    'monthly_sales'
  ],
  store: [
    'store_name',
    'tenant_name',
    'tenant',
    'store',
    'outlet',
    'merchant',
    'brand',
    'station_name',
    'station',
    'unit_name',
    'name',
    'title'
  ],
  footfall: [
    'monthly_footfall',
    'footfall',
    'visitor_count',
    'visitors',
    'traffic',
    'daily_ridership',
    'ridership',
    'passengers',
    'customers',
    'walk_ins'
  ],
  category: [
    'category',
    'mall_zone',
    'zone',
    'sector',
    'department',
    'segment',
    'corridor',
    'line',
    'region',
    'city',
    'floor_level',
    'floor'
  ],
  conversion: [
    'conversion_rate_pct',
    'conversion_rate',
    'conversion',
    'checkout_conversion',
    'yield_pct',
    'occupancy_pct'
  ],
  area: [
    'area_sqft',
    'sqft',
    'floor_area',
    'leasable_area',
    'size_sqft'
  ],
  rent: [
    'rent_inr',
    'monthly_rent',
    'rent',
    'lease_cost'
  ],
  basket: [
    'avg_basket_inr',
    'average_basket',
    'aov',
    'avg_order_value',
    'ticket_size'
  ],
  rating: [
    'csat_score',
    'customer_rating',
    'rating',
    'nps',
    'score'
  ],
  period: [
    'report_month',
    'month',
    'date',
    'period',
    'quarter',
    'year',
    'timestamp'
  ]
});

/**
 * Detects whether a voice/text input starts with or contains "Hey INSI"
 * (or phonetic STT transcriptions like "Hey NC", "Hey in C", "Hey easy", "Hey insight")
 */
export function detectWakeWordAndCommand(rawInput = '') {
  const original = String(rawInput || '').trim();
  if (!original) {
    return {
      wakeWordDetected: false,
      matchedWakePhrase: null,
      cleanCommand: '',
      normalizedTranscript: ''
    };
  }

  const prefixMatch = original.match(WAKE_WORD_REGEX);
  if (prefixMatch) {
    const stripped = original.slice(prefixMatch[0].length).trim();
    return {
      wakeWordDetected: true,
      matchedWakePhrase: prefixMatch[0].trim().replace(/[,:.\-!?]+$/, ''),
      cleanCommand: stripped || 'Give me an executive overview of the active dataset',
      normalizedTranscript: `Hey INSI${stripped ? ', ' + stripped : ''}`
    };
  }

  // Also check inline wake word e.g. "please hey NC show revenue"
  const inlineRegex = /\b(?:hey|hi|ok|okay)\s+(?:insi\.ai|insi|in-see|in\s+see|in\s+c|nc|easy|insight)\b[\s,:.\-!?]*/i;
  const inlineMatch = original.match(inlineRegex);
  if (inlineMatch) {
    const stripped = original.replace(inlineRegex, ' ').replace(/\s+/g, ' ').trim();
    return {
      wakeWordDetected: true,
      matchedWakePhrase: inlineMatch[0].trim(),
      cleanCommand: stripped || 'Give me an executive overview of the active dataset',
      normalizedTranscript: `Hey INSI, ${stripped}`
    };
  }

  return {
    wakeWordDetected: false,
    matchedWakePhrase: null,
    cleanCommand: original,
    normalizedTranscript: original
  };
}

/**
 * Extracts flat record arrays from arbitrary JSON payloads (Mode B & Mode C nested structures)
 * e.g. { data: { stores: [...] } }, { records: [...] }, { results: [...] }, or [...]
 */
export function extractConnectorRecords(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    return payload.filter((r) => r && typeof r === 'object' && !Array.isArray(r));
  }
  if (typeof payload !== 'object') return [];

  // Direct common keys
  const priorityKeys = ['records', 'rows', 'data', 'stores', 'tenants', 'stations', 'items', 'results', 'sales', 'payload'];
  for (const key of priorityKeys) {
    const candidate = payload[key];
    if (Array.isArray(candidate) && candidate.length > 0 && typeof candidate[0] === 'object') {
      return candidate.filter((r) => r && typeof r === 'object' && !Array.isArray(r));
    }
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      for (const nestedKey of priorityKeys) {
        if (Array.isArray(candidate[nestedKey]) && candidate[nestedKey].length > 0) {
          return candidate[nestedKey].filter((r) => r && typeof r === 'object' && !Array.isArray(r));
        }
      }
    }
  }

  // Fallback: search any object property or nested property that holds an array of objects
  for (const val of Object.values(payload)) {
    if (Array.isArray(val) && val.length > 0 && val[0] && typeof val[0] === 'object' && !Array.isArray(val[0])) {
      return val;
    }
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      for (const subVal of Object.values(val)) {
        if (Array.isArray(subVal) && subVal.length > 0 && subVal[0] && typeof subVal[0] === 'object' && !Array.isArray(subVal[0])) {
          return subVal;
        }
      }
    }
  }

  return [];
}

/**
 * Resolves schema columns & fuzzy business synonyms from arbitrary datasets
 */
export function resolveFuzzySchema(rows = [], explicitFields = []) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const fieldSet = new Set(
    (Array.isArray(explicitFields) && explicitFields.length
      ? explicitFields
      : safeRows.flatMap((r) => (r && typeof r === 'object' ? Object.keys(r) : []))
    ).filter((k) => k && !k.startsWith('_insightboard_'))
  );
  const fields = Array.from(fieldSet);

  const numericFields = fields.filter((key) => {
    const sample = safeRows
      .slice(0, 100)
      .map((r) => r?.[key])
      .filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
    if (!sample.length) return false;
    const numericCount = sample.filter((v) => {
      const cleaned = typeof v === 'string' ? v.replace(/[₹$,%\s,]/g, '') : v;
      return cleaned !== '' && Number.isFinite(Number(cleaned));
    }).length;
    return numericCount / sample.length >= 0.7;
  });

  const categoricalFields = fields.filter((k) => !numericFields.includes(k));

  const findFieldByConcept = (concept, pool = fields) => {
    const candidates = FUZZY_SYNONYM_GROUPS[concept] || [concept];
    const lowerMap = new Map(pool.map((f) => [f.toLowerCase(), f]));
    for (const c of candidates) {
      if (lowerMap.has(c.toLowerCase())) return lowerMap.get(c.toLowerCase());
    }
    for (const c of candidates) {
      const partial = pool.find((f) => f.toLowerCase().includes(c.toLowerCase()));
      if (partial) return partial;
    }
    return null;
  };

  const labelField =
    findFieldByConcept('store', categoricalFields) ||
    findFieldByConcept('category', categoricalFields) ||
    categoricalFields[0] ||
    fields[0] ||
    'record';

  const categoryField =
    findFieldByConcept('category', categoricalFields) ||
    categoricalFields.find((f) => f !== labelField) ||
    labelField;

  const primaryMetric =
    findFieldByConcept('revenue', numericFields) ||
    findFieldByConcept('footfall', numericFields) ||
    numericFields[0] ||
    null;

  const footfallMetric =
    findFieldByConcept('footfall', numericFields) ||
    numericFields.find((f) => f !== primaryMetric) ||
    primaryMetric;

  const periodField = findFieldByConcept('period', fields);

  return {
    detectedSchemaKeys: fields,
    numericFields,
    categoricalFields,
    labelField,
    categoryField,
    primaryMetric,
    footfallMetric,
    periodField,
    fuzzyMappings: {
      revenue: findFieldByConcept('revenue', numericFields),
      store: findFieldByConcept('store', fields),
      footfall: findFieldByConcept('footfall', numericFields),
      category: findFieldByConcept('category', fields),
      conversion: findFieldByConcept('conversion', numericFields),
      area: findFieldByConcept('area', numericFields),
      rent: findFieldByConcept('rent', numericFields),
      basket: findFieldByConcept('basket', numericFields),
      period: periodField
    }
  };
}

/**
 * Enforces the Spoken Brevity Rule: strictly <= 35 words
 */
export function enforceVoiceBrevity(text = '') {
  const cleaned = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) {
    return 'INSI ready. Your dashboard is synchronized with the active dataset.';
  }
  const words = cleaned.split(' ');
  if (words.length <= 35) return cleaned;
  const truncated = words.slice(0, 34).join(' ').replace(/[,;:\-]+$/, '');
  return truncated.endsWith('.') || truncated.endsWith('!') ? truncated : `${truncated}.`;
}

function toFiniteNumber(val) {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[₹$,%\s,]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatCompactNumber(val) {
  const num = Number(val) || 0;
  if (Math.abs(num) >= 1e7) return `${(num / 1e7).toFixed(2)} Cr`;
  if (Math.abs(num) >= 1e5) return `${(num / 1e5).toFixed(2)} L`;
  if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

/**
 * Resolves which metric field the user's natural language command is asking about
 */
function resolveRequestedMetric(commandLower, schema) {
  const { numericFields, fuzzyMappings, primaryMetric } = schema;
  if (!numericFields.length) return null;

  // Direct column name match
  for (const field of numericFields) {
    const human = field.toLowerCase().replace(/[_-]+/g, ' ');
    if (commandLower.includes(field.toLowerCase()) || commandLower.includes(human)) {
      return field;
    }
  }

  if (/\b(footfall|visitor|visitors|traffic|ridership|passenger|walk[- ]?in)\b/.test(commandLower) && fuzzyMappings.footfall) {
    return fuzzyMappings.footfall;
  }
  if (/\b(conversion|checkout|yield|occupancy)\b/.test(commandLower) && fuzzyMappings.conversion) {
    return fuzzyMappings.conversion;
  }
  if (/\b(rent|lease)\b/.test(commandLower) && fuzzyMappings.rent) {
    return fuzzyMappings.rent;
  }
  if (/\b(area|sqft|square|space)\b/.test(commandLower) && fuzzyMappings.area) {
    return fuzzyMappings.area;
  }
  if (/\b(basket|aov|ticket|order value)\b/.test(commandLower) && fuzzyMappings.basket) {
    return fuzzyMappings.basket;
  }
  if (/\b(revenue|sales|gross|turnover|gmv|income|money|top|bottom|best|worst|lowest|highest)\b/.test(commandLower) && fuzzyMappings.revenue) {
    return fuzzyMappings.revenue;
  }

  return primaryMetric || numericFields[0];
}

/**
 * Resolves which dimension/grouping column the user is asking for (e.g. "by store", "by zone", "by category")
 */
function resolveRequestedDimension(commandLower, schema) {
  const { detectedSchemaKeys, fuzzyMappings, labelField, categoryField } = schema;

  for (const field of detectedSchemaKeys) {
    const human = field.toLowerCase().replace(/[_-]+/g, ' ');
    if (commandLower.includes(`by ${field.toLowerCase()}`) || commandLower.includes(`by ${human}`)) {
      return field;
    }
  }

  if (/\bby\s+(?:store|stores|tenant|tenants|outlet|outlets|merchant|brand|station|stations)\b/.test(commandLower)) {
    return fuzzyMappings.store || labelField;
  }
  if (/\bby\s+(?:zone|zones|category|categories|sector|department|corridor|line|floor)\b/.test(commandLower)) {
    return fuzzyMappings.category || categoryField;
  }
  if (/\bby\s+(?:month|date|period|quarter|year|time)\b/.test(commandLower) && fuzzyMappings.period) {
    return fuzzyMappings.period;
  }
  if (/\b(store|stores|tenant|tenants|station|stations)\b/.test(commandLower) && fuzzyMappings.store) {
    return fuzzyMappings.store;
  }
  if (/\b(zone|zones|category|categories|line)\b/.test(commandLower) && fuzzyMappings.category) {
    return fuzzyMappings.category;
  }

  return labelField || categoryField || detectedSchemaKeys[0] || 'record';
}

/**
 * Maps INSI structured mascot_state into the visual `insi` robot pet controller state & prop
 */
export function mapMascotStateToRobotAction(mascotState = {}) {
  const anim = mascotState.animation || 'idle_prompt';
  switch (anim) {
    case 'celebrate_sparkles':
      return { state: 'celebrating', prop: 'magician_wand', size: 'lg', sound: 'celebrate' };
    case 'thinking_pulse':
      return { state: 'heavy_ai', prop: 'ai_power_core', size: 'xl', sound: 'appear' };
    case 'alert_glow':
      return { state: 'surprised', prop: 'chart_holo', size: 'lg', sound: 'error' };
    case 'export_complete':
      return { state: 'exporting', prop: 'chair_laptop', size: 'md', sound: 'celebrate' };
    case 'nod_confirm':
      return { state: 'viewing_charts', prop: 'chart_holo', size: 'md', sound: 'appear' };
    case 'slide_in':
      return { state: 'waving', prop: 'chair_laptop', size: 'md', sound: 'appear' };
    case 'slide_out':
      return { state: 'idle', prop: 'chair_laptop', size: 'sm', sound: 'disappear', visible: false };
    case 'idle_prompt':
    default:
      return { state: 'idle', prop: 'chair_laptop', size: 'md', sound: 'appear' };
  }
}

/**
 * Main Autonomous Operator Execution Function
 * Strictly outputs the Mandatory Structured JSON Output Schema grounded in the active dataset.
 */
export function executeInsiCommand({
  rows = [],
  fields = [],
  datasetName = 'Active Dataset',
  command = '',
  activeMode = 'demo_sandbox'
} = {}) {
  const safeRows = extractConnectorRecords(rows);
  const resolvedMode = VALID_CONNECTOR_MODES.includes(activeMode)
    ? activeMode
    : safeRows.length === 0
    ? 'awaiting_data'
    : 'demo_sandbox';

  const wakeInfo = detectWakeWordAndCommand(command);
  const effectiveCommand = wakeInfo.cleanCommand || 'Summarize the active dataset';
  const cmdLower = effectiveCommand.toLowerCase();

  // Case 0: No records loaded yet -> awaiting_data
  if (!safeRows.length) {
    return {
      mascot_state: {
        animation: 'idle_prompt',
        aura_color: '#FFB800',
        ui_panel_visibility: 'expanded'
      },
      connector_status: {
        active_mode: 'awaiting_data',
        detected_schema_keys: [],
        total_records_analyzed: 0
      },
      voice_reply: enforceVoiceBrevity(
        'I am listening! Please load the instant demo sandbox, drop a CSV or JSON file, or connect a live webhook so I can analyze your records.'
      ),
      executive_summary: {
        headline: 'Awaiting Dataset Connection in Universal Connector Hub',
        key_insights: [
          '0 records currently loaded in session context.',
          'Supports Mode A (Demo Sandbox), Mode B (POS/ERP CSV & JSON Dropzone), and Mode C (Live REST/Webhook Feed).'
        ],
        recommended_next_step: 'Select Mode A Demo Sandbox or drag and drop a CSV/JSON export to start instant analysis.'
      },
      dashboard_actions: [
        {
          action_type: 'reset_dashboard',
          chart_config: {
            chart_type: 'none',
            title: 'Awaiting Dataset',
            x_axis_key: 'none',
            y_axis_key: 'none',
            aggregation: 'none',
            sort_order: 'none'
          },
          filter_config: {
            target_field: null,
            operator: 'none',
            value: null,
            highlight_color: '#FFB800'
          },
          export_config: {
            trigger_download: false,
            file_format: 'none',
            suggested_filename: 'insight_board_export'
          }
        }
      ],
      processed_data: []
    };
  }

  const schema = resolveFuzzySchema(safeRows, fields);
  const metricKey = resolveRequestedMetric(cmdLower, schema);
  const dimensionKey = resolveRequestedDimension(cmdLower, schema);

  // Detect chart type preference from command
  let requestedChartType = 'bar';
  if (/\b(pie|donut|share|distribution)\b/.test(cmdLower)) requestedChartType = 'pie';
  else if (/\b(line|trend|timeline|over time)\b/.test(cmdLower)) requestedChartType = 'line';
  else if (/\b(area)\b/.test(cmdLower)) requestedChartType = 'area';
  else if (/\b(scatter|correlation)\b/.test(cmdLower)) requestedChartType = 'scatter';
  else if (/\b(kpi|card|scorecard)\b/.test(cmdLower)) requestedChartType = 'kpi_cards';

  // Detect aggregation preference
  let requestedAggregation = 'sum';
  if (/\b(average|avg|mean)\b/.test(cmdLower)) requestedAggregation = 'average';
  else if (/\b(count|number of)\b/.test(cmdLower)) requestedAggregation = 'count';
  else if (/\b(min|minimum|lowest)\b/.test(cmdLower)) requestedAggregation = 'min';
  else if (/\b(max|maximum|highest)\b/.test(cmdLower)) requestedAggregation = 'max';

  // Detect Top N / Bottom N / Anomaly Highlighting
  const bottomMatch = cmdLower.match(/\b(?:bottom|lowest|worst|underperforming)\s*(\d+)?\b/);
  const topMatch = cmdLower.match(/\b(?:top|highest|best|leading)\s*(\d+)?\b/);
  const wantsAnomalies = /\b(anomal|outlier|alert|drop|risk|red|underperform|bottom|lowest|worst)\b/.test(cmdLower);
  const wantsReset = /\b(reset|clear all|clear filter|show all|restore)\b/.test(cmdLower);
  const wantsCompare = /\b(compare|versus|vs\.?|period|variance)\b/.test(cmdLower);

  // Detect file export request
  const wantsExport = /\b(export|download|save|extract)\b/.test(cmdLower);
  let exportFormat = 'none';
  if (wantsExport) {
    if (/\bjson\b/.test(cmdLower)) exportFormat = 'json';
    else if (/\b(txt|summary|brief|text)\b/.test(cmdLower)) exportFormat = 'executive_summary_txt';
    else exportFormat = 'csv';
  }

  // Aggregate dataset by dimensionKey and metricKey
  const groupMap = new Map();
  for (const row of safeRows) {
    const labelVal = String(row?.[dimensionKey] ?? row?.[schema.labelField] ?? 'Unknown').trim() || 'Unknown';
    const rawNum = metricKey ? toFiniteNumber(row?.[metricKey]) : 1;
    const secondaryNum =
      schema.footfallMetric && schema.footfallMetric !== metricKey
        ? toFiniteNumber(row?.[schema.footfallMetric])
        : 0;
    const current = groupMap.get(labelVal) || {
      [dimensionKey]: labelVal,
      count: 0,
      sum: 0,
      min: Number.POSITIVE_INFINITY,
      max: Number.NEGATIVE_INFINITY,
      secondarySum: 0,
      category: String(row?.[schema.categoryField] ?? '')
    };
    current.count += 1;
    current.sum += rawNum;
    current.min = Math.min(current.min, rawNum);
    current.max = Math.max(current.max, rawNum);
    current.secondarySum += secondaryNum;
    groupMap.set(labelVal, current);
  }

  const totalMetricSum = Array.from(groupMap.values()).reduce((acc, item) => acc + item.sum, 0);
  const meanGroupValue = groupMap.size ? totalMetricSum / groupMap.size : 0;

  let aggregatedRows = Array.from(groupMap.values()).map((item) => {
    const computedValue =
      requestedAggregation === 'average'
        ? Number((item.sum / Math.max(1, item.count)).toFixed(2))
        : requestedAggregation === 'count'
        ? item.count
        : requestedAggregation === 'min'
        ? item.min
        : requestedAggregation === 'max'
        ? item.max
        : Number(item.sum.toFixed(2));
    const sharePct = totalMetricSum > 0 ? Number(((item.sum / totalMetricSum) * 100).toFixed(2)) : 0;
    const varianceFromMeanPct =
      meanGroupValue > 0 ? Number((((item.sum - meanGroupValue) / meanGroupValue) * 100).toFixed(1)) : 0;

    const record = {
      [dimensionKey]: item[dimensionKey],
      ...(metricKey ? { [metricKey]: computedValue } : { record_count: item.count }),
      records_merged: item.count,
      portfolio_share_pct: sharePct,
      variance_vs_mean_pct: varianceFromMeanPct
    };
    if (schema.footfallMetric && schema.footfallMetric !== metricKey) {
      record[schema.footfallMetric] = Number(item.secondarySum.toFixed(2));
    }
    return record;
  });

  const valueKey = metricKey || 'record_count';
  const sortOrder = bottomMatch && !topMatch ? 'asc' : 'desc';
  aggregatedRows.sort((a, b) =>
    sortOrder === 'asc'
      ? Number(a[valueKey] || 0) - Number(b[valueKey] || 0)
      : Number(b[valueKey] || 0) - Number(a[valueKey] || 0)
  );

  // Determine Top N / Bottom N highlight count
  const bottomCount = bottomMatch ? Math.max(1, Math.min(10, Number(bottomMatch[1] || 2))) : 0;
  const topCount = topMatch ? Math.max(1, Math.min(10, Number(topMatch[1] || 3))) : 0;

  // Annotate anomaly / highlight flags on processed_data
  const descendSorted = [...aggregatedRows].sort((a, b) => Number(b[valueKey] || 0) - Number(a[valueKey] || 0));
  const ascendSorted = [...aggregatedRows].sort((a, b) => Number(a[valueKey] || 0) - Number(b[valueKey] || 0));
  const bottomNames = new Set(ascendSorted.slice(0, bottomCount || 2).map((r) => r[dimensionKey]));
  const topNames = new Set(descendSorted.slice(0, topCount || 2).map((r) => r[dimensionKey]));

  const processedData = aggregatedRows.map((row) => {
    const isBottom = bottomNames.has(row[dimensionKey]);
    const isTop = topNames.has(row[dimensionKey]);
    let statusTag = 'normal';
    let highlightColor = null;

    if ((bottomMatch || wantsAnomalies) && isBottom) {
      statusTag = 'anomaly_low';
      highlightColor = '#FF3B5C';
    } else if (topMatch && isTop) {
      statusTag = 'leader_high';
      highlightColor = '#00FF88';
    }

    return {
      ...row,
      insi_status: statusTag,
      insi_highlight_color: highlightColor
    };
  });

  const leader = descendSorted[0];
  const laggard = ascendSorted[0];
  const secondLaggard = ascendSorted[1];

  // Build Multi-Step Dashboard Actions Array
  const dashboardActions = [];

  if (wantsReset) {
    dashboardActions.push({
      action_type: 'reset_dashboard',
      chart_config: {
        chart_type: 'bar',
        title: `Full Portfolio Overview (${datasetName})`,
        x_axis_key: dimensionKey,
        y_axis_key: valueKey,
        aggregation: 'sum',
        sort_order: 'desc'
      },
      filter_config: {
        target_field: null,
        operator: 'none',
        value: null,
        highlight_color: null
      },
      export_config: {
        trigger_download: false,
        file_format: 'none',
        suggested_filename: 'insight_board_reset'
      }
    });
  } else {
    // 1. Primary Chart Action
    dashboardActions.push({
      action_type: wantsCompare ? 'compare_periods' : 'render_chart',
      chart_config: {
        chart_type: requestedChartType,
        title: `${valueKey.replace(/_/g, ' ').toUpperCase()} by ${dimensionKey.replace(/_/g, ' ').toUpperCase()}`,
        x_axis_key: dimensionKey,
        y_axis_key: valueKey,
        aggregation: requestedAggregation,
        sort_order: sortOrder
      },
      filter_config: {
        target_field: dimensionKey,
        operator: bottomMatch ? 'bottom_n' : topMatch ? 'top_n' : 'none',
        value: bottomMatch ? String(bottomCount) : topMatch ? String(topCount) : null,
        highlight_color: bottomMatch || wantsAnomalies ? '#FF3B5C' : topMatch ? '#00FF88' : null
      },
      export_config: {
        trigger_download: false,
        file_format: 'none',
        suggested_filename: 'insight_board_chart'
      }
    });

    // 2. Highlight Anomalies or Filter Table Action if requested
    if (bottomMatch || wantsAnomalies) {
      const targetN = bottomCount || 2;
      const flaggedList = ascendSorted.slice(0, targetN).map((r) => r[dimensionKey]);
      dashboardActions.push({
        action_type: 'highlight_anomalies',
        chart_config: {
          chart_type: requestedChartType,
          title: `Bottom ${targetN} Underperforming ${dimensionKey.replace(/_/g, ' ')} Flagged in Red`,
          x_axis_key: dimensionKey,
          y_axis_key: valueKey,
          aggregation: requestedAggregation,
          sort_order: 'asc'
        },
        filter_config: {
          target_field: dimensionKey,
          operator: 'bottom_n',
          value: flaggedList.join(', '),
          highlight_color: '#FF3B5C'
        },
        export_config: {
          trigger_download: false,
          file_format: 'none',
          suggested_filename: 'insight_board_anomalies'
        }
      });
    } else if (topMatch) {
      const targetN = topCount || 3;
      const topList = descendSorted.slice(0, targetN).map((r) => r[dimensionKey]);
      dashboardActions.push({
        action_type: 'filter_table',
        chart_config: {
          chart_type: requestedChartType,
          title: `Top ${targetN} Leading ${dimensionKey.replace(/_/g, ' ')}`,
          x_axis_key: dimensionKey,
          y_axis_key: valueKey,
          aggregation: requestedAggregation,
          sort_order: 'desc'
        },
        filter_config: {
          target_field: dimensionKey,
          operator: 'top_n',
          value: topList.join(', '),
          highlight_color: '#00FF88'
        },
        export_config: {
          trigger_download: false,
          file_format: 'none',
          suggested_filename: 'insight_board_top_leaders'
        }
      });
    }

    // 3. Export File Action if requested
    if (wantsExport && exportFormat !== 'none') {
      const slug = String(datasetName || 'insight_board')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 36);
      dashboardActions.push({
        action_type: 'export_file',
        chart_config: {
          chart_type: 'none',
          title: 'Automated File Export',
          x_axis_key: dimensionKey,
          y_axis_key: valueKey,
          aggregation: requestedAggregation,
          sort_order: sortOrder
        },
        filter_config: {
          target_field: null,
          operator: 'none',
          value: null,
          highlight_color: '#00FF88'
        },
        export_config: {
          trigger_download: true,
          file_format: exportFormat,
          suggested_filename: `${slug}_${valueKey}_export`
        }
      });
    }
  }

  // Determine Mascot Animation & Aura Color
  let animation = 'nod_confirm';
  let auraColor = '#00F0FF';

  if (wantsExport) {
    animation = 'export_complete';
    auraColor = '#00FF88';
  } else if (bottomMatch || wantsAnomalies) {
    animation = 'alert_glow';
    auraColor = '#FF3B5C';
  } else if (topMatch) {
    animation = 'celebrate_sparkles';
    auraColor = '#00FF88';
  } else if (/\b(forecast|predict|recommend|strategy|what[- ]?if|simulate)\b/.test(cmdLower)) {
    animation = 'thinking_pulse';
    auraColor = '#A855F7';
  } else {
    animation = 'celebrate_sparkles';
    auraColor = '#00F0FF';
  }

  const leaderName = leader?.[dimensionKey] || 'Top unit';
  const leaderVal = formatCompactNumber(leader?.[valueKey] || 0);
  const laggardName = laggard?.[dimensionKey] || 'Lowest unit';
  const laggardVal = formatCompactNumber(laggard?.[valueKey] || 0);
  const secondLaggardName = secondLaggard?.[dimensionKey] || null;
  const totalFormatted = formatCompactNumber(totalMetricSum);

  // Crisp Spoken Voice Reply (Strictly <= 35 words)
  let rawVoiceReply = '';
  if (wantsReset) {
    rawVoiceReply = `Dashboard reset complete! All ${safeRows.length} records in ${datasetName} are active again across ${schema.detectedSchemaKeys.length} columns.`;
  } else if ((bottomMatch || wantsAnomalies) && wantsExport) {
    rawVoiceReply = `Chart rendered! ${leaderName} leads at ${leaderVal}, while ${laggardName}${secondLaggardName ? ` and ${secondLaggardName}` : ''} are highlighted in crimson. Your ${exportFormat.toUpperCase()} export is downloading now.`;
  } else if (bottomMatch || wantsAnomalies) {
    rawVoiceReply = `Done! ${laggardName}${secondLaggardName ? ` and ${secondLaggardName}` : ''} are flagged in red as the lowest performers at ${laggardVal}, while ${leaderName} leads at ${leaderVal}.`;
  } else if (wantsExport) {
    rawVoiceReply = `Analysis complete across ${safeRows.length} records. ${leaderName} leads with ${leaderVal} (${leader?.portfolio_share_pct || 0}% share). Your ${exportFormat.toUpperCase()} file is downloading now.`;
  } else {
    rawVoiceReply = `Analyzed ${safeRows.length} records. ${leaderName} leads ${valueKey.replace(/_/g, ' ')} at ${leaderVal}, outperforming ${laggardName} at ${laggardVal}. Live chart updated on your board.`;
  }

  const voiceReply = enforceVoiceBrevity(rawVoiceReply);

  const keyInsights = [
    `Portfolio total for ${valueKey} across ${safeRows.length} records (${groupMap.size} distinct ${dimensionKey} groups) is ${Number(totalMetricSum.toFixed(2)).toLocaleString()} (mean: ${Number(meanGroupValue.toFixed(2)).toLocaleString()}).`,
    `Top Performer: ${leaderName} generated ${Number(leader?.[valueKey] || 0).toLocaleString()} (${leader?.portfolio_share_pct || 0}% of total portfolio, ${leader?.variance_vs_mean_pct >= 0 ? '+' : ''}${leader?.variance_vs_mean_pct || 0}% vs group mean).`,
    `Bottom Performer / Anomaly Check: ${laggardName} recorded ${Number(laggard?.[valueKey] || 0).toLocaleString()} (${laggard?.portfolio_share_pct || 0}% share, ${laggard?.variance_vs_mean_pct || 0}% vs group mean)${secondLaggardName ? `, followed by ${secondLaggardName} at ${Number(secondLaggard?.[valueKey] || 0).toLocaleString()}` : ''}.`
  ];

  return {
    mascot_state: {
      animation,
      aura_color: auraColor,
      ui_panel_visibility: 'expanded'
    },
    connector_status: {
      active_mode: resolvedMode,
      detected_schema_keys: schema.detectedSchemaKeys,
      total_records_analyzed: safeRows.length
    },
    voice_reply: voiceReply,
    executive_summary: {
      headline: `${leaderName} leads ${valueKey.replace(/_/g, ' ')} (${leaderVal}) across ${safeRows.length} analyzed records in ${datasetName}`,
      key_insights: keyInsights,
      recommended_next_step:
        bottomMatch || wantsAnomalies
          ? `Audit footfall-to-checkout conversion and lease cost for ${laggardName}${secondLaggardName ? ` and ${secondLaggardName}` : ''}, or run a +10% promotional traffic simulation.`
          : `Say "Hey INSI, highlight the bottom 2 ${dimensionKey.replace(/_/g, ' ')} in red and export a CSV" to isolate underperforming units.`
    },
    dashboard_actions: dashboardActions,
    processed_data: processedData
  };
}

/**
 * Generates an OpenAPI 3.1.0 specification so external corporate systems,
 * ChatGPT Custom GPT Actions, Claude MCP bridges, or Gemini Extensions can connect
 * directly to InsightBoard VDB without opening the browser UI.
 */
export function buildExternalConnectorOpenApiSpec(baseUrl = 'http://localhost:3000') {
  const cleanOrigin = String(baseUrl || 'http://localhost:3000').replace(/\/$/, '');
  return {
    openapi: '3.1.0',
    info: {
      title: 'InsightBoard VDB — INSI Universal AI & Enterprise Data Connector',
      version: '3.0.0',
      description:
        'Stateless REST & Webhook Connector for InsightBoard VDB (insi.ai). Allows external POS/ERP systems, ChatGPT Custom GPT Actions, Claude, Gemini, or corporate webhooks to push datasets and natural-language commands and receive deterministic INSI Structured JSON analytics without opening the web dashboard.'
    },
    servers: [{ url: cleanOrigin, description: 'InsightBoard VDB Connector Endpoint' }],
    paths: {
      '/api/connector/analyze': {
        post: {
          operationId: 'executeInsiAnalysis',
          summary: 'Run INSI Executive Data Operator on raw JSON records or preset datasets',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    command: {
                      type: 'string',
                      description: 'Natural language command (e.g. "Hey INSI, show revenue by store as a bar chart, highlight the bottom 2 stores in red, and export a CSV")'
                    },
                    active_mode: {
                      type: 'string',
                      enum: ['demo_sandbox', 'file_upload', 'api_webhook', 'awaiting_data'],
                      default: 'api_webhook'
                    },
                    dataset_name: {
                      type: 'string',
                      description: 'Human-readable name of the dataset or POS source'
                    },
                    records: {
                      type: 'array',
                      description: 'Array of JSON records (or nested payload object). If omitted in demo_sandbox mode, uses the built-in Shopping Mall & Retail dataset.',
                      items: { type: 'object' }
                    }
                  },
                  required: ['command']
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Deterministic INSI Structured Output Schema',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: [
                      'mascot_state',
                      'connector_status',
                      'voice_reply',
                      'executive_summary',
                      'dashboard_actions',
                      'processed_data'
                    ]
                  }
                }
              }
            }
          }
        }
      }
    }
  };
}
