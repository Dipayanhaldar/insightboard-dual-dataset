import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSpeechTranscript,
  detectWakeWordAndCommand,
  extractConnectorRecords,
  resolveFuzzySchema,
  enforceVoiceBrevity,
  executeInsiCommand,
  VALID_MASCOT_ANIMATIONS,
  VALID_AURA_COLORS,
  VALID_CONNECTOR_MODES
} from './insiOperatorEngine.js';

const SAMPLE_MALL_RECORDS = [
  { store_name: 'Zara Flagship', mall_zone: 'Atrium North', gross_sales: 4500000, visitor_count: 18500, conversion_rate: 14.2 },
  { store_name: 'Apple Experience', mall_zone: 'Tech Plaza', gross_sales: 8200000, visitor_count: 22400, conversion_rate: 16.8 },
  { store_name: 'Kiosk Express', mall_zone: 'Food Court', gross_sales: 620000, visitor_count: 6100, conversion_rate: 8.1 },
  { store_name: 'Bistro Corner', mall_zone: 'Food Court', gross_sales: 910000, visitor_count: 7400, conversion_rate: 9.4 }
];

test('detectWakeWordAndCommand recognizes "Hey Inci" and common speech-to-text variants', () => {
  assert.equal(normalizeSpeechTranscript('Hey Inci show revenue'), 'Hey Inci show revenue');
  assert.equal(normalizeSpeechTranscript('Wake up Inci'), 'Wake up Inci');

  const variants = [
    'Hey Inci, show revenue by store',
    'Hey, Inci, show revenue by store',
    'Hey In C I, show revenue by store',
    'Hey in-see, show revenue by store',
    'Wake up Inci, show revenue by store',
    'Hey NCI, show revenue by store',
    'Wake up NCI, show revenue by store',
    'Hey NC show revenue by store',
    'Hey in C, show revenue by store',
    'Hey, show revenue by store'
  ];

  for (const input of variants) {
    const res = detectWakeWordAndCommand(input);
    assert.equal(res.wakeWordDetected, true, `Failed on variant: ${input}`);
    assert.equal(res.cleanCommand, 'show revenue by store');
  }

  const bareGreeting = detectWakeWordAndCommand('Hey');
  assert.equal(bareGreeting.wakeWordDetected, true);

  const wakeUpNci = detectWakeWordAndCommand('Hey NCI, wake up NCI');
  assert.equal(wakeUpNci.wakeWordDetected, true);
});

test('extractConnectorRecords unwraps nested API/Webhook arrays automatically', () => {
  const nestedPayload = {
    status: 'ok',
    data: {
      stores: SAMPLE_MALL_RECORDS
    }
  };
  const extracted = extractConnectorRecords(nestedPayload);
  assert.equal(extracted.length, 4);
  assert.equal(extracted[0].store_name, 'Zara Flagship');
});

test('resolveFuzzySchema maps gross_sales -> revenue, store_name -> store, visitor_count -> footfall', () => {
  const schema = resolveFuzzySchema(SAMPLE_MALL_RECORDS);
  assert.equal(schema.fuzzyMappings.revenue, 'gross_sales');
  assert.equal(schema.fuzzyMappings.store, 'store_name');
  assert.equal(schema.fuzzyMappings.footfall, 'visitor_count');
  assert.equal(schema.primaryMetric, 'gross_sales');
});

test('executeInsiCommand produces the exact mandatory JSON schema and chains multi-step actions', () => {
  const result = executeInsiCommand({
    rows: SAMPLE_MALL_RECORDS,
    datasetName: 'Mall POS Export',
    command: 'Hey NC, show revenue by store as a bar chart, highlight the bottom 2 stores in red, and export a CSV',
    activeMode: 'file_upload'
  });

  // Verify top-level keys
  assert.ok(VALID_MASCOT_ANIMATIONS.includes(result.mascot_state.animation));
  assert.ok(VALID_AURA_COLORS.includes(result.mascot_state.aura_color));
  assert.ok(VALID_CONNECTOR_MODES.includes(result.connector_status.active_mode));
  assert.equal(result.connector_status.active_mode, 'file_upload');
  assert.equal(result.connector_status.total_records_analyzed, 4);

  // Verify Spoken Brevity Rule (<= 35 words)
  const wordCount = result.voice_reply.trim().split(/\s+/).length;
  assert.ok(wordCount <= 35, `voice_reply exceeded 35 words (${wordCount})`);

  // Verify compound actions: render_chart + highlight_anomalies + export_file
  const actionTypes = result.dashboard_actions.map((a) => a.action_type);
  assert.ok(actionTypes.includes('render_chart'));
  assert.ok(actionTypes.includes('highlight_anomalies'));
  assert.ok(actionTypes.includes('export_file'));

  const exportAction = result.dashboard_actions.find((a) => a.action_type === 'export_file');
  assert.equal(exportAction.export_config.trigger_download, true);
  assert.equal(exportAction.export_config.file_format, 'csv');

  // Verify zero hallucination in processed_data
  assert.equal(result.processed_data.length, 4);
  const flaggedRed = result.processed_data.filter((r) => r.insi_highlight_color === '#FF3B5C');
  assert.equal(flaggedRed.length, 2);
});

test('enforceVoiceBrevity truncates verbose responses strictly to <= 35 words', () => {
  const longText = Array.from({ length: 50 }, (_, i) => `word${i + 1}`).join(' ');
  const brief = enforceVoiceBrevity(longText);
  assert.ok(brief.split(/\s+/).length <= 35);
});
